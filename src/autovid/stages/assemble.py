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
        str(Path.home() / ".local/share/fonts/BeVietnamPro-SemiBold.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return ""


def _aspect(path: str) -> float:
    try:
        from PIL import Image
        with Image.open(path) as im:
            return im.width / max(im.height, 1)
    except Exception:  # noqa: BLE001
        return 16 / 9


def _is_card(path: str) -> bool:
    return Path(path).parent.name == "cards"


def _compose(media: str, w: int, h: int, tol: float) -> Any:
    """Anh nguon o 2x do phan giai. Anh doc/vuong (dong xu, to tien) giu tron
    tren nen mo cua chinh no, thay vi bi cat mat phan lon noi dung."""
    from PIL import Image, ImageEnhance, ImageFilter

    W, H = w * 2, h * 2
    src = Image.open(media).convert("RGB")

    def cover(im: Any) -> Any:
        k = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        x, y = (im.width - W) // 2, (im.height - H) // 2
        return im.crop((x, y, x + W, y + H))

    if abs(src.width / src.height - w / h) <= tol:
        return cover(src)
    bg = cover(src).filter(ImageFilter.GaussianBlur(60))
    bg = ImageEnhance.Brightness(bg).enhance(0.55)
    k = min(W * 0.9 / src.width, H * 0.9 / src.height)
    fg = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return bg


def kenburns(media: str, dest: Path, *, dur: float, cfg: Any, seed: str = "",
             log: Path | None = None) -> Path:
    """Ken Burns muot: moi khung hinh cat bang toa do thuc (duoi 1 pixel) roi noi
    suy bicubic, nen khong bi giat nhu zoompan (von lam tron vi tri theo pixel)."""
    import math
    import subprocess
    import zlib

    from PIL import Image

    w, h = cfg.get("video.resolution", [1920, 1080])
    fps = int(cfg.get("video.fps", 30))
    zoom = float(cfg.get("video.kenburns_zoom", 0.06))
    frames = max(int(round(dur * fps)), 1)
    src = _compose(media, w, h, cfg.get("video.fit_tolerance", 0.3))
    # Anh nguon o 2x roi thu ve 1x: lam mem ~1px truoc de khong nhap nhay (moire)
    # o ban in luoi cham va hat phim khi zoom cham
    from PIL import ImageFilter
    src = src.filter(ImageFilter.GaussianBlur(cfg.get("video.kenburns_prefilter", 0.9)))
    W, H = src.size
    rnd = zlib.crc32(seed.encode())
    zoom_in = rnd % 2 == 0
    pan = ((rnd >> 1) % 3 - 1) * 0.04 * W   # trai / dung / phai

    proc = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
         "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p",
         str(dest)],
        stdin=subprocess.PIPE, stderr=open(log, "ab") if log else subprocess.DEVNULL,
    )
    try:
        for k in range(frames):
            p = k / max(frames - 1, 1)
            e = 0.5 - 0.5 * math.cos(math.pi * p)          # cham dau, cham cuoi
            # luon phong to toi thieu 4% de con le cho truot ngang; kep tam khung
            # de mep anh khong bao gio lot vao (truoc day lo dai den 16-40 px)
            z = 1.04 + zoom * (e if zoom_in else 1 - e)
            bw, bh = W / z, H / z
            cx = min(max(W / 2 + pan * (e - 0.5), bw / 2), W - bw / 2)
            cy = H / 2
            box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
            frame = src.transform((w, h), Image.Transform.EXTENT, box,
                                  resample=Image.Resampling.BICUBIC)
            proc.stdin.write(frame.tobytes())
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode:
        raise RuntimeError(f"ffmpeg loi khi dung Ken Burns cho {media}")
    return dest


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
    fade = 0.25
    dur = scene.duration + gap_ms / 1000.0

    args: list[str] = []
    media = scene.media_path

    if media and Path(media).exists() and _is_image(media):
        if _is_card(media):
            # The chu dung yen: zoom chu chi lam nhoe chu
            args += ["-loop", "1", "-framerate", fps, "-t", f"{dur:.3f}", "-i", media]
            vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:-1:-1"
        else:
            moving = dest.with_suffix(".motion.mp4")
            kenburns(media, moving, dur=dur, cfg=cfg, seed=scene.id, log=log)
            args += ["-i", str(moving)]
            vf = "null"
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

    if font and scene.on_screen_text and cfg.get("video.label_style") == "corner":
        # Nhan nguon tu lieu nho o goc duoi trai, kieu phim tai lieu
        vf += (
            f",drawtext=fontfile='{font}':text='{_esc(scene.on_screen_text)}':"
            f"fontcolor=white@0.85:fontsize={int(h * 0.022)}:box=1:"
            f"boxcolor=0x000000@0.45:boxborderw=12:x={int(w * 0.035)}:y=h-{int(h * 0.075)}"
        )
    elif font and scene.on_screen_text:
        vf += (
            f",drawtext=fontfile='{font}':text='{_esc(scene.on_screen_text)}':"
            f"fontcolor=white:fontsize={int(h * 0.042)}:box=1:boxcolor=0x000000AA:"
            f"boxborderw=24:x=(w-text_w)/2:y=h-{int(h * 0.20)}:"
            f"enable='between(t,0.6,{max(dur - 0.6, 1.2):.2f})'"
        )
    if "motion" not in Path(media or "").parts:  # hieu ung lien canh: khong nhay den
        vf += f",fade=t=in:st=0:d={fade},fade=t=out:st={max(dur - fade, 0):.3f}:d={fade}"
    vf += ",format=yuv420p"

    # Audio: loi doc cua canh + khoang lang cuoi canh
    args += ["-i", scene.audio_path] if scene.audio_path else [
        "-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"
    ]
    af = f"aresample=48000,apad,atrim=0:{dur:.3f},aformat=channel_layouts=stereo"

    if scene.callout or scene.chapter_tag:
        raw = dest.with_suffix(".raw.mp4")
        _encode(args, vf, af, cfg, dur, raw, log)
        if scene.chapter_tag:
            tagged = dest.with_suffix(".tag.mp4")
            add_chapter_tag(raw, scene.chapter_tag, tagged, dur=dur, log=log)
            raw.unlink(missing_ok=True)
            raw = tagged
        if scene.callout:
            add_callout(raw, scene.callout, dest, dur=dur, log=log)
            raw.unlink(missing_ok=True)
        else:
            raw.replace(dest)
        return dest
    _encode(args, vf, af, cfg, dur, dest, log)
    return dest


def _encode(args: list, vf: str, af: str, cfg: Any, dur: float, dest: Path,
            log: Path | None) -> None:
    fps = cfg.get("video.fps", 30)
    crf = cfg.get("video.crf", 19)
    preset = cfg.get("video.preset", "medium")
    ffmpeg.run(
        [*[str(a) for a in args],
         "-vf", vf, "-af", af,
         "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
         "-r", str(fps), "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
         "-t", f"{dur:.3f}", "-shortest", str(dest)],
        log=log,
    )


def callout_png(text: str, dest: Path) -> Path:
    """The "LY DO" kieu thanh ngang hien dai: nen toi, vach mau son, chu trang."""
    from PIL import Image, ImageDraw

    from .cards import ACCENT, LACQUER, _font, _wrap
    fe, ft = _font("semi", 26), _font("semi", 40)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    lines = _wrap(probe, text, ft, 1100)
    w = int(max(probe.textlength(ln, font=ft) for ln in lines)) + 110
    h = 70 + 54 * len(lines) + 28
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=14, fill=(14, 15, 18, 232))
    d.rectangle([0, 0, 10, h], fill=(*LACQUER, 255))
    d.text((44, 22), "LÝ DO", font=fe, fill=(*ACCENT, 255))
    y = 62
    for ln in lines:
        d.text((44, y), ln, font=ft, fill=(240, 236, 228, 255))
        y += 54
    img.save(dest)
    return dest


def add_chapter_tag(src: Path, text: str, dest: Path, *, dur: float,
                    log: Path | None = None) -> Path:
    """The ten chuong kieu phim tai lieu: hien 0,4-4 giay dau, goc tren trai."""
    from PIL import Image, ImageDraw

    from .cards import ACCENT, _font
    f = _font("semi", 34)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    w = int(probe.textlength(text, font=f)) + 70
    img = Image.new("RGBA", (w, 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, 69], radius=10, fill=(14, 15, 18, 215))
    d.rectangle([0, 0, 8, 70], fill=(*ACCENT, 255))
    d.text((32, 14), text, font=f, fill=(240, 236, 228, 255))
    png = src.with_suffix(".tag.png")
    img.save(png)
    end = min(4.2, dur - 0.3)
    ffmpeg.run(
        ["-i", str(src), "-loop", "1", "-i", str(png),
         "-filter_complex",
         f"[1]format=rgba,fade=t=in:st=0.4:d=0.4:alpha=1,"
         f"fade=t=out:st={max(end - 0.4, 0.8):.2f}:d=0.4:alpha=1[c];"
         f"[0][c]overlay=x=90:y=80:shortest=1:format=auto,format=yuv420p",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy",
         "-t", f"{dur:.3f}", str(dest)],
        log=log,
    )
    png.unlink(missing_ok=True)
    return dest


def add_callout(src: Path, text: str, dest: Path, *, dur: float,
                log: Path | None = None) -> Path:
    png = callout_png(text, src.with_suffix(".callout.png"))
    t0 = max(0.6, dur - 4.8)
    slide = (f"if(lt(t,{t0:.2f}),-w,-w+(w+90)*(1-pow(1-min(1,(t-{t0:.2f})/0.6),3)))")
    ffmpeg.run(
        ["-i", str(src), "-loop", "1", "-i", str(png),
         "-filter_complex",
         f"[1]format=rgba[c];[0][c]overlay=x='{slide}':y=H-h-110:shortest=1:format=auto,"
         f"format=yuv420p",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy",
         "-t", f"{dur:.3f}", str(dest)],
        log=log,
    )
    png.unlink(missing_ok=True)
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
