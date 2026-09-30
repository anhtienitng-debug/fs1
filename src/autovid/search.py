"""Tim kiem web + doc noi dung trang, khong bat buoc API key.

Thu tu backend:
  1. ddgs (DuckDuckGo)  - khong can key, mac dinh
  2. SearXNG            - khong can key, neu ban tu host (SEARXNG_URL)
  3. Tavily / Brave     - neu co key, ket qua on dinh hon
Neu tat ca that bai, tra ve danh sach rong: pipeline van chay, brief chi nghheo hon.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from .util.http import client, get_json


@dataclass
class Hit:
    title: str
    url: str
    snippet: str = ""
    publisher: str = ""
    date: str = ""
    text: str = field(default="", repr=False)

    def to_dict(self) -> dict:
        d = {"title": self.title, "url": self.url, "snippet": self.snippet,
             "publisher": self.publisher, "date": self.date}
        return {k: v for k, v in d.items() if v}


# ----------------------------------------------------------------- backends
def _ddg(query: str, n: int) -> list[Hit]:
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS  # ten cu
        except ImportError:
            return []
    out: list[Hit] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=n):
            out.append(Hit(
                title=r.get("title", ""),
                url=r.get("href") or r.get("link", ""),
                snippet=r.get("body", ""),
            ))
    return out


def _searxng(query: str, n: int) -> list[Hit]:
    base = os.getenv("SEARXNG_URL", "").rstrip("/")
    if not base:
        return []
    data = get_json(f"{base}/search", params={"q": query, "format": "json"})
    return [
        Hit(title=r.get("title", ""), url=r.get("url", ""), snippet=r.get("content", ""))
        for r in (data.get("results") or [])[:n]
    ]


def _tavily(query: str, n: int) -> list[Hit]:
    key = os.getenv("TAVILY_API_KEY", "")
    if not key:
        return []
    with client() as c:
        r = c.post(
            "https://api.tavily.com/search",
            json={"api_key": key, "query": query, "max_results": n,
                  "search_depth": "advanced", "include_raw_content": True},
        )
        r.raise_for_status()
        data = r.json()
    return [
        Hit(title=x.get("title", ""), url=x.get("url", ""), snippet=x.get("content", ""),
            text=(x.get("raw_content") or "")[:20000])
        for x in data.get("results", [])
    ]


def _brave(query: str, n: int) -> list[Hit]:
    key = os.getenv("BRAVE_API_KEY", "")
    if not key:
        return []
    data = get_json(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": query, "count": n},
        headers={"X-Subscription-Token": key, "Accept": "application/json"},
    )
    return [
        Hit(title=x.get("title", ""), url=x.get("url", ""),
            snippet=x.get("description", ""), date=x.get("age", ""))
        for x in (data.get("web", {}).get("results") or [])
    ]


BACKENDS = (("tavily", _tavily), ("brave", _brave), ("searxng", _searxng), ("ddg", _ddg))

LAST_BACKEND = ""   # backend nao thuc su tra ve ket qua, de bao cho nguoi dung


def search(query: str, n: int = 6) -> list[Hit]:
    global LAST_BACKEND
    for name, fn in BACKENDS:
        try:
            hits = fn(query, n)
        except Exception:  # noqa: BLE001 - backend loi thi thu cai tiep theo
            continue
        if hits:
            LAST_BACKEND = name
            for h in hits:
                h.publisher = h.publisher or _domain(h.url)
            return hits[:n]
    return []


def search_many(queries: list[str], per_query: int = 5, limit: int = 20) -> list[Hit]:
    seen: set[str] = set()
    out: list[Hit] = []
    for q in queries:
        for h in search(q, per_query):
            if h.url and h.url not in seen:
                seen.add(h.url)
                out.append(h)
    return out[:limit]


# ----------------------------------------------------------------- doc trang
def fetch_text(url: str, *, max_chars: int = 12000) -> str:
    try:
        with client() as c:
            r = c.get(url)
            r.raise_for_status()
            html = r.text
    except Exception:  # noqa: BLE001
        return ""
    try:
        import trafilatura
        text = trafilatura.extract(html, include_comments=False, favor_precision=True) or ""
    except ImportError:
        import re
        text = re.sub(r"(?s)<(script|style).*?</\1>", " ", html)
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text))
    return text.strip()[:max_chars]


def enrich(hits: list[Hit], *, top: int = 8, max_chars: int = 12000) -> list[Hit]:
    """Tai toan van cho cac ket qua dau tien de LLM co du lieu that ma doc."""
    for h in hits[:top]:
        if not h.text:
            h.text = fetch_text(h.url, max_chars=max_chars)
    return hits


def _domain(url: str) -> str:
    from urllib.parse import urlparse
    return urlparse(url).netloc.replace("www.", "")
