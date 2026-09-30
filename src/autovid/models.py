"""Cac cau truc du lieu di qua pipeline. Tat ca deu serialise duoc ra JSON."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


def _clean(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v not in (None, [], {}, "")}


@dataclass
class Article:
    """Bai goc sau khi trich xuat."""

    url: str
    title: str = ""
    subtitle: str = ""
    section: str = ""
    published: str = ""
    text: str = ""
    paywalled: bool = False
    source: str = "The Economist"
    word_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Source:
    """Mot nguon doi chieu tim duoc o buoc research."""

    title: str
    url: str
    publisher: str = ""
    date: str = ""
    snippet: str = ""
    kind: Literal["article", "data", "report"] = "article"


@dataclass
class DataPoint:
    """Mot con so trong script -> ung vien de ve bieu do."""

    label: str
    value: float | None = None
    unit: str = ""
    series: list[dict[str, Any]] = field(default_factory=list)
    source: str = ""
    chart_type: Literal["bar", "line", "none"] = "none"


@dataclass
class Scene:
    """Don vi nho nhat cua video: 1 doan loi doc + 1 khung hinh."""

    id: str
    chapter: str
    narration: str
    visual_query: str = ""          # tu khoa tieng Anh de tim anh/video
    visual_kind: Literal["video", "photo", "chart", "auto"] = "auto"
    on_screen_text: str = ""        # lower-third / key point
    chart_ref: str = ""             # id cua DataPoint neu canh nay la bieu do
    audio_path: str = ""
    media_path: str = ""
    duration: float = 0.0
    start: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return _clean(asdict(self))


@dataclass
class Asset:
    """Mot file media tai ve, kem thong tin ban quyen de ghi credit."""

    scene_id: str
    provider: str
    provider_id: str
    url: str
    local_path: str
    kind: Literal["video", "photo"]
    license: str
    license_url: str = ""
    author: str = ""
    author_url: str = ""
    width: int = 0
    height: int = 0
    duration: float = 0.0

    def credit_line(self) -> str:
        who = self.author or self.provider
        return f"{who} — {self.provider} ({self.license}) {self.url}".strip()


@dataclass
class VideoScript:
    """Script hoan chinh truoc khi cat canh."""

    title: str
    hook: str
    chapters: list[dict[str, Any]] = field(default_factory=list)
    outro: str = ""
    thesis: str = ""
    counterpoints: list[str] = field(default_factory=list)
    vietnam_angle: str = ""
    data_points: list[DataPoint] = field(default_factory=list)
    sources: list[Source] = field(default_factory=list)
    est_words: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def full_text(self) -> str:
        parts = [self.hook]
        for ch in self.chapters:
            parts.append(ch.get("title", ""))
            parts.append(ch.get("body", ""))
        parts.append(self.outro)
        return "\n\n".join(p for p in parts if p)
