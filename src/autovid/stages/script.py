"""Buoc 3 - Viet kich ban.

Dau ra: VideoScript (JSON) + script.md de nguoi duyet doc/sua trong cong review.
Kich ban duoc viet de DOC THANH TIENG, khong phai de doc bang mat:
cau ngan, khong gach dau dong, khong ky hieu la, so doc duoc.
"""

from __future__ import annotations

import json
from typing import Any

from ..llm import LLM
from ..models import Article, DataPoint, Source, VideoScript
from ..util.text import word_count

SYSTEM = """Bạn là biên kịch trưởng của một kênh YouTube tiếng Việt chuyên phân tích
kinh tế - chính trị quốc tế. Bạn viết kịch bản để ĐỌC THÀNH TIẾNG.

Nguyên tắc bất di bất dịch:
- Không đọc lại nguyên văn bài báo gốc. Trích dẫn tối đa 2-3 câu ngắn, có dẫn nguồn rõ.
  Phần còn lại phải là tóm lược, đối chiếu và bình luận bằng lời của chính bạn.
- Luôn phân biệt rõ ba giọng: "The Economist lập luận rằng...", "số liệu cho thấy...",
  và "theo tôi...". Người xem phải biết đâu là báo cáo, đâu là ý kiến.
- Không bịa số. Chỉ dùng số có trong tư liệu được cung cấp.
- Viết câu ngắn, chủ động. Tránh câu ghép ba tầng vì giọng đọc máy sẽ bị hụt hơi.
- Không dùng gạch đầu dòng, không markdown, không emoji, không viết tắt lạ trong lời đọc.
- Số viết theo cách đọc: "sáu phẩy năm phần trăm", "một nghìn hai trăm tỷ đô la".
- Không nói "như đã đề cập ở trên" hay "trong video hôm nay chúng ta sẽ" quá hai lần."""

PROMPT = """Viết kịch bản video review dài cho kênh sau.

<kenh>
Tên: {channel}
Khán giả: {audience}
Giọng điệu: {persona}
</kenh>

<bai_goc url="{url}" tieu_de="{title}">
{article}
</bai_goc>

<ban_nghien_cuu>
{brief}
</ban_nghien_cuu>

Yêu cầu định lượng:
- Tổng độ dài lời đọc: khoảng {words} từ (tương đương {minutes} phút đọc).
- {chapters} chương nội dung, mỗi chương {per_chapter} từ, có tiêu đề riêng.
- Mở đầu (hook) 90-130 từ: nêu ngay điều bất ngờ nhất hoặc con số gây sốc nhất,
  hứa hẹn cụ thể người xem sẽ hiểu được gì. Không chào hỏi dài dòng.
- Kết (outro) 100-150 từ: chốt lại nhận định của bạn, một câu hỏi mở cho bình luận,
  và lời kêu gọi: "{cta}"

Yêu cầu nội dung bắt buộc:
- Ít nhất một chương dành cho việc ĐỐI CHIẾU: các nguồn khác nói khác The Economist ở đâu.
- {counter}
- {vietnam}
- Rải đều các con số đã kiểm chứng; mỗi khi nêu số phải nói nguồn ngay sau đó.

Định dạng trả về - JSON đúng cấu trúc này:
{{
  "title": "tiêu đề video, tiếng Việt, 60-70 ký tự, có con số hoặc nghịch lý, không clickbait rỗng",
  "thesis": "nhận định trung tâm của chính bạn, 1-2 câu",
  "hook": "lời đọc mở đầu",
  "chapters": [
    {{"title": "tên chương", "body": "lời đọc liền mạch của chương",
      "key_point": "một câu tóm ý để hiện chữ trên màn hình",
      "visual_note": "gợi ý hình ảnh chủ đạo, tiếng Anh, 3-8 từ"}}
  ],
  "outro": "lời đọc kết",
  "counterpoints": ["phản biện 1", "phản biện 2"],
  "vietnam_angle": "tóm tắt góc nhìn Việt Nam trong 2-3 câu",
  "data_points": [
    {{"label":"tên số liệu","value":0,"unit":"%","source":"nguồn",
      "chart_type":"bar|line|none",
      "series":[{{"x":"2021","y":1.2}}]}}
  ],
  "sources": [{{"title":"...","url":"...","publisher":"...","date":"..."}}]
}}

Chỉ trả về JSON."""


def build(article: Article, brief: dict[str, Any], llm: LLM, cfg: Any) -> VideoScript:
    minutes = cfg.get("script.target_minutes", 18)
    wpm = cfg.get("script.words_per_minute", 145)
    chapters = cfg.get("script.chapters", 6)
    total_words = int(minutes * wpm)
    body_words = int(total_words * 0.85)  # tru hook + outro

    prompt = PROMPT.format(
        channel=cfg.get("channel.name", ""),
        audience=cfg.get("channel.audience", ""),
        persona=cfg.get("channel.persona", "").strip(),
        url=article.url,
        title=article.title,
        article=article.text[:16000],
        brief=json.dumps(brief, ensure_ascii=False, indent=2)[:20000],
        words=total_words,
        minutes=minutes,
        chapters=chapters,
        per_chapter=body_words // max(chapters, 1),
        cta=cfg.get("channel.cta", ""),
        counter=(
            "Một chương phải trình bày phản biện mạnh nhất một cách công bằng, "
            "rồi mới nói bạn đồng ý hay không và vì sao."
            if cfg.get("script.include_counterargument", True)
            else "Không cần chương phản biện riêng."
        ),
        vietnam=(
            "Một chương phải trả lời: chuyện này ảnh hưởng gì tới túi tiền và "
            "công việc của người Việt. Đây là chương quan trọng nhất để khác biệt hoá kênh."
            if cfg.get("script.include_vietnam_angle", True)
            else "Không cần chương về Việt Nam."
        ),
    )

    data = llm.json(
        prompt,
        system=SYSTEM,
        model=cfg.get("llm.model_script"),
        max_tokens=32000,
        effort=cfg.get("llm.effort", "high"),
    )
    return _to_script(data)


def _to_script(d: dict[str, Any]) -> VideoScript:
    script = VideoScript(
        title=d.get("title", "").strip(),
        hook=d.get("hook", "").strip(),
        chapters=[
            {
                "title": c.get("title", "").strip(),
                "body": c.get("body", "").strip(),
                "key_point": c.get("key_point", "").strip(),
                "visual_note": c.get("visual_note", "").strip(),
            }
            for c in d.get("chapters", [])
        ],
        outro=d.get("outro", "").strip(),
        thesis=d.get("thesis", "").strip(),
        counterpoints=[str(x) for x in d.get("counterpoints", [])],
        vietnam_angle=d.get("vietnam_angle", "").strip(),
        data_points=[
            DataPoint(
                label=p.get("label", ""),
                value=p.get("value"),
                unit=p.get("unit", ""),
                series=p.get("series", []) or [],
                source=p.get("source", ""),
                chart_type=p.get("chart_type", "none"),
            )
            for p in d.get("data_points", [])
        ],
        sources=[
            Source(
                title=s.get("title", ""),
                url=s.get("url", ""),
                publisher=s.get("publisher", ""),
                date=s.get("date", ""),
            )
            for s in d.get("sources", [])
        ],
    )
    script.est_words = word_count(script.full_text())
    return script


def to_markdown(script: VideoScript, article: Article) -> str:
    """Ban de nguoi doc/sua o cong review. Sua file nay roi chay `autovid approve`."""
    out = [
        f"# {script.title}",
        "",
        f"> Nguồn gốc: [{article.title or article.url}]({article.url})  ",
        f"> Luận điểm của người dẫn: {script.thesis}  ",
        f"> Độ dài ước tính: **{script.est_words} từ** "
        f"(~{script.est_words / 145:.1f} phút đọc)",
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
        out.append(f"- [{s.title or s.url}]({s.url}) — {s.publisher} {s.date}".rstrip())
    out += [
        "",
        "---",
        "",
        "*Sửa trực tiếp file này rồi chạy `autovid approve <job> --reload` "
        "để pipeline dùng bản đã sửa.*",
    ]
    return "\n".join(out)


def from_markdown(md: str, base: VideoScript) -> VideoScript:
    """Doc nguoc script.md sau khi nguoi dung sua tay."""
    import re

    script = VideoScript(**{**base.to_dict(), "chapters": [], "hook": "", "outro": ""})
    script.data_points = base.data_points
    script.sources = base.sources

    m = re.search(r"^#\s+(.+)$", md, re.M)
    if m:
        script.title = m.group(1).strip()

    blocks = re.split(r"^##\s+", md, flags=re.M)[1:]
    for block in blocks:
        head, _, body = block.partition("\n")
        head = head.strip()
        body = re.sub(r"^\*.*?\*.*$", "", body, flags=re.M)          # bo dong chu thich
        body = body.split("\n---")[0].strip()
        if head.startswith("[HOOK]"):
            script.hook = body
        elif head.startswith("[OUTRO]"):
            script.outro = body
        elif head.startswith("[CHƯƠNG"):
            title = re.sub(r"^\[CHƯƠNG\s*\d+\]\s*", "", head)
            kp = re.search(r"\*Chữ trên màn hình:\*\s*(.+)", block)
            vn = re.search(r"\*Gợi ý hình:\*\s*`([^`]*)`", block)
            script.chapters.append({
                "title": title,
                "body": body,
                "key_point": kp.group(1).strip() if kp else "",
                "visual_note": vn.group(1).strip() if vn else "",
            })
    script.est_words = word_count(script.full_text())
    return script
