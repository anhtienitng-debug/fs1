"""Tien ich xu ly van ban tieng Viet cho TTS va phu de."""

from __future__ import annotations

import re

# The cam xuc cua VieNeu-TTS: giu nguyen, khong tinh vao do dai doc
EMOTION_TAG = re.compile(r"\[[^\]\n]{1,20}\]")
_ABBREV = {
    "GDP": "gi đi pi", "CPI": "xi pi ai", "FED": "Phét", "ECB": "i xi bi",
    "IMF": "ai em ép", "WTO": "vê kép ti ô", "EU": "i u", "USD": "đô la Mỹ",
    "AI": "ây ai", "CEO": "xi i âu", "IPO": "ai pi âu", "ETF": "i ti ép",
}
_SENT_END = re.compile(r"(?<=[.!?…:;])\s+")


def strip_tags(text: str) -> str:
    return EMOTION_TAG.sub("", text)


def word_count(text: str) -> int:
    return len(strip_tags(text).split())


def estimate_seconds(text: str, wpm: int = 145) -> float:
    return word_count(text) / max(wpm, 1) * 60.0


def expand_abbreviations(text: str, extra: dict[str, str] | None = None) -> str:
    """Doc viet tat theo kieu tieng Viet de TTS khong danh van sai."""
    table = {**_ABBREV, **(extra or {})}
    for k, v in table.items():
        text = re.sub(rf"\b{re.escape(k)}\b", v, text)
    return text


def normalize_numbers(text: str) -> str:
    """1,200,000 -> 1.200.000 ; 3.5% -> 3 phẩy 5 phần trăm (kieu doc VN)."""
    text = re.sub(r"(?<=\d),(?=\d{3}\b)", ".", text)
    text = re.sub(r"(\d+)\.(\d+)\s*%", r"\1 phẩy \2 phần trăm", text)
    text = re.sub(r"(\d+)\s*%", r"\1 phần trăm", text)
    text = re.sub(r"\$\s?(\d[\d.]*)", r"\1 đô la", text)
    return text


def prepare_for_tts(text: str, *, keep_tags: bool = True) -> str:
    text = text.replace("—", ",").replace("–", ",").replace("…", "...")
    text = re.sub(r"[“”\"«»]", "", text)
    text = normalize_numbers(expand_abbreviations(text))
    if not keep_tags:
        text = strip_tags(text)
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_END.split(text) if s.strip()]


def chunk_for_tts(text: str, max_chars: int = 256) -> list[str]:
    """Chia theo cau, gop lai cho gan max_chars de giong doc lien mach."""
    chunks: list[str] = []
    buf = ""
    for sent in split_sentences(text):
        while len(sent) > max_chars:  # cau qua dai: cat o dau phay
            cut = sent.rfind(",", 0, max_chars)
            cut = cut if cut > max_chars // 2 else sent.rfind(" ", 0, max_chars)
            cut = cut if cut > 0 else max_chars
            chunks.append(sent[:cut].strip())
            sent = sent[cut:].lstrip(", ")
        if len(buf) + len(sent) + 1 <= max_chars:
            buf = f"{buf} {sent}".strip()
        else:
            if buf:
                chunks.append(buf)
            buf = sent
    if buf:
        chunks.append(buf)
    return chunks


def wrap_subtitle(text: str, width: int = 42, max_lines: int = 2) -> str:
    words, lines, cur = strip_tags(text).split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = f"{cur} {w}".strip()
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return "\n".join(lines[:max_lines])
