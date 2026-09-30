"""Buoc 7 - Can phu de.

Chay faster-whisper NGUOC lai tren chinh file audio vua tao ra, de lay moc thoi
gian tung tu. Cach nay chinh xac hon la uoc luong theo so ky tu, vi giong doc
may khong deu toc do o cau dai va so.

Neu khong cai duoc faster-whisper, tu dong ha xuong che do uoc luong: chia deu
thoi luong canh cho cac tu. Phu de van xem duoc, chi kem khop hon mot chut.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..models import Scene
from ..util.text import strip_tags, wrap_subtitle


@dataclass
class Cue:
    start: float
    end: float
    text: str


def _fmt(t: float, sep: str = ",") -> str:
    h, rem = divmod(max(t, 0.0), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)):03d}"


def to_srt(cues: list[Cue]) -> str:
    out = []
    for i, c in enumerate(cues, 1):
        out.append(f"{i}\n{_fmt(c.start)} --> {_fmt(c.end)}\n{c.text}\n")
    return "\n".join(out)


def to_ass(cues: list[Cue], cfg: Any) -> str:
    w, h = cfg.get("video.resolution", [1920, 1080])
    font = cfg.get("video.subtitle_font", "Be Vietnam Pro")
    size = cfg.get("video.subtitle_size", 54)
    margin = cfg.get("video.safe_margin_px", 90)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{font},{size},&H00FFFFFF,&H00101010,&H90000000,-1,0,3,4,2,2,{margin},{margin},{margin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [
        f"Dialogue: 0,{_fmt(c.start, '.')[:-1]},{_fmt(c.end, '.')[:-1]},Sub,,0,0,0,,"
        + c.text.replace("\n", "\\N")
        for c in cues
    ]
    return head + "\n".join(lines) + "\n"


# ------------------------------------------------------------------ backends
def _whisper_words(path: Path, cfg: Any) -> list[tuple[float, float, str]]:
    from faster_whisper import WhisperModel

    device = cfg.get("align.device", "auto")
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
    compute = "float16" if device == "cuda" else "int8"
    model = WhisperModel(cfg.get("align.model", "large-v3"), device=device,
                         compute_type=compute)
    segments, _ = model.transcribe(str(path), language="vi", word_timestamps=True,
                                   vad_filter=True)
    words: list[tuple[float, float, str]] = []
    for seg in segments:
        for w in (seg.words or []):
            words.append((w.start, w.end, w.word.strip()))
    return words


def _estimate_words(scene: Scene) -> list[tuple[float, float, str]]:
    toks = strip_tags(scene.narration).split()
    if not toks:
        return []
    # phan bo thoi gian theo do dai tu, khong chia deu tuyet doi
    weights = [max(len(t), 2) for t in toks]
    total = sum(weights)
    out, t = [], 0.0
    for tok, wt in zip(toks, weights, strict=True):
        dur = scene.duration * wt / total
        out.append((t, t + dur, tok))
        t += dur
    return out


def cues_for_scene(scene: Scene, words: list[tuple[float, float, str]],
                   cfg: Any) -> list[Cue]:
    """Gom tu thanh dong phu de <= 2 dong, moi dong <= 42 ky tu."""
    width = 42
    max_chars = width * 2
    cues: list[Cue] = []
    buf: list[str] = []
    start = words[0][0] if words else 0.0
    for w_start, w_end, tok in words:
        candidate = " ".join(buf + [tok])
        if buf and len(candidate) > max_chars:
            cues.append(Cue(scene.start + start, scene.start + w_start,
                            wrap_subtitle(" ".join(buf), width)))
            buf, start = [], w_start
        buf.append(tok)
        end = w_end
    if buf:
        cues.append(Cue(scene.start + start, scene.start + end,
                        wrap_subtitle(" ".join(buf), width)))
    return cues


def run(
    scenes: list[Scene],
    cfg: Any,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> list[Cue]:
    engine = cfg.get("align.engine", "faster-whisper")
    use_whisper = cfg.get("align.enabled", True) and engine == "faster-whisper"
    if use_whisper:
        try:
            import faster_whisper  # noqa: F401
        except ImportError:
            use_whisper = False
            if on_progress:
                on_progress("chưa cài faster-whisper — dùng chế độ ước lượng "
                            "(pip install 'autovid[align]')")

    cues: list[Cue] = []
    for i, scene in enumerate(scenes, 1):
        if not scene.audio_path:
            continue
        path = Path(scene.audio_path)
        words: list[tuple[float, float, str]] = []
        if use_whisper:
            try:
                words = _whisper_words(path, cfg)
            except Exception as exc:  # noqa: BLE001
                if on_progress:
                    on_progress(f"{scene.id}: whisper lỗi ({exc}), ước lượng thay thế")
        if not words:
            words = _estimate_words(scene)
        cues += cues_for_scene(scene, words, cfg)
        if on_progress and i % 10 == 0:
            on_progress(f"căn phụ đề {i}/{len(scenes)} cảnh")
    return cues
