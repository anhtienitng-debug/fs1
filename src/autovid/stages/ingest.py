"""Buoc 1 - Lay noi dung bai bao.

Ve paywall: The Economist chan gan het bai sau tuong phi. Tool nay KHONG vuot
paywall. No lam ba viec:
  1. Tai phan cong khai (tieu de, deck, vai doan dau, metadata) bang trafilatura.
  2. Bao ro khi phat hien bai bi chan -> `paywalled: true`.
  3. Nhan van ban day du do ban tu dan vao (`--text-file` / `--stdin`) neu ban la
     thue bao va co quyen doc bai do.

Dong thoi day la cho phu hop de nhac: video cua ban phai la BINH LUAN/REVIEW co
phan tich rieng, trich dan co gioi han va ghi nguon - khong doc lai nguyen bai.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from ..models import Article
from ..util.http import client

PAYWALL_MARKERS = (
    "subscriber-only", "subscribers only", "to continue reading",
    "sign up to continue", "register to read", "this article is for subscribers",
)
MIN_FULL_WORDS = 350  # duoi nguong nay coi nhu chi lay duoc phan mo dau


def _meta(html: str, prop: str) -> str:
    m = re.search(
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']*)',
        html, re.I,
    )
    return (m.group(1).strip() if m else "")


def fetch_html(url: str) -> str:
    with client() as c:
        r = c.get(url)
        r.raise_for_status()
        return r.text


def extract(url: str, *, html: str | None = None) -> Article:
    html = html or fetch_html(url)
    try:
        import trafilatura
        text = trafilatura.extract(
            html, include_comments=False, include_tables=True, favor_precision=True
        ) or ""
    except ImportError:  # pragma: no cover - fallback tho
        text = re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style).*?</\1>", " ", html))
        text = re.sub(r"\s+", " ", text)

    title = _meta(html, "og:title") or _meta(html, "twitter:title")
    if not title:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        title = re.sub(r"\s*\|\s*The Economist\s*$", "", m.group(1).strip()) if m else ""

    art = Article(
        url=url,
        title=title,
        subtitle=_meta(html, "og:description") or _meta(html, "description"),
        section=_meta(html, "article:section"),
        published=_meta(html, "article:published_time") or _meta(html, "date"),
        text=text.strip(),
    )
    art.word_count = len(art.text.split())
    low = html.lower()
    art.paywalled = art.word_count < MIN_FULL_WORDS or any(m in low for m in PAYWALL_MARKERS)
    return art


def from_text(url: str, text: str, *, title: str = "") -> Article:
    """Dung khi ban tu dan toan van bai bao (ban co quyen doc)."""
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    art = Article(
        url=url,
        title=title or (lines[0] if lines else "Bài viết The Economist"),
        text=text.strip(),
        paywalled=False,
    )
    art.word_count = len(art.text.split())
    return art


def run(url: str, *, text_file: str | None = None, stdin: bool = False) -> Article:
    if stdin:
        return from_text(url, sys.stdin.read())
    if text_file:
        return from_text(url, Path(text_file).read_text(encoding="utf-8"))
    return extract(url)
