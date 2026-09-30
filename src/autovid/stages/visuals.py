"""Buoc 8 - Lay hinh anh va video minh hoa tu cac kho mien phi.

Uu tien cac nguon KHONG can API key, de tool chay duoc ngay sau khi cai:
    Openverse, Wikimedia Commons, NASA, Internet Archive
Pexels va Pixabay chi duoc dung neu ban tu them key (B-roll dep hon nhieu).

Moi file tai ve deu ghi lai giay to ban quyen (tac gia, giay phep, URL goc) vao
assets.json, sau do package.py xuat thanh credits.txt de dan vao mo ta video.
"""

from __future__ import annotations

import os
import re
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

from ..models import Asset, Scene
from ..util.http import download, get_json

# Giay phep chap nhan duoc cho video thuong mai
OK_LICENSES = {"cc0", "pdm", "by", "by-sa", "publicdomain", "pexels", "pixabay", "nasa"}


def _ok(license_: str, whitelist: Iterable[str]) -> bool:
    got = (license_ or "").lower()
    return any(w in got for w in whitelist)


def _slug(text: str, n: int = 40) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:n] or "asset"


# ============================================================ nguon khong key
def openverse(query: str, n: int) -> list[Asset]:
    data = get_json(
        "https://api.openverse.org/v1/images/",
        params={"q": query, "page_size": n, "license_type": "commercial",
                "mature": "false"},
    )
    out = []
    for r in data.get("results", []):
        if not r.get("url"):
            continue
        out.append(Asset(
            scene_id="", provider="Openverse", provider_id=str(r.get("id", "")),
            url=r.get("foreign_landing_url") or r["url"], local_path="", kind="photo",
            license=f"CC {r.get('license', '')} {r.get('license_version', '')}".strip(),
            license_url=r.get("license_url", ""),
            author=r.get("creator", ""), author_url=r.get("creator_url", ""),
            width=int(r.get("width") or 0), height=int(r.get("height") or 0),
        ))
        out[-1]._download_url = r["url"]  # type: ignore[attr-defined]
    return out


def wikimedia(query: str, n: int) -> list[Asset]:
    data = get_json(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}", "gsrlimit": n,
            "gsrnamespace": 6, "prop": "imageinfo",
            "iiprop": "url|size|extmetadata", "iiurlwidth": 1920,
        },
    )
    out = []
    for page in (data.get("query", {}).get("pages", {}) or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {}) or {}
        lic = (meta.get("LicenseShortName", {}).get("value", "") or "").lower()
        if "fair use" in lic or "non-free" in lic:
            continue
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        a = Asset(
            scene_id="", provider="Wikimedia Commons",
            provider_id=str(page.get("pageid", "")),
            url=info.get("descriptionurl", url), local_path="", kind="photo",
            license=meta.get("LicenseShortName", {}).get("value", "") or "unknown",
            license_url=meta.get("LicenseUrl", {}).get("value", ""),
            author=re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "") or ""),
            width=int(info.get("thumbwidth") or info.get("width") or 0),
            height=int(info.get("thumbheight") or info.get("height") or 0),
        )
        a._download_url = url  # type: ignore[attr-defined]
        out.append(a)
    return out


def nasa(query: str, n: int) -> list[Asset]:
    data = get_json("https://images-api.nasa.gov/search",
                    params={"q": query, "media_type": "image"})
    out = []
    for item in (data.get("collection", {}).get("items") or [])[:n]:
        d = (item.get("data") or [{}])[0]
        link = (item.get("links") or [{}])[0].get("href", "")
        if not link:
            continue
        a = Asset(
            scene_id="", provider="NASA", provider_id=str(d.get("nasa_id", "")),
            url=f"https://images.nasa.gov/details/{d.get('nasa_id', '')}",
            local_path="", kind="photo", license="NASA public domain",
            license_url="https://www.nasa.gov/nasa-brand-center/images-and-media/",
            author=d.get("photographer") or d.get("center") or "NASA",
        )
        a._download_url = link.replace("~thumb.jpg", "~orig.jpg")  # type: ignore[attr-defined]
        out.append(a)
    return out


def archive_video(query: str, n: int) -> list[Asset]:
    data = get_json(
        "https://archive.org/advancedsearch.php",
        params={
            "q": f'({query}) AND mediatype:(movies) AND licenseurl:(*creativecommons*)',
            "fl[]": "identifier", "rows": n, "output": "json",
        },
    )
    out = []
    for doc in (data.get("response", {}).get("docs") or [])[:n]:
        ident = doc.get("identifier")
        if not ident:
            continue
        try:
            meta = get_json(f"https://archive.org/metadata/{ident}")
        except Exception:  # noqa: BLE001
            continue
        files = [f for f in meta.get("files", [])
                 if (f.get("name", "").lower().endswith((".mp4", ".webm")))]
        if not files:
            continue
        files.sort(key=lambda f: int(f.get("size") or 0), reverse=True)
        f = files[0]
        m = meta.get("metadata", {})
        a = Asset(
            scene_id="", provider="Internet Archive", provider_id=ident,
            url=f"https://archive.org/details/{ident}", local_path="", kind="video",
            license=m.get("licenseurl", "public domain / CC"),
            license_url=m.get("licenseurl", ""), author=m.get("creator", "") or "",
        )
        a._download_url = f"https://archive.org/download/{ident}/{f['name']}"  # type: ignore[attr-defined]
        out.append(a)
    return out


# ================================================================ nguon co key
def pexels_photo(query: str, n: int) -> list[Asset]:
    key = os.getenv("PEXELS_API_KEY", "")
    if not key:
        return []
    data = get_json("https://api.pexels.com/v1/search",
                    params={"query": query, "per_page": n, "orientation": "landscape"},
                    headers={"Authorization": key})
    out = []
    for p in data.get("photos", []):
        a = Asset(scene_id="", provider="Pexels", provider_id=str(p.get("id")),
                  url=p.get("url", ""), local_path="", kind="photo",
                  license="Pexels License",
                  license_url="https://www.pexels.com/license/",
                  author=p.get("photographer", ""),
                  author_url=p.get("photographer_url", ""),
                  width=int(p.get("width") or 0), height=int(p.get("height") or 0))
        a._download_url = (p.get("src") or {}).get("original", "")  # type: ignore[attr-defined]
        out.append(a)
    return out


def pexels_video(query: str, n: int) -> list[Asset]:
    key = os.getenv("PEXELS_API_KEY", "")
    if not key:
        return []
    data = get_json("https://api.pexels.com/videos/search",
                    params={"query": query, "per_page": n, "orientation": "landscape"},
                    headers={"Authorization": key})
    out = []
    for v in data.get("videos", []):
        files = sorted(v.get("video_files", []),
                       key=lambda f: int(f.get("width") or 0), reverse=True)
        hd = next((f for f in files if int(f.get("width") or 0) <= 1920), None) or (
            files[0] if files else None)
        if not hd:
            continue
        a = Asset(scene_id="", provider="Pexels", provider_id=str(v.get("id")),
                  url=v.get("url", ""), local_path="", kind="video",
                  license="Pexels License",
                  license_url="https://www.pexels.com/license/",
                  author=(v.get("user") or {}).get("name", ""),
                  author_url=(v.get("user") or {}).get("url", ""),
                  width=int(hd.get("width") or 0), height=int(hd.get("height") or 0),
                  duration=float(v.get("duration") or 0))
        a._download_url = hd.get("link", "")  # type: ignore[attr-defined]
        out.append(a)
    return out


def pixabay_photo(query: str, n: int) -> list[Asset]:
    key = os.getenv("PIXABAY_API_KEY", "")
    if not key:
        return []
    data = get_json("https://pixabay.com/api/",
                    params={"key": key, "q": query, "image_type": "photo",
                            "per_page": max(n, 3), "min_width": 1920, "safesearch": "true"})
    out = []
    for h in data.get("hits", []):
        a = Asset(scene_id="", provider="Pixabay", provider_id=str(h.get("id")),
                  url=h.get("pageURL", ""), local_path="", kind="photo",
                  license="Pixabay Content License",
                  license_url="https://pixabay.com/service/license-summary/",
                  author=h.get("user", ""),
                  width=int(h.get("imageWidth") or 0), height=int(h.get("imageHeight") or 0))
        a._download_url = h.get("largeImageURL", "")  # type: ignore[attr-defined]
        out.append(a)
    return out


def pixabay_video(query: str, n: int) -> list[Asset]:
    key = os.getenv("PIXABAY_API_KEY", "")
    if not key:
        return []
    data = get_json("https://pixabay.com/api/videos/",
                    params={"key": key, "q": query, "per_page": max(n, 3)})
    out = []
    for h in data.get("hits", []):
        v = (h.get("videos") or {}).get("large") or (h.get("videos") or {}).get("medium") or {}
        if not v.get("url"):
            continue
        a = Asset(scene_id="", provider="Pixabay", provider_id=str(h.get("id")),
                  url=h.get("pageURL", ""), local_path="", kind="video",
                  license="Pixabay Content License",
                  license_url="https://pixabay.com/service/license-summary/",
                  author=h.get("user", ""),
                  width=int(v.get("width") or 0), height=int(v.get("height") or 0),
                  duration=float(h.get("duration") or 0))
        a._download_url = v["url"]  # type: ignore[attr-defined]
        out.append(a)
    return out


PROVIDERS = {
    "openverse": openverse,
    "wikimedia": wikimedia,
    "nasa": nasa,
    "archive_video": archive_video,
    "pexels_photo": pexels_photo,
    "pexels_video": pexels_video,
    "pixabay_photo": pixabay_photo,
    "pixabay_video": pixabay_video,
}


# ==================================================================== stage
def _candidates(query: str, kind: str, cfg: Any) -> list[Asset]:
    order = list(cfg.get("visuals.sources", list(PROVIDERS)))
    if kind == "video":
        order.sort(key=lambda s: 0 if "video" in s or s == "archive_video" else 1)
    elif kind == "photo":
        order.sort(key=lambda s: 1 if "video" in s or s == "archive_video" else 0)
    n = cfg.get("visuals.per_scene_candidates", 6)
    white = cfg.get("visuals.license_whitelist", list(OK_LICENSES))

    found: list[Asset] = []
    for name in order:
        fn = PROVIDERS.get(name)
        if not fn:
            continue
        try:
            hits = fn(query, n)
        except Exception:  # noqa: BLE001 - mot nguon hong khong duoc lam chet pipeline
            continue
        found += [a for a in hits
                  if getattr(a, "_download_url", "") and _ok(a.license, white)]
        if len(found) >= n:
            break
    return found


def _pick(cands: list[Asset], min_width: int) -> Asset | None:
    if not cands:
        return None
    big = [a for a in cands if not a.width or a.width >= min_width]
    pool = big or cands
    return max(pool, key=lambda a: (a.width or 0) * (a.height or 0))


def run(
    scenes: list[Scene],
    cfg: Any,
    media_dir: Path,
    *,
    force: bool = False,
    on_progress: Callable[[str], None] | None = None,
) -> tuple[list[Scene], list[Asset]]:
    min_w = cfg.get("visuals.min_width", 1920)
    ratio = cfg.get("visuals.prefer_video_ratio", 0.55)
    assets: list[Asset] = []
    missing = 0

    for i, scene in enumerate(scenes, 1):
        if scene.visual_kind in ("chart", "map"):
            continue  # charts.py lo
        if scene.media_path and Path(scene.media_path).exists() and not force:
            continue

        kind = scene.visual_kind
        if kind == "auto":
            kind = "video" if (i / max(len(scenes), 1)) % 1 < ratio else "photo"

        cands = _candidates(scene.visual_query, kind, cfg)
        if not cands and scene.chapter not in ("HOOK", "OUTRO"):
            cands = _candidates(scene.chapter, kind, cfg)  # thu lai bang ten chuong
        chosen = _pick(cands, min_w)
        if not chosen:
            missing += 1
            if on_progress:
                on_progress(f"[{i}/{len(scenes)}] {scene.id}: không tìm được hình cho "
                            f"«{scene.visual_query}»")
            continue

        url = chosen._download_url
        ext = Path(url.split("?")[0]).suffix or (".mp4" if chosen.kind == "video" else ".jpg")
        dest = media_dir / f"{scene.id}-{_slug(chosen.provider)}{ext}"
        try:
            download(url, dest)
        except Exception as exc:  # noqa: BLE001
            missing += 1
            if on_progress:
                on_progress(f"[{i}/{len(scenes)}] {scene.id}: tải lỗi ({exc})")
            continue

        chosen.scene_id = scene.id
        chosen.local_path = str(dest)
        scene.media_path = str(dest)
        scene.visual_kind = chosen.kind
        assets.append(chosen)
        if on_progress and i % 5 == 0:
            on_progress(f"[{i}/{len(scenes)}] đã lấy {len(assets)} file")

    if on_progress:
        on_progress(f"lấy được {len(assets)} file, thiếu {missing} cảnh "
                    "(sẽ dùng nền màu + chữ)")
    return scenes, assets
