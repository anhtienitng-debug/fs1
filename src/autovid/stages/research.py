"""Buoc 2 - Nghien cuu doi chieu (khong can API key tim kiem).

Ba nhip:
  1. LLM doc bai goc -> sinh danh sach truy van tim kiem tieng Anh + tieng Viet.
  2. Tim bang DuckDuckGo (hoac SearXNG/Tavily/Brave neu ban co), tai toan van
     cac ket qua dau.
  3. LLM doc tu lieu that vua tai ve -> viet brief JSON.

Nhip 3 chi duoc dung tu lieu trong prompt, nen kho bia hon la de model tu nho.
"""

from __future__ import annotations

from typing import Any

from .. import search as websearch
from ..llm import LLM
from ..models import Article

QUERY_PROMPT = """Đọc bài viết sau và đề xuất các truy vấn tìm kiếm để nghiên cứu đối chiếu.

<bai_goc tieu_de="{title}">
{text}
</bai_goc>

Cần tìm: (a) các toà soạn lớn khác tường thuật cùng sự kiện, (b) số liệu gốc từ
World Bank / IMF / OECD / FRED / ngân hàng trung ương / cơ quan thống kê,
(c) tiền lệ lịch sử tương tự, (d) lập luận phản biện, (e) tác động tới Việt Nam.

Trả về JSON: {{"queries": ["truy vấn 1", "truy vấn 2", ...]}}
Tối đa {n} truy vấn. Truy vấn (a)-(d) viết tiếng Anh, truy vấn (e) viết tiếng Việt.
Mỗi truy vấn ngắn gọn như người ta thật sự gõ vào Google."""

BRIEF_PROMPT = """Bạn là trợ lý nghiên cứu cho kênh YouTube phân tích kinh tế - chính trị tiếng Việt.

<bai_goc url="{url}" tieu_de="{title}">
{text}
</bai_goc>

<tu_lieu_tim_duoc>
{corpus}
</tu_lieu_tim_duoc>

Chỉ được dùng thông tin có trong hai khối trên. TUYỆT ĐỐI không dùng kiến thức
ghi nhớ sẵn để điền số hay URL. Nếu tư liệu không đủ để trả lời một mục, để mảng rỗng.

Viết brief theo JSON:
{{
  "thesis_goc": "luận điểm chính của bài gốc, 1-2 câu",
  "so_lieu": [
    {{"label":"...","value":0,"unit":"%","nguon":"tên cơ quan/toà soạn",
      "kiem_chung":"khớp|lệch|không rõ",
      "series":[{{"x":"2021","y":1.2}}]}}
  ],
  "doi_chieu": [{{"nguon":"...","url":"...","quan_diem":"...","khac_biet":"..."}}],
  "tien_le": [{{"su_kien":"...","nam":"...","ket_cuc":"...","bai_hoc":"..."}}],
  "phan_bien": [{{"lap_luan":"...","nguoi_dua_ra":"...","do_manh":"cao|trung bình|thấp"}}],
  "goc_viet_nam": {{"kenh_tac_dong":["..."],"so_lieu_vn":["..."],"y_nghia":"..."}},
  "diem_mu": ["..."],
  "nguon": [{{"title":"...","url":"...","publisher":"...","date":"..."}}]
}}

Trong "so_lieu", đặt "kiem_chung":"khớp" chỉ khi tư liệu có nguồn sơ cấp xác nhận,
"lệch" khi nguồn khác đưa con số khác, "không rõ" cho mọi trường hợp còn lại.
Trong "nguon" chỉ liệt kê URL thật sự xuất hiện trong tư liệu trên."""


def make_queries(article: Article, llm: LLM, n: int = 8) -> list[str]:
    try:
        data = llm.json(
            QUERY_PROMPT.format(title=article.title, text=article.text[:8000], n=n),
            max_tokens=1200,
            temperature=0.3,
        )
        queries = [str(q).strip() for q in data.get("queries", []) if str(q).strip()]
    except Exception:  # noqa: BLE001
        queries = []
    if not queries:  # du phong: van tim duoc thu gi do
        queries = [article.title, f"{article.title} analysis", f"{article.title} Việt Nam"]
    return queries[:n]


def _corpus(hits: list[websearch.Hit], budget: int = 42000) -> str:
    parts, used = [], 0
    for h in hits:
        body = (h.text or h.snippet or "").strip()
        if not body:
            continue
        block = (
            f'<nguon url="{h.url}" toa_soan="{h.publisher}" tieu_de="{h.title}" '
            f'ngay="{h.date}">\n{body}\n</nguon>'
        )
        if used + len(block) > budget:
            block = block[: max(0, budget - used)]
            if len(block) < 500:
                break
        parts.append(block)
        used += len(block)
    return "\n\n".join(parts)


def run(
    article: Article,
    llm: LLM,
    *,
    max_queries: int = 8,
    max_sources: int = 15,
    on_progress=None,
) -> dict[str, Any]:
    def say(msg: str) -> None:
        if on_progress:
            on_progress(msg)

    queries = make_queries(article, llm, max_queries)
    say(f"đã sinh {len(queries)} truy vấn tìm kiếm")

    hits = websearch.search_many(queries, per_query=5, limit=max_sources)
    say(f"tìm được {len(hits)} nguồn qua {websearch.LAST_BACKEND or '—'}")
    if not hits:
        say("không backend tìm kiếm nào hoạt động — brief sẽ chỉ dựa trên bài gốc")

    websearch.enrich(hits, top=min(10, len(hits)))
    say(f"đã tải toàn văn {sum(1 for h in hits if h.text)} nguồn")

    brief = llm.json(
        BRIEF_PROMPT.format(
            url=article.url,
            title=article.title,
            text=article.text[:16000],
            corpus=_corpus(hits) or "(không tìm được tư liệu bổ sung)",
        ),
        system="Bạn là nhà nghiên cứu kinh tế cẩn trọng. Không bao giờ bịa số liệu hay URL.",
        max_tokens=8000,
        temperature=0.3,
    )

    brief.setdefault("nguon", [])
    known = {s.get("url") for s in brief["nguon"] if isinstance(s, dict)}
    brief["nguon"] += [h.to_dict() for h in hits if h.url not in known]
    brief["_queries"] = queries
    return brief
