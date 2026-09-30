"""Mot 'job' = mot thu muc chua toan bo san pham trung gian cua 1 video.

Nho vay pipeline chay lai duoc tu bat ky buoc nao ma khong lam lai buoc truoc
(tiet kiem tien LLM va thoi gian TTS), va nguoi dung xem/sua duoc tung buoc.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ROOT

STAGES = [
    "ingest",
    "research",
    "script",
    "scenes",
    "tts",
    "align",
    "visuals",
    "charts",
    "assemble",
    "package",
]


def slugify(text: str, maxlen: int = 50) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:maxlen] or "video"


class Job:
    def __init__(self, path: Path):
        self.path = path
        self.path.mkdir(parents=True, exist_ok=True)
        for sub in ("media", "audio", "charts", "clips", "logs"):
            (self.path / sub).mkdir(exist_ok=True)
        self._state_file = self.path / "state.json"
        self.state: dict[str, Any] = (
            json.loads(self._state_file.read_text(encoding="utf-8"))
            if self._state_file.exists()
            else {"created": datetime.now(timezone.utc).isoformat(), "stages": {}, "approved": []}
        )

    # ---------- tao / mo ----------
    @classmethod
    def create(cls, url: str, title_hint: str = "", jobs_dir: Path | None = None) -> "Job":
        base = jobs_dir or ROOT / "jobs"
        stamp = datetime.now().strftime("%Y%m%d-%H%M")
        name = f"{stamp}-{slugify(title_hint or url.rsplit('/', 1)[-1])}"
        job = cls(base / name)
        job.state["url"] = url
        job.save()
        return job

    @classmethod
    def open(cls, ref: str, jobs_dir: Path | None = None) -> "Job":
        base = jobs_dir or ROOT / "jobs"
        p = Path(ref)
        if p.is_dir():
            return cls(p)
        if (base / ref).is_dir():
            return cls(base / ref)
        if ref in ("latest", "last"):
            dirs = sorted((d for d in base.iterdir() if d.is_dir()), key=lambda d: d.name)
            if dirs:
                return cls(dirs[-1])
        raise FileNotFoundError(f"Khong tim thay job: {ref}")

    # ---------- state ----------
    def save(self) -> None:
        self._state_file.write_text(
            json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def mark(self, stage: str, **info: Any) -> None:
        self.state.setdefault("stages", {})[stage] = {
            "done": True,
            "at": datetime.now(timezone.utc).isoformat(),
            **info,
        }
        self.save()

    def done(self, stage: str) -> bool:
        return bool(self.state.get("stages", {}).get(stage, {}).get("done"))

    def approve(self, gate: str) -> None:
        if gate not in self.state.setdefault("approved", []):
            self.state["approved"].append(gate)
        self.save()

    def is_approved(self, gate: str) -> bool:
        return gate in self.state.get("approved", [])

    # ---------- file helper ----------
    def file(self, *parts: str) -> Path:
        return self.path.joinpath(*parts)

    def write_json(self, name: str, data: Any) -> Path:
        p = self.file(name)
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        return p

    def read_json(self, name: str) -> Any:
        return json.loads(self.file(name).read_text(encoding="utf-8"))

    def write_text(self, name: str, text: str) -> Path:
        p = self.file(name)
        p.write_text(text, encoding="utf-8")
        return p

    def has(self, name: str) -> bool:
        return self.file(name).exists()

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Job {self.path.name}>"
