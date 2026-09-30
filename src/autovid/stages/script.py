"""Buoc 3 - Viet kich ban, sinh theo nhieu nhip.

Vi sao khong sinh mot phat: model nho (deepseek-flash, qwen local...) thuong bi
cat o khoang 4-6k token dau ra. Kich ban 18 phut can ~4.500 token. Sinh tung
chuong mot thi moi lan goi chi ~800 token, gan nhu khong bao gio hong, va moi
chuong duoc ngam ky hon.

Nhip:
  1. outline  -> title, thesis, danh sach chuong (tieu de + y chinh + so lieu dung)
  2. chapter  -> viet loi doc tung chuong, co context cua chuong truoc de noi mach
  3. bookend  -> hook va outro viet sau cung, khi da biet toan bo noi dung
Dau ra: script.json + script.md (ban cho nguoi duyet sua tay).
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from ..llm import LLM
from ..models import Article, DataPoint, Source, VideoScript
from ..util.text import word_count

SYSTEM = """Bạn là biên kịch trưởng của một kênh YouTube tiếng Việt chuyên phân tích
kinh tế - chính trị quốc tế. Bạn viết kịch bản để ĐỌC THÀNH TIẾNG.

Nguyên tắc bất di bất dịch:
- Viết liền mạch bằng giọng của chính người dẫn. Đây là bài phân tích của kênh,
  không phải bản tóm tắt một bài báo. Không nhắc tên tờ báo gốc trong lời đọc.
- Không sao chép câu chữ của tư liệu. Mọi ý phải được diễn đạt lại hoàn toàn bằng
  lời của bạn, theo mạch lập luận riêng.
- Không bịa số. Chỉ dùng số có trong tư liệu được cung cấp. Khi nêu một con số
  quan trọng, nói kèm cơ quan công bố (World Bank, IMF, FED, Tổng cục Thống kê...).
- Câu ngắn, chủ động. Tránh câu ghép ba tầng vì giọng đọc máy sẽ hụt hơi.
- Không gạch đầu dòng, không markdown, không emoji, không ký hiệu lạ trong lời đọc.
- Số viết theo cách đọc: "sáu phẩy năm phần trăm", "một nghìn hai trăm tỷ đô la".
- Không mở đầu chương bằng "Tiếp theo," hay "Bây giờ chúng ta sẽ". Vào thẳng ý."""

OUTLINE_PROMPT = """Lập dàn ý cho một video phân tích dài trên kênh sau.

<kenh>
Tên: {channel}
Khán giả: {audience}
Giọng điệu: {persona}
</kenh>

<tu_lieu_goc tieu_de="{title}">
{article}
</tu_lieu_goc>

<ban_nghien_cuu>
{brief}
</ban_nghien_cuu>

Yêu cầu: {chapters} chương, tổng lời đọc khoảng {words} từ.
- Một chương phải ĐỐI CHIẾU: các nguồn nhìn sự việc lệch nhau ở đâu và vì sao.
- {counter}
- {vietnam}
- Mạch chương phải có tiến triển: đặt vấn đề → bằng chứng → phản đề → hệ quả → Việt Nam → chốt.

Trả về JSON:
{{
  "title": "tiêu đề video tiếng Việt, 60-70 ký tự, có con số hoặc nghịch lý, không clickbait rỗng",
  "thesis": "nhận định trung tâm của chính người dẫn, 1-2 câu",
  "chapters": [
    {{"title":"tên chương",
      "goal":"chương này phải làm người xem hiểu được điều gì, 1 câu",
      "beats":["ý 1","ý 2","ý 3"],
      "so_lieu":["label của số liệu sẽ dùng trong chương này"],
      "key_point":"một câu ngắn để hiện chữ trên màn hình",
      "visual_note":"gợi ý hình chủ đạo, tiếng Anh, 3-8 từ"}}
  ]
}}"""

CHAPTER_PROMPT = """Viết lời đọc cho MỘT chương của video.

<dan_y_toan_video>
Tiêu đề: {title}
Nhận định trung tâm: {thesis}
Các chương: {chapter_list}
</dan_y_toan_video>

<chuong_can_viet stt="{index}/{total}">
Tiêu đề: {ch_title}
Mục tiêu: {goal}
Các ý phải triển khai: {beats}
Số liệu được phép dùng: {so_lieu}
</chuong_can_viet>

<chuong_truoc_ket_bang>
{prev_tail}
</chuong_truoc_ket_bang>

<tu_lieu>
{brief}
</tu_lieu>

Viết khoảng {words} từ lời đọc liền mạch cho riêng chương này.
Nối tiếp tự nhiên với đoạn kết của chương trước, nhưng không nhắc lại nội dung đó.
Chỉ trả về văn bản lời đọc thuần, không tiêu đề, không JSON, không chú thích."""

BOOKEND_PROMPT = """Viết phần mở và phần kết cho video đã hoàn thành phần thân.

Tiêu đề: {title}
Nhận định trung tâm: {thesis}

<cac_chuong>
{summaries}
</cac_chuong>

<doan_mo_dau_cua_chuong_1>
{first_tail}
</doan_mo_dau_cua_chuong_1>

Trả về JSON:
{{
  "hook": "90-130 từ. Nêu ngay con số gây sốc nhất hoặc nghịch lý lớn nhất có thật trong tư liệu. Hứa cụ thể người xem sẽ hiểu được gì. Không chào hỏi dài dòng. Dẫn thẳng vào đoạn mở đầu chương 1 ở trên.",
  "outro": "100-150 từ. Chốt lại nhận định của người dẫn, một câu hỏi mở cho bình luận, rồi kết bằng đúng lời kêu gọi: \\"{cta}\\""
}}"""


def build(
    article: Article,
    brief: dict[str, Any],
    llm: LLM,
    cfg: Any,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> VideoScript:
    def say(m: str) -> None:
        if on_progress:
            on_progress(m)

    minutes = cfg.get("script.target_minutes", 18)
    wpm = cfg.get("script.words_per_minute", 145)
    n_ch = cfg.get("script.chapters", 6)
    total_words = int(minutes * wpm)
    per_chapter = int(total_words * 0.85) // max(n_ch, 1)
    brief_json = json.dumps(brief, ensure_ascii=False, indent=1)[:22000]
    model = cfg.get("llm.model_script")

    # --- nhip 1: dan y -------------------------------------------------
    outline = llm.json(
        OUTLINE_PROMPT.format(
            channel=cfg.get("channel.name", ""),
            audience=cfg.get("channel.audience", ""),
            persona=(cfg.get("channel.persona", "") or "").strip(),
            title=article.title,
            article=article.text[:12000],
            brief=brief_json,
            chapters=n_ch,
            words=total_words,
            counter=(
                "Một chương phải trình bày phản biện mạnh nhất một cách công bằng, "
                "rồi mới nói người dẫn đồng ý hay không và vì sao."
                if cfg.get("script.include_counterargument", True)
                else "Không cần chương phản biện riêng."
            ),
            vietnam=(
                "Một chương phải trả lời: chuyện này ảnh hưởng gì tới túi tiền và công "
                "việc của người Việt. Đây là chương quan trọng nhất để khác biệt hoá kênh."
                if cfg.get("script.include_vietnam_angle", True)
                else "Không cần chương về Việt Nam."
            ),
        ),
        system=SYSTEM,
        model=model,
        max_tokens=4000,
    )
    chapters_meta = outline.get("chapters", [])[:n_ch]
    say(f"dàn ý: {len(chapters_meta)} chương — «{outline.get('title', '')}»")

    chapter_list = " | ".join(f"{i}. {c.get('title', '')}"
                              for i, c in enumerate(chapters_meta, 1))

    # --- nhip 2: tung chuong -------------------------------------------
    chapters: list[dict[str, Any]] = []
    prev_tail = "(đây là chương đầu tiên của phần thân)"
    for i, meta in enumerate(chapters_meta, 1):
        body = llm.text(
            CHAPTER_PROMPT.format(
                title=outline.get("title", ""),
                thesis=outline.get("thesis", ""),
                chapter_list=chapter_list,
                index=i,
                total=len(chapters_meta),
                ch_title=meta.get("title", ""),
                goal=meta.get("goal", ""),
                beats="; ".join(meta.get("beats", [])),
                so_lieu="; ".join(meta.get("so_lieu", [])) or "(không bắt buộc)",
                prev_tail=prev_tail,
                brief=brief_json,
                words=per_chapter,
            ),
            system=SYSTEM,
            model=model,
            max_tokens=max(2000, per_chapter * 4),
        ).strip()
        chapters.append({
            "title": meta.get("title", ""),
            "body": body,
            "key_point": meta.get("key_point", ""),
            "visual_note": meta.get("visual_note", ""),
        })
        prev_tail = " ".join(body.split()[-60:])
        say(f"chương {i}/{len(chapters_meta)}: {word_count(body)} từ — {meta.get('title','')}")

    # --- nhip 3: hook + outro ------------------------------------------
    ends = llm.json(
        BOOKEND_PROMPT.format(
            title=outline.get("title", ""),
            thesis=outline.get("thesis", ""),
            summaries="\n".join(
                f"{i}. {c['title']}: {c.get('key_point', '')}"
                for i, c in enumerate(chapters, 1)
            ),
            first_tail=" ".join(chapters[0]["body"].split()[:80]) if chapters else "",
            cta=cfg.get("channel.cta", ""),
        ),
        system=SYSTEM,
        model=model,
        max_tokens=2000,
    )

    script = VideoScript(
        title=outline.get("title", "").strip(),
        thesis=outline.get("thesis", "").strip(),
        hook=(ends.get("hook") or "").strip(),
        outro=(ends.get("outro") or "").strip(),
        chapters=chapters,
        counterpoints=[str(p.get("lap_luan", p)) for p in brief.get("phan_bien", [])],
        vietnam_angle=(brief.get("goc_viet_nam") or {}).get("y_nghia", ""),
        data_points=_data_points(brief),
        sources=_sources(brief),
    )
    script.est_words = word_count(script.full_text())
    say(f"tổng {script.est_words} từ ≈ {script.est_words / wpm:.1f} phút đọc")
    return script


def _data_points(brief: dict[str, Any]) -> list[DataPoint]:
    out = []
    for p in brief.get("so_lieu", []):
        if not isinstance(p, dict):
            continue
        series = p.get("series") or []
        out.append(DataPoint(
            label=p.get("label", ""),
            value=_num(p.get("value")),
            unit=p.get("unit", ""),
            series=series,
            source=p.get("nguon", ""),
            chart_type="line" if len(series) > 2 else ("bar" if series else "none"),
        ))
    return out


def _sources(brief: dict[str, Any]) -> list[Source]:
    out = []
    for s in brief.get("nguon", []):
        if isinstance(s, dict) and s.get("url"):
            out.append(Source(
                title=s.get("title", ""), url=s["url"],
                publisher=s.get("publisher", ""), date=s.get("date", ""),
            ))
    return out


def _num(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- review gate
def to_markdown(script: VideoScript, article: Article) -> str:
    out = [
        f"# {script.title}",
        "",
        f"> Tư liệu gốc: [{article.title or article.url}]({article.url})  ",
        f"> Nhận định trung tâm: {script.thesis}  ",
        f"> Độ dài ước tính: **{script.est_words} từ** (~{script.est_words / 145:.1f} phút đọc)",
        "",
        "---",
        "",
        "## [HOOK]",
        "",
        script.hook,
        "",
    ]
    for i, ch in enumerate(script.chapters, 1):
        out += [
            f"## [CHƯƠNG {i}] {ch['title']}",
            "",
            f"*Chữ trên màn hình:* {ch.get('key_point', '')}  ",
            f"*Gợi ý hình:* `{ch.get('visual_note', '')}`",
            "",
            ch["body"],
            "",
        ]
    out += ["## [OUTRO]", "", script.outro, "", "---", "", "## Số liệu dùng trong video", ""]
    for p in script.data_points:
        val = f"{p.value}{p.unit}" if p.value is not None else "(chuỗi)"
        out.append(f"- **{p.label}**: {val} — nguồn: {p.source} — biểu đồ: `{p.chart_type}`")
    out += ["", "## Nguồn tham khảo", ""]
    for s in script.sources:
        out.append(f"- [{s.title or s.url}]({s.url}) — {s.publisher} {s.date}".rstrip(" —"))
    out += ["", "---", "",
            "*Sửa trực tiếp file này rồi chạy `autovid approve <job> --reload`.*"]
    return "\n".join(out)


def from_markdown(md: str, base: VideoScript) -> VideoScript:
    """Doc nguoc script.md sau khi nguoi dung sua tay."""
    import re

    script = VideoScript(
        title=base.title, thesis=base.thesis, hook="", outro="", chapters=[],
        counterpoints=base.counterpoints, vietnam_angle=base.vietnam_angle,
        data_points=base.data_points, sources=base.sources,
    )
    m = re.search(r"^#\s+(.+)$", md, re.M)
    if m:
        script.title = m.group(1).strip()

    for block in re.split(r"^##\s+", md, flags=re.M)[1:]:
        head, _, rest = block.partition("\n")
        head = head.strip()
        body = re.sub(r"^\*.*\*\s*$", "", rest, flags=re.M)
        body = body.split("\n---")[0].strip()
        if head.startswith("[HOOK]"):
            script.hook = body
        elif head.startswith("[OUTRO]"):
            script.outro = body
        elif head.startswith("[CHƯƠNG"):
            kp = re.search(r"\*Chữ trên màn hình:\*\s*(.+)", block)
            vn = re.search(r"\*Gợi ý hình:\*\s*`([^`]*)`", block)
            script.chapters.append({
                "title": re.sub(r"^\[CHƯƠNG\s*\d+\]\s*", "", head),
                "body": body,
                "key_point": kp.group(1).strip() if kp else "",
                "visual_note": vn.group(1).strip() if vn else "",
            })
    script.est_words = word_count(script.full_text())
    return script
