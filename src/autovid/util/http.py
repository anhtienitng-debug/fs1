"""Client HTTP dung chung: co retry, timeout, va tai file co thanh tien do."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import httpx

UA = "autovid/0.1 (+https://github.com/anhtienitng-debug/fs1) python-httpx"
DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=15.0, read=60.0)


def client(**kw: Any) -> httpx.Client:
    headers = {"User-Agent": UA, **kw.pop("headers", {})}
    return httpx.Client(timeout=DEFAULT_TIMEOUT, follow_redirects=True, headers=headers, **kw)


def get_json(url: str, *, params: dict | None = None, headers: dict | None = None,
             retries: int = 3) -> Any:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            with client(headers=headers or {}) as c:
                r = c.get(url, params=params)
                if r.status_code == 429:
                    time.sleep(2 ** attempt * 2)
                    continue
                r.raise_for_status()
                return r.json()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GET {url} that bai sau {retries} lan: {last}")


def download(url: str, dest: Path, *, headers: dict | None = None, retries: int = 3) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    last: Exception | None = None
    for attempt in range(retries):
        try:
            with client(headers=headers or {}) as c, c.stream("GET", url) as r:
                r.raise_for_status()
                with tmp.open("wb") as f:
                    for chunk in r.iter_bytes(65536):
                        f.write(chunk)
            tmp.replace(dest)
            return dest
        except Exception as exc:  # noqa: BLE001
            last = exc
            tmp.unlink(missing_ok=True)
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Tai that bai {url}: {last}")
