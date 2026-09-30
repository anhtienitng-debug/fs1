"""Buoc 10 - Dung video bang ffmpeg.

Chien luoc: dung TUNG CANH thanh mot clip da chuan hoa (cung do phan giai, fps,
codec, co san audio cua canh do), roi noi lai bang concat demuxer. Cach nay:
  - chay lai duoc: sua mot canh chi render lai clip do,
  - khong dung filter_complex khong lo cho 50+ canh (de tran bo nho va kho debug),
  - noi cuoi cung gan nhu tuc thoi vi chi copy stream.

Chuyen dong: anh tinh dung Ken Burns (zoompan), video B-roll duoc cat/lap cho
vua do dai canh. Giua cac canh dung fade ngan thay vi xfade de tranh phai dung
mot chuoi filter khong lo.
"""

from __future__ import annotations

import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..models import Scene
from ..util import ffmpeg

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
SURFACE = "0x1a1a19"


def _is_image(path: str) -> bool:
    return Path(path).suffix.lower() in IMAGE_EXT


def _find_font() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return ""


def _esc(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(":", "\\:")
            .replace("'", "\u2019").replace("%", "\\%"))


# ------------------------------------------------------------ mot canh
def scene_clip(
    scene: Scene,
    cfg: Any,
    dest: Path,
    *,
    gap_ms: int,
    font: str = "",
    log: Path | None = None,
) -> Path:
    w, h = cfg.get("video.resolution", [1920, 1080])
    fps = cfg.get("video.fps", 30)
    crf = cfg.get("video.crf", 19)
    preset = cfg.get("video.preset", "medium")
    zoom = cfg.get("video.kenburns_zoom", 0.10)
    fade = 0.25
    dur = scene.duration + gap_ms / 1000.0
    frames = max(int(dur * fps), 1)

    args: list[str] = []
    media = scene.media_path

    if media and Path(media).exists() and _is_image(media):
        # Ken Burns: phong to anh truoc roi moi zoompan, neu khong se bi giat
        args += ["-loop", "1", "-framerate", fps, "-t", f"{dur:.3f}", "-i", media]
        vf = (
            f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,"
            f"crop={w * 2}:{h * 2},"
            f"zoompan=z='min(zoom+{zoom / frames:.6f},{1 + zoom})':"
            f"d={frames}:s={w}x{h}:fps={fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        )
    elif media and Path(media).exists():
        args += ["-stream_loop", "-1", "-t", f"{dur:.3f}", "-i", media]
        vf = (
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},fps={fps}"
        )
    else:
        # Khong co hinh: nen toi + chu, van tot hon la mat khung
        args += ["-f", "lavfi", "-t", f"{dur:.3f}",
                 "-i", f"color=c={SURFACE}:s={w}x{h}:r={fps}"]
        vf = "null"

    if font and scene.on_screen_text:
        vf += (
            f",drawtext=fontfile='{font}':text='{_esc(scene.on_screen_text)}':"
            f"fontcolor=white:fontsize={int(h * 0.042)}:box=1:boxcolor=0x000000AA:"
            f"boxborderw=24:x=(w-text_w)/2:y=h-{int(h * 0.20)}:"
            f"enable='between(t,0.6,{max(dur - 0.6, 1.2):.2f})'"
        )
    vf += f",fade=t=in:st=0:d={fade},fade=t=out:st={max(dur - fade, 0):.3f}:d={fade}"
    vf += ",format=yuv420p"

    # Audio: loi doc cua canh + khoang lang cuoi canh
    args += ["-i", scene.audio_path] if scene.audio_path else [
        "-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"
    ]
    af = f"aresample=48000,apad,atrim=0:{dur:.3f},aformat=channel_layouts=stereo"

    ffmpeg.run(
        [*[str(a) for a in args],
         "-vf", vf, "-af", af,
         "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
         "-r", str(fps), "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
         "-t", f"{dur:.3f}", "-shortest", str(dest)],
        log=log,
    )
    return dest


# ------------------------------------------------------------- nhac nen
def _pick_music(cfg: Any) -> Path | None:
    d = Path(cfg.get("music.dir", "assets/music"))
    if not d.exists():
        return None
    files = sorted(p for p in d.iterdir()
                   if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg", ".flac"))
    return files[0] if files else None


def add_music(video: Path, music: Path, dest: Path, cfg: Any,
              log: Path | None = None) -> Path:
    """Tron nhac nen, tu dong ha xuong khi co giong noi (sidechain ducking)."""
    vol = cfg.get("music.volume_db", -26)
    duck = cfg.get("music.ducking_db", -14)
    fade = cfg.get("music.fade_ms", 2000) / 1000.0
    total = ffmpeg.duration(video)
    ratio = max(1.0, abs(duck) / 2.0)

    filt = (
        f"[1:a]aloop=loop=-1:size=2e9,atrim=0:{total:.3f},"
        f"volume={vol}dB,afade=t=in:st=0:d={fade},"
        f"afade=t=out:st={max(total - fade, 0):.3f}:d={fade}[music];"
        f"[0:a]asplit=2[voice][key];"
        f"[music][key]sidechaincompress=threshold=0.02:ratio={ratio:.1f}:"
        f"attack=25:release=400[ducked];"
        f"[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0:"
        f"normalize=0[aout]"
    )
    ffmpeg.run(
        ["-i", str(video), "-i", str(music),
         "-filter_complex", filt, "-map", "0:v", "-map", "[aout]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", cfg.get("video.audio_bitrate", "192k"),
         str(dest)],
        log=log,
    )
    return dest


def burn_subtitles(video: Path, ass: Path, dest: Path, cfg: Any,
                   log: Path | None = None) -> Path:
    ffmpeg.run(
        ["-i", str(video), "-vf", f"ass={ass.as_posix()}",
         "-c:v", "libx264", "-preset", cfg.get("video.preset", "medium"),
         "-crf", str(cfg.get("video.crf", 19)), "-pix_fmt", "yuv420p",
         "-c:a", "copy", str(dest)],
        log=log,
    )
    return dest


# ------------------------------------------------------------------ stage
def run(
    scenes: list[Scene],
    cfg: Any,
    job_dir: Path,
    *,
    ass_file: Path | None = None,
    force: bool = False,
    on_progress: Callable[[str], None] | None = None,
) -> Path:
    ffmpeg.require("ffmpeg")
    ffmpeg.require("ffprobe")
    clips_dir = job_dir / "clips"
    log = job_dir / "logs" / "ffmpeg.log"
    gap = cfg.get("tts.pause_between_scenes_ms", 450)
    font = _find_font()
    if not font and on_progress:
        on_progress("không tìm thấy font hệ thống — bỏ qua chữ trên màn hình")

    clips: list[Path] = []
    for i, scene in enumerate(scenes, 1):
        dest = clips_dir / f"{scene.id}.mp4"
        if not dest.exists() or force:
            scene_clip(scene, cfg, dest, gap_ms=gap, font=font, log=log)
            if on_progress and i % 5 == 0:
                on_progress(f"dựng clip {i}/{len(scenes)}")
        clips.append(dest)

    current = job_dir / "concat.mp4"
    ffmpeg.concat(clips, current, job_dir / "clips" / "list.txt", log=log)
    if on_progress:
        on_progress(f"nối {len(clips)} clip — {ffmpeg.duration(current) / 60:.1f} phút")

    if cfg.get("video.subtitles_burn", True) and ass_file and ass_file.exists():
        out = job_dir / "with_subs.mp4"
        burn_subtitles(current, ass_file, out, cfg, log)
        current = out
        if on_progress:
            on_progress("đã đốt phụ đề vào hình")

    if cfg.get("music.enabled", True):
        music = _pick_music(cfg)
        if music:
            out = job_dir / "with_music.mp4"
            add_music(current, music, out, cfg, log)
            current = out
            if on_progress:
                on_progress(f"trộn nhạc nền: {music.name}")
        elif on_progress:
            on_progress(f"chưa có nhạc trong {cfg.get('music.dir')} — bỏ qua")

    final = job_dir / "final.mp4"
    shutil.move(str(current), final)
    if on_progress:
        on_progress(f"xong: {final} ({ffmpeg.duration(final) / 60:.1f} phút)")
    return final
