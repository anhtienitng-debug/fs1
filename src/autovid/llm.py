"""Lop LLM da nha cung cap.

Mac dinh: DeepSeek (API tuong thich OpenAI). Vi chi can doi `base_url`, lop nay
dung duoc luon voi:
  - Ollama / LM Studio chay local  -> mien phi hoan toan, khong can key
  - OpenRouter, Together, Groq...  -> doi base_url + key
  - Anthropic                      -> provider rieng ben duoi

Khong hardcode ten model o dau ngoai config, vi cac nha cung cap doi ten model
lien tuc (vi du deepseek-chat / deepseek-reasoner da bi khai tu 24/07/2026).
Dung `autovid models` de hoi thang API xem hien co nhung model nao.
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

_JSON_BLOCK = re.compile(r"```(?:json)?\s*(.+?)```", re.S)

JSON_SYSTEM = (
    "Bạn luôn trả lời bằng MỘT đối tượng JSON hợp lệ duy nhất, không kèm lời dẫn, "
    "không kèm dấu ``` và không kèm giải thích nào ngoài JSON."
)

PRESETS = {
    "deepseek": {"base_url": "https://api.deepseek.com/v1", "key_env": "DEEPSEEK_API_KEY"},
    "ollama":   {"base_url": "http://127.0.0.1:11434/v1",   "key_env": "OLLAMA_API_KEY"},
    "openai":   {"base_url": "https://api.openai.com/v1",    "key_env": "OPENAI_API_KEY"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "key_env": "OPENROUTER_API_KEY"},
    "anthropic": {"base_url": "", "key_env": "ANTHROPIC_API_KEY"},
}


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    calls: int = 0

    def add(self, prompt_tokens: int, completion_tokens: int) -> None:
        self.calls += 1
        self.input_tokens += prompt_tokens or 0
        self.output_tokens += completion_tokens or 0

    def to_dict(self) -> dict[str, int]:
        return {"calls": self.calls, "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens}


class LLMError(RuntimeError):
    pass


@dataclass
class LLM:
    """Client chat-completions toi gian, du cho pipeline nay."""

    provider: str = "deepseek"
    model: str = "deepseek-flash"
    base_url: str = ""
    api_key: str = ""
    max_tokens: int = 8192
    temperature: float = 0.7
    timeout: float = 300.0
    usage: Usage = field(default_factory=Usage)

    def __post_init__(self) -> None:
        preset = PRESETS.get(self.provider, PRESETS["deepseek"])
        self.base_url = (self.base_url or os.getenv("LLM_BASE_URL", "")
                         or preset["base_url"]).rstrip("/")
        self.api_key = self.api_key or os.getenv(preset["key_env"], "")
        # Ollama khong doi key nhung SDK van can mot chuoi khac rong
        if self.provider == "ollama" and not self.api_key:
            self.api_key = "ollama"

    # ------------------------------------------------------------------
    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            env = PRESETS.get(self.provider, {}).get("key_env", "API key")
            raise LLMError(
                f"Thiếu {env}. Đặt trong .env, hoặc đổi sang provider chạy local:\n"
                "  autovid ... --set llm.provider=ollama --set llm.model_script=qwen2.5:14b"
            )
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.base_url}{path}"
        last: Exception | None = None
        for attempt in range(4):
            try:
                with httpx.Client(timeout=self.timeout) as c:
                    r = c.post(url, headers=self._headers(), json=payload)
                if r.status_code in (429, 500, 502, 503, 529):
                    time.sleep(2 ** attempt * 2)
                    last = LLMError(f"HTTP {r.status_code}: {r.text[:300]}")
                    continue
                if r.status_code >= 400:
                    raise LLMError(f"HTTP {r.status_code} từ {url}: {r.text[:500]}")
                return r.json()
            except httpx.HTTPError as exc:
                last = exc
                time.sleep(2 ** attempt * 2)
        raise LLMError(f"Gọi {url} thất bại: {last}")

    # ------------------------------------------------------------------
    def text(
        self,
        prompt: str,
        *,
        system: str = "",
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        messages = ([{"role": "system", "content": system}] if system else []) + [
            {"role": "user", "content": prompt}
        ]
        payload = {
            "model": model or self.model,
            "messages": messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": self.temperature if temperature is None else temperature,
            "stream": False,
        }
        data = self._post("/chat/completions", payload)
        u = data.get("usage") or {}
        self.usage.add(u.get("prompt_tokens", 0), u.get("completion_tokens", 0))

        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        content = msg.get("content") or ""
        if choice.get("finish_reason") == "length":
            raise LLMError(
                "Phản hồi bị cắt do chạm max_tokens. Tăng llm.max_tokens hoặc chia nhỏ yêu cầu."
            )
        if not content.strip():
            raise LLMError(f"Model trả về rỗng. Phản hồi thô: {json.dumps(data)[:400]}")
        return content

    def json(self, prompt: str, **kw: Any) -> Any:
        system = kw.pop("system", "")
        kw["system"] = f"{system}\n\n{JSON_SYSTEM}".strip()
        raw = self.text(prompt, **kw)
        try:
            return parse_json(raw)
        except ValueError:
            fixed = self.text(
                "Đoạn sau đáng lẽ phải là JSON hợp lệ nhưng bị lỗi cú pháp. "
                "Trả về lại đúng JSON đó, không kèm gì khác:\n\n" + raw[:12000],
                system=JSON_SYSTEM,
                max_tokens=kw.get("max_tokens") or self.max_tokens,
                temperature=0,
            )
            return parse_json(fixed)

    def list_models(self) -> list[str]:
        with httpx.Client(timeout=30.0) as c:
            r = c.get(f"{self.base_url}/models", headers=self._headers())
            r.raise_for_status()
        return sorted(m.get("id", "") for m in r.json().get("data", []))


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
    raise ValueError(f"Không đọc được JSON từ phản hồi LLM:\n{raw[:600]}")


def build(cfg: Any, *, role: str = "script") -> LLM:
    """Tao LLM tu config. role: 'script' (chat luong cao) hoac 'utility' (re)."""
    return LLM(
        provider=cfg.get("llm.provider", "deepseek"),
        model=cfg.get(f"llm.model_{role}") or cfg.get("llm.model_script", "deepseek-flash"),
        base_url=cfg.get("llm.base_url", "") or "",
        max_tokens=cfg.get("llm.max_tokens", 8192),
        temperature=cfg.get("llm.temperature", 0.7),
    )
