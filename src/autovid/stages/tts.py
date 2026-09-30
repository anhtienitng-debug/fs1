"""Buoc 6 - Doc kich ban bang VieNeu-TTS, giong Pham Tuyen.

Ket noi qua server tuong thich OpenAI cua VieNeu (apps/openai_speech):
    POST {base_url}/v1/audio/speech
Chay server truoc:
    cd VieNeu-TTS && uv run python -m apps.openai_speech

Moi canh ra mot file wav rieng trong audio/. Nho vay sua mot canh khong phai
doc lai ca video. Trong mot canh, van ban duoc chia nho theo gioi han max_chars
cua server roi noi lai kem khoang lang ngan cho tu nhien.
"""

from __future__ import annotations

import io
import wave
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx

from ..models import Scene
from ..util.text import chunk_for_tts, prepare_for_tts


class TTSUnavailable(RuntimeError):
    pass


class VieNeuClient:
    def __init__(self, cfg: Any):
        self.base = (cfg.get("tts.base_url") or "http://127.0.0.1:8000").rstrip("/")
        self.voice = cfg.get("tts.voice", "Phạm Tuyên")
        self.sample_rate = cfg.get("tts.sample_rate", 48000)
        self.max_chars = cfg.get("tts.max_chars", 256)
        self.params = {
            "temperature": cfg.get("tts.temperature", 0.7),
            "top_k": cfg.get("tts.top_k", 25),
            "top_p": cfg.get("tts.top_p", 0.95),
            "repetition_penalty": cfg.get("tts.repetition_penalty", 1.2),
        }
        speed = cfg.get("tts.speed", 1.0)
        if speed and abs(speed - 1.0) > 1e-3:
            self.params["speed"] = speed
        import os
        self.key = os.getenv("VIENEU_API_KEY", "")

    # ---------------------------------------------------------------- health
    def health(self) -> None:
        try:
            with httpx.Client(timeout=10.0) as c:
                r = c.get(f"{self.base}/health")
                r.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            raise TTSUnavailable(
                f"Không kết nối được VieNeu-TTS tại {self.base}.\n"
                "Khởi động server trước:\n"
                "  cd VieNeu-TTS && uv run python -m apps.openai_speech\n"
                f"Chi tiết: {exc}"
            ) from exc

    def voices(self) -> list[str]:
        with httpx.Client(timeout=30.0) as c:
            r = c.get(f"{self.base}/v1/voices", headers=self._headers())
            r.raise_for_status()
            data = r.json()
        items = data.get("data", data) if isinstance(data, dict) else data
        out = []
        for v in items or []:
            out.append(v if isinstance(v, str) else (v.get("id") or v.get("name") or ""))
        return [v for v in out if v]

    def check_voice(self) -> None:
        try:
            available = self.voices()
        except Exception:  # noqa: BLE001 - endpoint co the khong co, bo qua
            return
        if available and self.voice not in available:
            raise TTSUnavailable(
                f"Giọng {self.voice!r} không có trên server.\n"
                f"Các giọng hiện có: {', '.join(available)}"
            )

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.key}"} if self.key else {}

    # ----------------------------------------------------------------- doc
    def speak(self, text: str, *, retries: int = 3) -> bytes:
        payload = {
            "input": text,
            "voice": self.voice,
            "response_format": "wav",
            "sample_rate": self.sample_rate,
            "max_chars": self.max_chars,
            **self.params,
        }
        last: Exception | None = None
        for attempt in range(retries):
            try:
                with httpx.Client(timeout=300.0) as c:
                    r = c.post(
                        f"{self.base}/v1/audio/speech",
                        json=payload,
                        headers={**self._headers(), "Content-Type": "application/json"},
                    )
                    r.raise_for_status()
                    return r.content
            except Exception as exc:  # noqa: BLE001
                last = exc
                import time
                time.sleep(2 ** attempt)
        raise TTSUnavailable(f"TTS thất bại cho đoạn {text[:60]!r}: {last}")


# --------------------------------------------------------------- ghep wav
def _read_wav(data: bytes) -> tuple[bytes, int, int, int]:
    with wave.open(io.BytesIO(data), "rb") as w:
        return w.readframes(w.getnframes()), w.getnchannels(), w.getsampwidth(), w.getframerate()


def _silence(ms: int, channels: int, width: int, rate: int) -> bytes:
    return b"\x00" * int(rate * ms / 1000) * channels * width


def join_wav(parts: list[bytes], gap_ms: int, dest: Path) -> float:
    frames: list[bytes] = []
    channels = width = rate = 0
    for i, p in enumerate(parts):
        f, channels, width, rate = _read_wav(p)
        if i:
            frames.append(_silence(gap_ms, channels, width, rate))
        frames.append(f)
    if not frames:
        raise TTSUnavailable("Không có dữ liệu âm thanh để ghép")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(dest), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(b"".join(frames))
    total = sum(len(f) for f in frames)
    return total / (rate * channels * width)


# ------------------------------------------------------------------- stage
def run(
    scenes: list[Scene],
    cfg: Any,
    audio_dir: Path,
    *,
    force: bool = False,
    on_progress: Callable[[str], None] | None = None,
) -> list[Scene]:
    tts = VieNeuClient(cfg)
    tts.health()
    tts.check_voice()

    gap = cfg.get("tts.pause_between_scenes_ms", 450)
    keep_tags = cfg.get("tts.allow_emotion_tags", True)
    intra_gap = 120

    clock = 0.0
    for i, scene in enumerate(scenes, 1):
        dest = audio_dir / f"{scene.id}.wav"
        if dest.exists() and not force:
            scene.audio_path = str(dest)
            scene.duration = _duration(dest)
        else:
            text = prepare_for_tts(scene.narration, keep_tags=keep_tags)
            chunks = chunk_for_tts(text, tts.max_chars)
            parts = [tts.speak(c) for c in chunks]
            scene.duration = join_wav(parts, intra_gap, dest)
            scene.audio_path = str(dest)
            if on_progress:
                on_progress(
                    f"[{i}/{len(scenes)}] {scene.id} — {len(chunks)} đoạn, "
                    f"{scene.duration:.1f}s"
                )
        scene.start = clock
        clock += scene.duration + gap / 1000.0

    if on_progress:
        on_progress(f"tổng thời lượng lời đọc: {clock / 60:.1f} phút")
    return scenes


def _duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())
