"""Buoc 5 - Tach kich ban thanh canh.

Mot canh = mot doan loi doc (~45-55 tu, ~20 giay) + mot khung hinh.
Viec cat duoc lam bang LUAT (theo cau), khong nho LLM, vi cat sai cau se lam
giong doc va phu de lech nhau. LLM chi lam mot viec: gan truy van tim hinh
tieng Anh cho tung canh, theo lo tung chuong cho re.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from ..llm import LLM
from ..models import Scene, VideoScript
from ..util.text import split_sentences, word_count

VISUAL_PROMPT = """Gán hình ảnh minh hoạ cho từng cảnh của một video phân tích kinh tế.

Bối cảnh chương: {chapter}
Số liệu có thể vẽ biểu đồ: {data_labels}

<cac_canh>
{scenes}
</cac_canh>

Với MỖI cảnh, chọn một loại hình và một truy vấn tìm kiếm:
- "video": cảnh quay thật (người, thành phố, nhà máy, giao dịch...). Truy vấn tiếng Anh.
- "photo": ảnh tĩnh (chân dung, toà nhà, tài liệu, bản đồ giấy). Truy vấn tiếng Anh.
- "chart": khi cảnh đang nói về một con số cụ thể có trong danh sách trên.
- "map": khi cảnh nói về một hoặc vài quốc gia cụ thể.

Trả về JSON: {{"scenes": [
  {{"id":"<id cảnh>","kind":"video|photo|chart|map",
    "query":"truy vấn tiếng Anh 2-6 từ, cụ thể, dễ có trên kho ảnh stock",
    "chart_ref":"label số liệu nếu kind=chart, ngược lại chuỗi rỗng",
    "countries":["tên nước tiếng Anh nếu kind=map"]}}
]}}

Tránh truy vấn trừu tượng như "economy" hay "global impact". Ưu tiên vật thể cụ thể:
"container ship port", "federal reserve building", "vietnamese garment factory"."""


def split_into_scenes(script: VideoScript, max_words: int = 55) -> list[Scene]:
    """Cat theo cau, gop den khi gan max_words. Khong bao gio cat giua cau."""
    scenes: list[Scene] = []

    def add(chapter: str, text: str, prefix: str) -> None:
        buf: list[str] = []
        count = 0
        for sent in split_sentences(text):
            w = word_count(sent)
            if buf and count + w > max_words:
                scenes.append(Scene(id=f"{prefix}-{len(scenes):03d}", chapter=chapter,
                                    narration=" ".join(buf)))
                buf, count = [], 0
            buf.append(sent)
            count += w
        if buf:
            scenes.append(Scene(id=f"{prefix}-{len(scenes):03d}", chapter=chapter,
                                narration=" ".join(buf)))

    if script.hook:
        add("HOOK", script.hook, "s")
    for ch in script.chapters:
        add(ch["title"], ch["body"], "s")
        if ch.get("key_point"):
            for s in scenes:
                if s.chapter == ch["title"] and not s.on_screen_text:
                    s.on_screen_text = ch["key_point"]
                    break
    if script.outro:
        add("OUTRO", script.outro, "s")
    return scenes


def assign_visuals(
    scenes: list[Scene],
    script: VideoScript,
    llm: LLM,
    cfg: Any,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> list[Scene]:
    by_chapter: dict[str, list[Scene]] = {}
    for s in scenes:
        by_chapter.setdefault(s.chapter, []).append(s)

    notes = {c["title"]: c.get("visual_note", "") for c in script.chapters}
    labels = [p.label for p in script.data_points if p.chart_type != "none"]
    model = cfg.get("llm.model_utility")

    for chapter, group in by_chapter.items():
        payload = "\n".join(
            f'<canh id="{s.id}">{s.narration[:400]}</canh>' for s in group
        )
        try:
            data = llm.json(
                VISUAL_PROMPT.format(
                    chapter=f"{chapter} — {notes.get(chapter, '')}".strip(" —"),
                    data_labels=", ".join(labels) or "(không có)",
                    scenes=payload,
                ),
                model=model,
                max_tokens=3000,
                temperature=0.4,
            )
            mapping = {d.get("id"): d for d in data.get("scenes", []) if isinstance(d, dict)}
        except Exception as exc:  # noqa: BLE001
            if on_progress:
                on_progress(f"chương «{chapter}»: LLM gán hình lỗi ({exc}), dùng gợi ý mặc định")
            mapping = {}

        for s in group:
            d = mapping.get(s.id, {})
            s.visual_kind = d.get("kind") or "auto"
            s.visual_query = (d.get("query") or notes.get(chapter) or chapter).strip()
            s.chart_ref = d.get("chart_ref") or ""
            if d.get("countries"):
                s.visual_query = ",".join(d["countries"])
        if on_progress:
            on_progress(f"chương «{chapter}»: gán hình cho {len(group)} cảnh")
    return scenes


def run(
    script: VideoScript,
    llm: LLM,
    cfg: Any,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> list[Scene]:
    scenes = split_into_scenes(script, cfg.get("script.max_scene_words", 55))
    if on_progress:
        on_progress(f"cắt thành {len(scenes)} cảnh")
    return assign_visuals(scenes, script, llm, cfg, on_progress=on_progress)


def to_json(scenes: list[Scene]) -> str:
    return json.dumps([s.to_dict() for s in scenes], ensure_ascii=False, indent=2)


def from_json(raw: str) -> list[Scene]:
    return [Scene(**d) for d in json.loads(raw)]
