"""Buoc 2 - Nghien cuu doi chieu.

Muc tieu: bai review khong duoc chi la "tom tat lai The Economist". No phai co
gia tri cong them. Buoc nay dung web search server-side cua Claude de lay:
  - cac toa soan khac noi gi ve cung su kien (doi chieu quan diem),
  - so lieu goc tu nguon so cap (World Bank, IMF, FED, TCTK...),
  - tien le lich su / truong hop tuong tu,
  - phan bien manh nhat voi luan diem cua bai,
  - lien he Viet Nam.
"""

from __future__ import annotations

from typing import Any

from ..llm import LLM
from ..models import Article

BRIEF_PROMPT = """Bạn là trợ lý nghiên cứu cho một kênh YouTube phân tích kinh tế - chính trị tiếng Việt.

Dưới đây là bài viết gốc trên The Economist mà chúng tôi sẽ review.

<bai_goc url="{url}" tieu_de="{title}">
{text}
</bai_goc>

Hãy dùng web search để nghiên cứu và trả về một bản brief phục vụ việc viết kịch bản.
Yêu cầu bắt buộc:

1. **Kiểm chứng số liệu**: mọi con số then chốt trong bài phải được đối chiếu với
   nguồn sơ cấp (World Bank, IMF, OECD, FRED, ngân hàng trung ương, cơ quan thống kê).
   Ghi rõ số nào khớp, số nào lệch, số nào không kiểm chứng được.
2. **Đối chiếu quan điểm**: ít nhất 3 nguồn lớn khác (FT, Reuters, Bloomberg, WSJ,
   Nikkei, SCMP, báo Việt Nam...) nói gì về cùng sự kiện. Chỉ ra chỗ họ bất đồng
   với The Economist.
3. **Tiền lệ lịch sử**: 1-2 trường hợp tương tự trong quá khứ và kết cục của chúng.
4. **Phản biện mạnh nhất**: lập luận thuyết phục nhất chống lại luận điểm chính của
   bài, kèm ai là người đưa ra lập luận đó.
5. **Góc Việt Nam**: sự kiện này chạm tới Việt Nam qua kênh nào (thương mại, FDI,
   tỷ giá, lãi suất, chuỗi cung ứng, lao động, chính sách). Ưu tiên số liệu Việt Nam thật.
6. **Điểm mù của The Economist**: thiên kiến biên tập hoặc thứ bài bỏ sót.

Trả về JSON đúng cấu trúc:
{{
  "thesis_goc": "luận điểm chính của The Economist, 1-2 câu",
  "so_lieu": [
    {{"label":"...", "value": 0, "unit":"...", "nguon":"...", "kiem_chung":"khớp|lệch|không rõ",
      "series": [{{"x":"2020","y":1.0}}]}}
  ],
  "doi_chieu": [{{"nguon":"...", "url":"...", "quan_diem":"...", "khac_biet":"..."}}],
  "tien_le": [{{"su_kien":"...", "nam":"...", "ket_cuc":"...", "bai_hoc":"..."}}],
  "phan_bien": [{{"lap_luan":"...", "nguoi_dua_ra":"...", "do_manh":"cao|trung bình|thấp"}}],
  "goc_viet_nam": {{"kenh_tac_dong": ["..."], "so_lieu_vn": ["..."], "y_nghia":"..."}},
  "diem_mu": ["..."],
  "nguon": [{{"title":"...", "url":"...", "publisher":"...", "date":"..."}}]
}}

Chỉ đưa vào JSON những gì bạn thực sự tìm được. Không bịa số, không bịa URL.
Nếu không kiểm chứng được một con số, ghi "kiem_chung": "không rõ"."""


def run(article: Article, llm: LLM, *, max_uses: int = 8, max_chars: int = 18000) -> dict[str, Any]:
    text = article.text[:max_chars]
    if article.paywalled:
        text += (
            "\n\n[LƯU Ý: chỉ lấy được phần công khai của bài do tường phí. "
            "Hãy dùng web search để dựng lại nội dung và luận điểm chính từ các "
            "nguồn thứ cấp đã tường thuật về bài viết này.]"
        )
    prompt = BRIEF_PROMPT.format(url=article.url, title=article.title, text=text)

    raw, sources = llm.search(
        prompt,
        max_uses=max_uses,
        system="Bạn là nhà nghiên cứu kinh tế cẩn trọng. Không bao giờ bịa số liệu hay nguồn.",
    )
    from ..llm import parse_json

    try:
        brief = parse_json(raw)
    except ValueError:
        # Model tra ve van xuoi -> yeu cau chuyen thanh JSON o luot thu hai
        brief = llm.json(
            "Chuyển bản brief sau thành đúng JSON theo cấu trúc đã mô tả, giữ nguyên nội dung:\n\n"
            + raw
        )
    brief.setdefault("nguon", [])
    known = {s.get("url") for s in brief["nguon"]}
    brief["nguon"] += [s for s in sources if s["url"] not in known]
    return brief
