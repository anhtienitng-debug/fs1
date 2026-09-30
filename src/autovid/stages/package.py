"""Buoc 11 - Dong goi: metadata YouTube, chapters, credit ban quyen, thumbnail."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..llm import LLM
from ..models import Asset, Scene, VideoScript

META_PROMPT = """Viết metadata YouTube cho video sau.

Tiêu đề hiện tại: {title}
Nhận định trung tâm: {thesis}
Các chương: {chapters}

Trả về JSON:
{{
  "titles": ["3 phương án tiêu đề, mỗi cái 60-70 ký tự, có con số hoặc nghịch lý cụ thể, không clickbait rỗng"],
  "description": "3-5 đoạn. Đoạn đầu 2 câu tóm tắt hấp dẫn (hiện trong kết quả tìm kiếm). Các đoạn sau nói rõ video trả lời câu hỏi gì. Không nhồi từ khoá.",
  "tags": ["12-15 tag tiếng Việt và tiếng Anh, mỗi tag 1-3 từ"],
  "thumbnail_text": "3-5 chữ in hoa cho ảnh bìa, đọc được ở kích thước nhỏ"
}}"""


def chapters_from_scenes(scenes: list[Scene]) -> list[tuple[float, str]]:
    out: list[tuple[float, str]] = []
    seen: set[str] = set()
    for s in scenes:
        if s.chapter in seen:
            continue
        seen.add(s.chapter)
        name = {"HOOK": "Mở đầu", "OUTRO": "Kết luận"}.get(s.chapter, s.chapter)
        out.append((s.start, name))
    if out and out[0][0] > 0:
        out[0] = (0.0, out[0][1])
    return out


def _ts(t: float) -> str:
    h, rem = divmod(int(t), 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def credits_text(assets: list[Asset], script: VideoScript) -> str:
    lines = ["NGUỒN THAM KHẢO", ""]
    for s in script.sources:
        lines.append(f"- {s.title or s.url}" + (f" — {s.publisher}" if s.publisher else ""))
        lines.append(f"  {s.url}")
    lines += ["", "HÌNH ẢNH VÀ VIDEO", ""]
    seen: set[str] = set()
    for a in assets:
        line = a.credit_line()
        if line not in seen:
            seen.add(line)
            lines.append(f"- {line}")
    lines += ["", "Bản đồ: Natural Earth (public domain)",
              "Biểu đồ: tự tổng hợp từ các nguồn nêu trên."]
    return "\n".join(lines)


def build_description(meta: dict, chapters: list[tuple[float, str]],
                      script: VideoScript, credits: str) -> str:
    parts = [meta.get("description", "").strip(), "", "⏱ NỘI DUNG", ""]
    parts += [f"{_ts(t)} {name}" for t, name in chapters]
    parts += ["", credits]
    return "\n".join(parts).strip()


def thumbnail(scenes: list[Scene], text: str, dest: Path, cfg: Any) -> Path | None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None
    w, h = cfg.get("video.resolution", [1920, 1080])
    base = None
    for s in scenes:
        p = Path(s.media_path or "")
        if p.exists() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            base = p
            break
    try:
        img = (Image.open(base).convert("RGB") if base
               else Image.new("RGB", (w, h), (26, 26, 25)))
    except Exception:  # noqa: BLE001
        img = Image.new("RGB", (w, h), (26, 26, 25))

    img = img.resize((w, h), Image.LANCZOS)
    # Toi ve mot ben de chu noi len
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle([0, int(h * 0.45), w, h], fill=(10, 10, 10, 205))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    from .assemble import _find_font
    font_path = _find_font()
    size = int(h * 0.15)
    try:
        font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
    except Exception:  # noqa: BLE001
        font = ImageFont.load_default()

    d = ImageDraw.Draw(img)
    words = (text or "").upper().split()
    lines, cur = [], ""
    for word in words:
        if len(cur) + len(word) + 1 <= 14:
            cur = f"{cur} {word}".strip()
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    lines = lines[:3]

    y = int(h * 0.52)
    for line in lines:
        bbox = d.textbbox((0, 0), line, font=font)
        x = int(w * 0.06)
        d.text((x, y), line, font=font, fill=(255, 255, 255),
               stroke_width=8, stroke_fill=(0, 0, 0))
        y += (bbox[3] - bbox[1]) + int(size * 0.32)

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, quality=92)
    return dest


def run(
    script: VideoScript,
    scenes: list[Scene],
    assets: list[Asset],
    llm: LLM,
    cfg: Any,
    job_dir: Path,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    chapters = chapters_from_scenes(scenes)
    try:
        meta = llm.json(
            META_PROMPT.format(
                title=script.title,
                thesis=script.thesis,
                chapters=" | ".join(name for _, name in chapters),
            ),
            model=cfg.get("llm.model_utility"),
            max_tokens=2500,
            temperature=0.6,
        )
    except Exception as exc:  # noqa: BLE001
        if on_progress:
            on_progress(f"sinh metadata lỗi ({exc}) — dùng mặc định")
        meta = {"titles": [script.title], "description": script.thesis,
                "tags": [], "thumbnail_text": script.title[:24]}

    credits = credits_text(assets, script)
    (job_dir / "credits.txt").write_text(credits, encoding="utf-8")

    thumb = thumbnail(scenes, meta.get("thumbnail_text") or script.title,
                      job_dir / "thumbnail.jpg", cfg)

    out = {
        "title": (meta.get("titles") or [script.title])[0],
        "title_alternatives": meta.get("titles", [])[1:],
        "description": build_description(meta, chapters, script, credits),
        "tags": meta.get("tags", []),
        "chapters": [{"time": _ts(t), "seconds": round(t, 2), "name": n}
                     for t, n in chapters],
        "category_id": cfg.get("publish.category_id", "25"),
        "privacy": cfg.get("publish.privacy", "private"),
        "made_for_kids": cfg.get("publish.made_for_kids", False),
        "thumbnail": str(thumb) if thumb else "",
    }
    (job_dir / "metadata.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    if on_progress:
        on_progress(f"metadata: {len(out['chapters'])} chương, {len(out['tags'])} tag")
    return out
