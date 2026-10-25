"""Khung hinh do hoa tu dung: the chuong, con so lon, trich dan, danh sach.

Dung cho nhung canh khong co anh tu lieu phu hop, hoac khi noi dung chinh la mot
con so, mot moc thoi gian, mot cau trich. Moi the la mot file PNG 1920x1080 de
assemble.py dung nhu anh tinh (co Ken Burns nhe).

Mot ke hoach hinh anh (visuals.json) gan cho moi canh mot trong cac dang:
    {"photo": "ten_anh"}                      anh tu lieu da tai
    {"chart": "label so lieu"}                bieu do do charts.py ve
    {"card": "title", "eyebrow": "...", "title": "...", "sub": "...", "bg": "ten_anh"}
    {"card": "number", "eyebrow": "...", "value": "...", "caption": "..."}
    {"card": "quote", "text": "...", "source": "..."}
    {"card": "list", "eyebrow": "...", "items": [["trai", "phai"], ...]}
    {"card": "end", "title": "...", "sub": "..."}
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
BG = (20, 21, 23)
FG = (236, 233, 226)
MUTED = (160, 156, 148)
ACCENT = (201, 162, 94)     # vang dong
LACQUER = (176, 46, 42)     # do son mai

_FONT_DIRS = [Path.home() / ".local/share/fonts", Path("/usr/share/fonts/truetype"),
              Path("/usr/local/share/fonts")]


def _font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    names = {"bold": ["BeVietnamPro-Bold.ttf", "DejaVuSans-Bold.ttf"],
             "semi": ["BeVietnamPro-SemiBold.ttf", "DejaVuSans-Bold.ttf"],
             "regular": ["BeVietnamPro-Regular.ttf", "DejaVuSans.ttf"],
             "cjk": ["NotoSerifTC.ttf", "NotoSerifCJK-Bold.ttc", "NotoSansCJK-Bold.ttc"]}[weight]
    for name in names:
        for d in _FONT_DIRS:
            hits = list(d.rglob(name)) if d.exists() else []
            if hits:
                return ImageFont.truetype(str(hits[0]), size)
    return ImageFont.load_default(size)


def _has_cjk(text: str) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in text)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: Any, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split():
            trial = f"{cur} {word}".strip()
            if draw.textlength(trial, font=font) <= width:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def _canvas(bg_image: Path | None = None) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    if bg_image and bg_image.exists():
        src = Image.open(bg_image).convert("RGB")
        scale = max(W / src.width, H / src.height)
        src = src.resize((int(src.width * scale) + 1, int(src.height * scale) + 1))
        left, top = (src.width - W) // 2, (src.height - H) // 2
        src = src.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(6))
        img = Image.blend(src, img, 0.72)
    else:
        _coin_motif(img)
    return img


def _coin_motif(img: Image.Image) -> None:
    """Hoa tiet dong xu lo vuong mo o goc phai: dau nhan dien cua kenh."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy, r = int(W * 0.84), int(H * 0.40), 430
    tint = (*ACCENT, 26)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=tint, width=26)
    d.ellipse([cx - r + 70, cy - r + 70, cx + r - 70, cy + r - 70], outline=tint, width=8)
    hole = 120
    d.rectangle([cx - hole, cy - hole, cx + hole, cy + hole], outline=tint, width=22)
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))


def _eyebrow(d: ImageDraw.ImageDraw, text: str, x: int, y: int) -> int:
    if not text:
        return y
    f = _font("semi", 34)
    d.rectangle([x, y + 6, x + 56, y + 12], fill=ACCENT)
    d.text((x + 76, y - 8), text.upper(), font=f, fill=ACCENT)
    return y + 70


SAFE_BOTTOM = 200   # vung phu de o day khung hinh


def _top(block_h: int) -> int:
    return max(120, (H - SAFE_BOTTOM - block_h) // 2)


def title_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    img = _canvas(media.get(spec.get("bg", "")))
    d = ImageDraw.Draw(img)
    x = 160
    f, fs = _font("bold", 92), _font("regular", 44)
    lines = _wrap(d, spec.get("title", ""), f, W - 2 * x)
    subs = _wrap(d, spec["sub"], fs, W - 2 * x) if spec.get("sub") else []
    block = (70 if spec.get("eyebrow") else 0) + len(lines) * 112 + (20 + len(subs) * 60)
    y = _eyebrow(d, spec.get("eyebrow", ""), x, _top(block))
    for line in lines:
        d.text((x, y), line, font=f, fill=FG)
        y += 112
    y += 20
    for line in subs:
        d.text((x, y), line, font=fs, fill=MUTED)
        y += 60
    img.save(dest)
    return dest


def number_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    img = _canvas(media.get(spec.get("bg", "")))
    d = ImageDraw.Draw(img)
    x = 160
    value = spec.get("value", "")
    kind = "cjk" if _has_cjk(value) else "bold"
    f = _font(kind, 200)
    while d.textlength(value, font=f) > W - 2 * x and f.size > 80:
        f = _font(kind, f.size - 10)
    left, top, right, bottom = d.textbbox((0, 0), value, font=f)
    fc = _font("regular", 52)
    caps = _wrap(d, spec.get("caption", ""), fc, W - 2 * x)
    block = (70 if spec.get("eyebrow") else 0) + (bottom - top) + 50 + len(caps) * 70
    y = _eyebrow(d, spec.get("eyebrow", ""), x, _top(block))
    d.text((x, y - top), value, font=f, fill=FG)
    y += (bottom - top) + 50
    for line in caps:
        d.text((x, y), line, font=fc, fill=MUTED)
        y += 70
    img.save(dest)
    return dest


def quote_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    img = _canvas(media.get(spec.get("bg", "")))
    d = ImageDraw.Draw(img)
    x = 220
    f = _font("semi", 64)
    lines = _wrap(d, spec.get("text", ""), f, W - 2 * x)
    d.text((x - 130, _top(len(lines) * 88 + 100) - 90), "“", font=_font("bold", 220),
           fill=LACQUER)
    y = _top(len(lines) * 88 + 100)
    for line in lines:
        d.text((x, y), line, font=f, fill=FG)
        y += 88
    if spec.get("source"):
        d.text((x, y + 36), f"— {spec['source']}", font=_font("regular", 40), fill=ACCENT)
    img.save(dest)
    return dest


def list_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    img = _canvas(media.get(spec.get("bg", "")))
    d = ImageDraw.Draw(img)
    x = 160
    items = spec.get("items", [])
    row = 96 if len(items) <= 6 else 76
    y = _eyebrow(d, spec.get("eyebrow", ""), x, _top(len(items) * row + 70))
    fl, fr = _font("bold", 56 if row > 80 else 46), _font("regular", 48 if row > 80 else 40)
    for left, right in items:
        d.text((x, y), left, font=fl, fill=FG)
        d.text((x + 620, y + 6), right, font=fr, fill=MUTED)
        d.line([x, y + row - 18, W - x, y + row - 18], fill=(52, 52, 54), width=2)
        y += row
    img.save(dest)
    return dest


def end_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    img = _canvas(media.get(spec.get("bg", "")))
    d = ImageDraw.Draw(img)
    ft = _font("bold", 150)
    title = spec.get("title", "")
    tw = d.textlength(title, font=ft)
    d.text(((W - tw) / 2, 380), title, font=ft, fill=FG)
    d.rectangle([(W - 120) / 2, 580, (W + 120) / 2, 588], fill=ACCENT)
    fs = _font("regular", 48)
    for i, line in enumerate(_wrap(d, spec.get("sub", ""), fs, 1400)):
        lw = d.textlength(line, font=fs)
        d.text(((W - lw) / 2, 630 + i * 66), line, font=fs, fill=MUTED)
    img.save(dest)
    return dest


def overlay_card(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    """Chu dat tren anh tu lieu ro net (khong lam mo), co dai toi ben trai de doc."""
    img = Image.new("RGB", (W, H), BG)
    src_path = media.get(spec.get("bg", ""))
    if src_path and src_path.exists():
        src = Image.open(src_path).convert("RGB")
        k = max(W / src.width, H / src.height)
        src = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
        x, y = (src.width - W) // 2, (src.height - H) // 2
        img = src.crop((x, y, x + W, y + H))
    shade = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for xx in range(W):
        a = 225 if xx < W * 0.42 else max(0, int(225 * (1 - (xx - W * 0.42) / (W * 0.25))))
        sd.line([(xx, 0), (xx, H)], fill=a)
    img = Image.composite(Image.new("RGB", (W, H), BG), img, shade)
    d = ImageDraw.Draw(img)
    x, width = 120, int(W * 0.40)
    ft, fs = _font("bold", 84), _font("regular", 42)
    title = _wrap(d, spec.get("title", ""), ft, width)
    body = []
    for item in spec.get("lines", []):
        body += _wrap(d, item, fs, width) + [""]
    block = (70 if spec.get("eyebrow") else 0) + len(title) * 100 + 30 + len(body) * 56
    y = _eyebrow(d, spec.get("eyebrow", ""), x, _top(block))
    for line in title:
        d.text((x, y), line, font=ft, fill=FG)
        y += 100
    y += 30
    for line in body:
        if line:
            d.text((x, y), line, font=fs, fill=(214, 209, 199))
        y += 56 if line else 18
    if spec.get("source"):
        d.text((x, y + 10), spec["source"], font=_font("regular", 32), fill=ACCENT)
    img.save(dest)
    return dest


RENDER = {"title": title_card, "number": number_card, "quote": quote_card,
          "list": list_card, "end": end_card, "overlay": overlay_card}


def render(spec: dict, dest: Path, media: dict[str, Path]) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    return RENDER[spec["card"]](spec, dest, media)
