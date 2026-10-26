from autovid.cli import fx_timing
from autovid.models import Scene


def _scene(**kw):
    return Scene(id="s-x", chapter="c", narration="Một hai ba bốn năm sáu bảy tám chín mười.", duration=10.0, **kw)


def test_moi_luc_chi_mot_lop_chu():
    items = [{"type": "keyword", "text": "a", "say": "Một"},
             {"type": "keyword", "text": "b", "say": "năm"},
             {"type": "date", "text": "c", "say": "chín"}]
    out = fx_timing(_scene(), items)
    for a, b in zip(out, out[1:], strict=False):
        assert a["to"] <= b["from"] + 0.2


def test_bo_lop_chu_hien_qua_ngan_va_nhuong_cho_the_chuong():
    items = [{"type": "date", "text": "x", "say": "Một"},
             {"type": "keyword", "text": "y", "say": "hai"},
             {"type": "keyword", "text": "z", "say": "bảy"}]
    out = fx_timing(_scene(chapter_tag="Lý do 1"), items)
    assert [i["text"] for i in out] == ["y", "z"]


def test_nhuong_cho_thanh_ly_do():
    items = [{"type": "keyword", "text": "a", "say": "Một"},
             {"type": "keyword", "text": "b", "say": "mười"}]
    out = fx_timing(_scene(callout="Lý do"), items)
    assert [i["text"] for i in out] == ["a"] and out[0]["to"] <= 10.0 - 4.8
