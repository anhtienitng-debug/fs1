"""Lop bao quanh Claude API.

Luu y ve API hien hanh (da kiem tra, khong phai tri nho cu):
  * `temperature` bi go tren Opus 5.x / Sonnet 5.5 -> khong gui tham so nay.
  * Assistant prefill tra ve 400 tren cac model nay -> ep JSON bang system prompt.
  * Do sau suy luan dieu khien bang `output_config.effort`, khong phai budget_tokens.
  * max_tokens lon phai dung streaming de tranh timeout HTTP.
  * Web search chay server-side: tool type `web_search_20260209`.
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any

_JSON_BLOCK = re.compile(r"```(?:json)?\s*(.+?)```", re.S)

JSON_SYSTEM = (
    "Bạn luôn trả lời bằng MỘT đối tượng JSON hợp lệ duy nhất, không kèm lời dẫn, "
    "không kèm dấu ``` và không kèm giải thích ngoài JSON."
)

WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search"}


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    calls: int = 0

    def add(self, resp: Any) -> None:
        self.calls += 1
        u = getattr(resp, "usage", None)
        if u:
            self.input_tokens += getattr(u, "input_tokens", 0) or 0
            self.output_tokens += getattr(u, "output_tokens", 0) or 0

    def to_dict(self) -> dict[str, int]:
        return {"calls": self.calls, "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens}


@dataclass
class LLM:
    model: str = "claude-opus-5-5"
    max_tokens: int = 16000
    effort: str = "high"          # low | medium | high | xhigh | max
    usage: Usage = field(default_factory=Usage)
    _client: Any = None

    def client(self) -> Any:
        if self._client is None:
            try:
                import anthropic
            except ImportError as exc:  # pragma: no cover
                raise RuntimeError("Chua cai `anthropic`: pip install anthropic") from exc
            if not os.getenv("ANTHROPIC_API_KEY") and not os.getenv("ANTHROPIC_AUTH_TOKEN"):
                raise RuntimeError("Thieu ANTHROPIC_API_KEY (xem .env.example)")
            self._client = anthropic.Anthropic()
        return self._client

    # ------------------------------------------------------------------
    def complete(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int | None = None,
        effort: str | None = None,
        tools: list[dict] | None = None,
        retries: int = 3,
    ) -> tuple[str, list[Any]]:
        """Tra ve (van ban, toan bo content blocks).

        Content blocks giu lai de doc ket qua web_search (nguon tham khao).
        """
        kwargs: dict[str, Any] = {
            "model": model or self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "output_config": {"effort": effort or self.effort},
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        last: Exception | None = None
        for attempt in range(retries):
            try:
                with self.client().messages.stream(**kwargs) as stream:
                    resp = stream.get_final_message()
                self.usage.add(resp)
                if getattr(resp, "stop_reason", "") == "refusal":
                    detail = getattr(resp, "stop_details", None)
                    raise RuntimeError(f"Model tu choi yeu cau: {detail}")
                text = "".join(
                    b.text for b in resp.content if getattr(b, "type", "") == "text"
                )
                return text, list(resp.content)
            except Exception as exc:  # noqa: BLE001
                last = exc
                if "refusal" in str(exc):
                    raise
                time.sleep(2 ** attempt * 2)
        raise RuntimeError(f"Goi LLM that bai sau {retries} lan: {last}")

    def text(self, prompt: str, **kw: Any) -> str:
        return self.complete(prompt, **kw)[0]

    def json(self, prompt: str, **kw: Any) -> Any:
        system = kw.pop("system", "")
        kw["system"] = f"{system}\n\n{JSON_SYSTEM}".strip()
        raw, _ = self.complete(prompt, **kw)
        return parse_json(raw)

    def search(self, prompt: str, *, max_uses: int = 8, **kw: Any) -> tuple[str, list[dict]]:
        """Goi model kem web search server-side. Tra ve (van ban, danh sach nguon)."""
        tool = {**WEB_SEARCH_TOOL, "max_uses": max_uses}
        text, blocks = self.complete(prompt, tools=[tool], **kw)
        return text, extract_search_sources(blocks)


def extract_search_sources(blocks: list[Any]) -> list[dict]:
    """Doc cac block web_search_tool_result -> danh sach nguon.

    Luu y: khi loi, `.content` la mot object (co `error_code`), khi thanh cong la list.
    """
    out: list[dict] = []
    for b in blocks:
        if getattr(b, "type", "") != "web_search_tool_result":
            continue
        content = getattr(b, "content", None)
        if not isinstance(content, list):
            continue
        for item in content:
            url = getattr(item, "url", "")
            if url:
                out.append({
                    "url": url,
                    "title": getattr(item, "title", "") or "",
                    "date": getattr(item, "page_age", "") or "",
                })
    # loc trung
    seen, uniq = set(), []
    for s in out:
        if s["url"] not in seen:
            seen.add(s["url"])
            uniq.append(s)
    return uniq


def parse_json(raw: str) -> Any:
    raw = raw.strip()
    m = _JSON_BLOCK.search(raw)
    if m:
        raw = m.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    for opener, closer in (("{", "}"), ("[", "]")):
        i, j = raw.find(opener), raw.rfind(closer)
        if i != -1 and j > i:
            try:
                return json.loads(raw[i : j + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"Khong doc duoc JSON tu phan hoi LLM:\n{raw[:600]}")
