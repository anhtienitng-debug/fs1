"""Nap cau hinh: default.yaml <- local.yaml <- bien moi truong <- --set tren CLI."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = ROOT / "config"


def _deep_merge(base: dict, over: dict) -> dict:
    out = dict(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _coerce(raw: str) -> Any:
    low = raw.lower()
    if low in ("true", "false"):
        return low == "true"
    if low in ("null", "none", ""):
        return None
    try:
        return int(raw)
    except ValueError:
        pass
    try:
        return float(raw)
    except ValueError:
        return raw


class Config:
    """Truy cap cau hinh bang duong dan co dau cham: cfg.get('tts.voice')."""

    def __init__(self, data: dict[str, Any]):
        self.data = data

    def get(self, path: str, default: Any = None) -> Any:
        node: Any = self.data
        for part in path.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    def set(self, path: str, value: Any) -> None:
        parts = path.split(".")
        node = self.data
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value

    def __getitem__(self, path: str) -> Any:
        return self.get(path)

    def to_dict(self) -> dict[str, Any]:
        return self.data


def load_config(extra: list[str] | None = None, config_file: str | None = None) -> Config:
    load_dotenv(ROOT / ".env")
    data = yaml.safe_load((CONFIG_DIR / "default.yaml").read_text(encoding="utf-8")) or {}

    local = CONFIG_DIR / "local.yaml"
    if local.exists():
        data = _deep_merge(data, yaml.safe_load(local.read_text(encoding="utf-8")) or {})
    if config_file:
        data = _deep_merge(data, yaml.safe_load(Path(config_file).read_text(encoding="utf-8")) or {})

    # Bien moi truong ghi de mot so khoa hay doi
    if os.getenv("VIENEU_BASE_URL"):
        data.setdefault("tts", {})["base_url"] = os.environ["VIENEU_BASE_URL"]

    cfg = Config(data)
    for item in extra or []:
        if "=" not in item:
            raise ValueError(f"--set can dang key=value, nhan duoc: {item!r}")
        key, raw = item.split("=", 1)
        cfg.set(key.strip(), _coerce(raw.strip()))
    return cfg


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default) or default
