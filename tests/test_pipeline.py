"""Kiem tra cac buoc chay duoc offline (khong can API key, mang hay ffmpeg)."""

from __future__ import annotations

import io
import wave

import pytest

from autovid.config import load_config
from autovid.models import Article, DataPoint, Scene, VideoScript
from autovid.stages import align, charts
from autovid.stages import scenes as scenes_mod
from autovid.stages import script as script_mod
from autovid.stages import tts as tts_mod
from autovid.util import text as t


@pytest.fixture
def cfg():
    return load_config()


@pytest.fixture
def script():
    return VideoScript(
        title="Vì sao lãi suất Mỹ chạm mức cao nhất 20 năm",
        thesis="Chi phí vốn đắt sẽ còn kéo dài hơn thị trường kỳ vọng.",
        hook="Có một con số ít người để ý. Trong mười hai tháng qua, chi phí vay của "
             "chính phủ Mỹ đã vượt cả ngân sách quốc phòng. Đó không phải chuyện của "
             "riêng nước Mỹ.",
        chapters=[
            {"title": "Con số bị bỏ quên", "key_point": "Lãi vay vượt ngân sách quốc phòng",
             "visual_note": "federal reserve building",
             "body": "Năm ngoái, khoản tiền chính phủ Mỹ trả lãi đã chạm một nghìn tỷ "
                     "đô la. Con số này do Bộ Tài chính Mỹ công bố. Nó lớn hơn toàn bộ "
                     "chi tiêu quốc phòng trong cùng kỳ. Điều đáng nói là xu hướng vẫn "
                     "chưa dừng lại."},
            {"title": "Điều này chạm tới Việt Nam thế nào",
             "key_point": "Tỷ giá và lãi suất trong nước chịu sức ép",
             "visual_note": "vietnamese garment factory",
             "body": "Khi đồng đô la mạnh lên, tiền đồng chịu sức ép giảm giá. Doanh "
                     "nghiệp nhập khẩu nguyên liệu phải trả nhiều hơn. Người vay mua nhà "
                     "cũng thấy lãi suất nhích lên theo."},
        ],
        outro="Tôi cho rằng thị trường đang đánh giá thấp độ dai của chu kỳ này. "
              "Còn bạn nghĩ sao? Để lại bình luận bạn đồng ý hay phản đối.",
        data_points=[
            DataPoint(label="Chi phí trả lãi của chính phủ Mỹ", value=1000.0,
                      unit=" tỷ USD", source="Bộ Tài chính Mỹ", chart_type="bar"),
            DataPoint(label="Lãi suất điều hành FED", unit="%", source="FED",
                      chart_type="line",
                      series=[{"x": "2021", "y": 0.25}, {"x": "2022", "y": 4.5},
                              {"x": "2023", "y": 5.5}, {"x": "2024", "y": 5.25},
                              {"x": "2025", "y": 4.0}]),
        ],
    )


# --------------------------------------------------------------- text utils
def test_chuan_hoa_van_ban_cho_tts():
    out = t.prepare_for_tts("GDP tăng 6.5% còn CPI chỉ 3.2%, đạt $1,200 mỗi người.")
    assert "gi đi pi" in out and "6 phẩy 5 phần trăm" in out
    assert "1.200 đô la" in out
    assert "%" not in out and "$" not in out


def test_chia_doan_khong_cat_giua_cau():
    text = "Câu một ngắn. Câu hai dài hơn một chút nhưng vẫn ổn. Câu ba kết thúc."
    chunks = t.chunk_for_tts(text, 50)
    assert all(len(c) <= 50 for c in chunks)
    assert "".join(chunks).replace(" ", "") == text.replace(" ", "")


# ------------------------------------------------------------------- scenes
def test_tach_canh_khong_vuot_gioi_han_tu(script):
    out = scenes_mod.split_into_scenes(script, max_words=25)
    assert len(out) > 4
    for s in out:
        # mot canh chi vuot gioi han khi ban than mot cau da dai hon gioi han
        assert t.word_count(s.narration) <= 25 or len(t.split_sentences(s.narration)) == 1
    assert out[0].chapter == "HOOK"
    assert out[-1].chapter == "OUTRO"
    assert {s.id for s in out}.__len__() == len(out)  # id khong trung


def test_canh_giu_du_loi_doc(script):
    out = scenes_mod.split_into_scenes(script, max_words=40)
    joined = " ".join(s.narration for s in out)
    assert script.hook.split(".")[0] in joined
    assert "tiền đồng chịu sức ép" in joined


# ---------------------------------------------------------- review gate I/O
def test_script_di_qua_markdown_roi_quay_lai(script):
    article = Article(url="https://example.com/x", title="Nguồn gốc")
    md = script_mod.to_markdown(script, article)
    back = script_mod.from_markdown(md, script)
    assert back.title == script.title
    assert len(back.chapters) == len(script.chapters)
    assert back.chapters[0]["title"] == script.chapters[0]["title"]
    assert back.chapters[1]["visual_note"] == "vietnamese garment factory"
    assert "tiền đồng chịu sức ép" in back.chapters[1]["body"]
    assert back.outro.startswith("Tôi cho rằng")
    assert back.data_points == script.data_points


def test_sua_tay_script_md_duoc_nap_lai(script):
    article = Article(url="https://example.com/x")
    md = script_mod.to_markdown(script, article)
    md = md.replace("Con số bị bỏ quên", "Con số không ai nhắc")
    back = script_mod.from_markdown(md, script)
    assert back.chapters[0]["title"] == "Con số không ai nhắc"


# -------------------------------------------------------------------- audio
def _wav_bytes(seconds: float, rate: int = 48000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


def test_ghep_wav_cong_don_do_dai(tmp_path):
    dest = tmp_path / "out.wav"
    dur = tts_mod.join_wav([_wav_bytes(1.0), _wav_bytes(0.5)], 200, dest)
    assert dest.exists()
    assert dur == pytest.approx(1.7, abs=0.02)   # 1.0 + 0.2 lang + 0.5
    with wave.open(str(dest)) as w:
        assert w.getframerate() == 48000


# ----------------------------------------------------------------- subtitle
def test_phu_de_uoc_luong_bam_theo_moc_canh(cfg):
    scenes = [
        Scene(id="s-000", chapter="HOOK", narration="Một hai ba bốn năm sáu bảy tám.",
              duration=4.0, start=0.0, audio_path="x.wav"),
        Scene(id="s-001", chapter="HOOK", narration="Chín mười mười một mười hai.",
              duration=3.0, start=4.5, audio_path="x.wav"),
    ]
    cfg.set("align.enabled", False)
    cues = align.run(scenes, cfg)
    assert cues
    assert cues[0].start >= 0
    assert cues[-1].end <= 4.5 + 3.0 + 0.01
    for a, b in zip(cues, cues[1:], strict=False):
        assert b.start >= a.start          # khong lui thoi gian
    srt = align.to_srt(cues)
    assert "-->" in srt and "00:00:0" in srt
    ass = align.to_ass(cues, cfg)
    assert "[V4+ Styles]" in ass and "Dialogue:" in ass


def test_dong_phu_de_khong_qua_dai(cfg):
    scene = Scene(id="s-000", chapter="X", duration=20.0, start=0.0, audio_path="x.wav",
                  narration=" ".join(["từ"] * 120))
    cfg.set("align.enabled", False)
    cues = align.run([scene], cfg)
    for c in cues:
        assert len(c.text) <= 90
        assert c.text.count("\n") <= 1


# ------------------------------------------------------------------- charts
def test_ve_bieu_do_cot(tmp_path, cfg, script):
    out = charts.bar_chart(script.data_points[0], tmp_path / "bar.png", cfg)
    assert out.exists() and out.stat().st_size > 10_000


def test_ve_bieu_do_duong(tmp_path, cfg, script):
    out = charts.line_chart(script.data_points[1], tmp_path / "line.png", cfg)
    assert out.exists() and out.stat().st_size > 10_000


def test_ve_timeline(tmp_path, cfg):
    events = [
        {"su_kien": "Khủng hoảng dầu mỏ", "nam": "1973", "ket_cuc": "lạm phát hai chữ số"},
        {"su_kien": "Volcker nâng lãi suất", "nam": "1980", "ket_cuc": "suy thoái"},
        {"su_kien": "Khủng hoảng tài chính", "nam": "2008", "ket_cuc": "nới lỏng định lượng"},
    ]
    out = charts.timeline(events, "Tiền lệ", tmp_path / "tl.png", cfg)
    assert out is not None and out.exists()


def test_timeline_bo_qua_khi_thieu_du_lieu(tmp_path, cfg):
    assert charts.timeline([{"su_kien": "chỉ một", "nam": "2000"}], "T",
                           tmp_path / "x.png", cfg) is None


def test_bang_mau_co_dinh_khong_xoay_vong():
    # mau gan theo thu tu slot, khong duoc lap lai trong 8 chuoi dau
    assert len(set(charts.SERIES)) == len(charts.SERIES) == 8
    # ramp sequential phai don dieu tu nhat den dam
    assert charts.SEQ[0] != charts.SEQ[-1]


# -------------------------------------------------------------------- config
def test_ghi_de_config_bang_set():
    cfg = load_config(extra=["tts.speed=1.05", "video.subtitles_burn=false",
                             "script.chapters=8"])
    assert cfg.get("tts.speed") == 1.05
    assert cfg.get("video.subtitles_burn") is False
    assert cfg.get("script.chapters") == 8
    assert cfg.get("tts.voice") == "Phạm Tuyên"
