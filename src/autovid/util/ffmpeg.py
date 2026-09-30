"""Bao quanh ffmpeg/ffprobe. Tat ca thao tac video deu di qua day."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


class FFmpegMissing(RuntimeError):
    pass


def require(bin_name: str = "ffmpeg") -> str:
    path = shutil.which(bin_name)
    if not path:
        raise FFmpegMissing(
            f"Khong tim thay `{bin_name}`. Cai dat:\n"
            "  Ubuntu/Debian : sudo apt install ffmpeg\n"
            "  macOS         : brew install ffmpeg\n"
            "  Windows       : winget install Gyan.FFmpeg"
        )
    return path


def run(args: list[str], *, quiet: bool = True, log: Path | None = None) -> None:
    cmd = [require("ffmpeg"), "-hide_banner", "-nostdin", "-y", *args]
    if quiet:
        cmd[3:3] = ["-loglevel", "error"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if log:
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as f:
            f.write(f"$ {' '.join(cmd)}\n{proc.stderr}\n")
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-25:])
        raise RuntimeError(f"ffmpeg loi (ma {proc.returncode}):\n{tail}")


def probe(path: Path | str) -> dict:
    out = subprocess.run(
        [require("ffprobe"), "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError(f"ffprobe loi tren {path}: {out.stderr[:400]}")
    return json.loads(out.stdout)


def duration(path: Path | str) -> float:
    info = probe(path)
    try:
        return float(info["format"]["duration"])
    except (KeyError, ValueError):
        for s in info.get("streams", []):
            if s.get("duration"):
                return float(s["duration"])
    return 0.0


def dimensions(path: Path | str) -> tuple[int, int]:
    for s in probe(path).get("streams", []):
        if s.get("codec_type") == "video":
            return int(s.get("width", 0)), int(s.get("height", 0))
    return 0, 0


def has_audio(path: Path | str) -> bool:
    return any(s.get("codec_type") == "audio" for s in probe(path).get("streams", []))


def concat(clips: list[Path], out: Path, listfile: Path, *, log: Path | None = None) -> Path:
    """Noi cac clip da chuan hoa cung codec bang demuxer concat (nhanh, khong re-encode)."""
    listfile.write_text(
        "\n".join(f"file '{c.resolve().as_posix()}'" for c in clips), encoding="utf-8"
    )
    run(["-f", "concat", "-safe", "0", "-i", str(listfile), "-c", "copy", str(out)], log=log)
    return out
