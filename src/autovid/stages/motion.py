"""Bieu do chuyen dong (motion graphics) ve bang PIL, xuat thanh clip mp4.

Ve o 2x do phan giai roi thu nho tung khung de net va khong rang cua. Ba dang:
    timeline  - truc thoi gian nhieu thoi ky, cac moc hien len theo loi doc
    bars      - cot moc dan len, so dem chay
    line      - duong ve dan, vung to mau, cham cuoi nhap nhay

Mot hieu ung co the trai qua nhieu canh lien tiep (vd ca chuong mo dau): ve mot
clip dai roi cat theo moc thoi gian cua tung canh, nen chuyen dong lien mach.
"""

from __future__ import annotations

import math
import subprocess
from collections.abc import Callable
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from .cards import _font

S = 2                              # he so ve (supersampling)
W, H = 1920 * S, 1080 * S
BG = (14, 15, 18)
GRID = (36, 38, 44)
FG = (238, 234, 226)
MUTED = (150, 148, 142)
GOLD = (201, 162, 94)
RED = (196, 64, 56)
JADE = (72, 150, 128)
ERA_COLORS = [(52, 58, 72), (90, 72, 40), (70, 84, 62), (88, 52, 48), (40, 74, 92)]


def ease(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * t)


def ease_out(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def f(weight: str, size: int) -> Any:
    return _font(weight, size * S)


def _mix(c1: tuple, c2: tuple, a: float) -> tuple:
    return tuple(int(c1[i] + (c2[i] - c1[i]) * a) for i in range(3))


def _text_c(d: ImageDraw.ImageDraw, xy: tuple, text: str, font: Any, fill: tuple) -> None:
    w = d.textlength(text, font=font)
    d.text((xy[0] - w / 2, xy[1]), text, font=font, fill=fill)


def _title(d: ImageDraw.ImageDraw, title: str, sub: str, a: float) -> None:
    col = _mix(BG, FG, a)
    d.text((120 * S, 80 * S), title, font=f("bold", 58), fill=col)
    if sub:
        d.text((120 * S, 160 * S), sub, font=f("regular", 32), fill=_mix(BG, MUTED, a))
    d.rectangle([120 * S, 60 * S, 170 * S, 66 * S], fill=_mix(BG, GOLD, a))


# ------------------------------------------------------------------ timeline
def _year_x(year: float, spec: dict) -> float:
    """Truc thoi gian chia doan: thoi ky dai bi nen, giai doan day moc duoc gian ra."""
    x0, x1 = 140 * S, W - 140 * S
    segs = spec.get("segments") or [[spec.get("start", 900), spec.get("end", 2030), 1.0]]
    total = sum(s[2] for s in segs)
    acc = 0.0
    for a, b, wgt in segs:
        if year <= b or (a, b, wgt) == tuple(segs[-1]):
            frac = (acc + wgt * (min(max(year, a), b) - a) / (b - a)) / total
            return x0 + (x1 - x0) * frac
        acc += wgt
    return x1


def _background(spec: dict) -> Image.Image:
    """Nen: anh tu lieu mo va toi (neu co), de bieu do nam tren tu lieu that."""
    if "_bg" not in spec:
        img = Image.new("RGB", (W, H), BG)
        path = spec.get("bg_path")
        if path and Path(path).exists():
            from PIL import ImageFilter
            src = Image.open(path).convert("RGB")
            k = max(W / src.width, H / src.height)
            src = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
            x, y = (src.width - W) // 2, (src.height - H) // 2
            src = src.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(3 * S))
            img = Image.blend(src, img, spec.get("bg_dim", 0.8))
        spec["_bg"] = img
    return spec["_bg"].copy()


def timeline_frame(spec: dict, t: float, dur: float) -> Image.Image:
    img = _background(spec)
    d = ImageDraw.Draw(img)
    axis_y = int(H * 0.50)
    sweep = spec.get("sweep_end", 0.85)       # ty le thoi luong de quet het truc
    p = ease(t / (dur * sweep))
    _title(d, spec.get("title", ""), spec.get("subtitle", ""), ease_out(t / 0.8))

    start, end = spec["segments"][0][0], spec["segments"][-1][1]
    head_year = start + (end - start) * p
    keys = spec.get("keyframes")             # [(giay, nam)]: dau quet bam theo loi doc
    if keys:
        head_year = keys[-1][1]
        for (ta, ya), (tb, yb) in zip(keys, keys[1:], strict=False):
            if t <= tb:
                head_year = ya + (yb - ya) * ease((t - ta) / max(tb - ta, 1e-6))
                break
        p = 1.0 if head_year >= end else 0.0
    head_x = _year_x(head_year, spec)

    # dai thoi ky
    for i, era in enumerate(spec.get("eras", [])):
        ex0, ex1 = _year_x(era["from"], spec), _year_x(era["to"], spec)
        if head_x <= ex0:
            continue
        vis = min(ex1, head_x)
        if vis - ex0 < 10 * S:      # dai moi nho ra, chua du rong de ve
            continue
        col = ERA_COLORS[i % len(ERA_COLORS)]
        d.rounded_rectangle([ex0 + 3 * S, axis_y - 26 * S, vis - 3 * S, axis_y + 26 * S],
                            radius=10 * S, fill=col)
        if vis - ex0 > 80 * S:
            lab = era["label"]
            fl = f("semi", 22)
            pad = era.get("pad", 14) * S
            while d.textlength(lab, font=fl) > (ex1 - ex0) - 2 * pad and fl.size > 12 * S:
                fl = _font("semi", fl.size - 2 * S)
            tw = d.textlength(lab, font=fl)
            lx = ex1 - tw - pad if era.get("align") == "right" else ex0 + pad
            if era.get("align") != "right" or vis >= ex1:
                d.text((lx, axis_y - 14 * S), lab, font=fl, fill=FG)

    # dau ngat: noi ty le truc thay doi
    for seg in spec["segments"][1:]:
        bx = _year_x(seg[0], spec)
        if bx <= head_x:
            for off in (-7, 7):
                d.line([bx + off * S - 6 * S, axis_y + 36 * S, bx + off * S + 6 * S,
                        axis_y + 22 * S], fill=MUTED, width=2 * S)

    # vach nam
    for y in spec.get("ticks", []):
        x = _year_x(y, spec)
        if x <= head_x:
            d.line([x, axis_y + 34 * S, x, axis_y + 44 * S], fill=MUTED, width=2 * S)
            _text_c(d, (x, axis_y + 50 * S), str(y), f("regular", 22), MUTED)

    # cac moc
    fe = f("bold", 30)
    fs = f("regular", 22)
    for i, ev in enumerate(spec.get("events", [])):
        x = _year_x(ev["year"], spec)
        shown_at = ev.get("at")
        if shown_at is None:
            if x > head_x:
                continue
            k = 1.0
        else:
            k = ease_out((t - shown_at) / 0.5)
            if k <= 0:
                continue
        up = ev.get("side", "up" if i % 2 == 0 else "down") == "up"
        level = ev.get("level", 0)
        stem = (110 + 75 * level) * S
        y_end = axis_y - stem if up else axis_y + stem
        col = RED if ev.get("reset") else GOLD
        cur_end = axis_y + (y_end - axis_y) * k
        d.line([x, axis_y, x, cur_end], fill=_mix(BG, col, 0.8), width=3 * S)
        r = (9 + 4 * (1 - k)) * S
        d.ellipse([x - r, axis_y - r, x + r, axis_y + r], fill=col)
        alpha = k
        ty = y_end - 70 * S if up else y_end + 8 * S
        _text_c(d, (x, ty), ev["label"], fe, _mix(BG, FG, alpha))
        if ev.get("note"):
            _text_c(d, (x, ty + 40 * S), ev["note"], fs, _mix(BG, MUTED, alpha))

    # dau quet
    if p < 1:
        d.line([head_x, axis_y - 40 * S, head_x, axis_y + 40 * S], fill=FG, width=2 * S)

    # ngoac nhan manh mot doan (vd 1946-1985)
    br = spec.get("bracket")
    if br and t >= br["at"]:
        k = ease_out((t - br["at"]) / 0.7)
        bx0, bx1 = _year_x(br["from"], spec), _year_x(br["to"], spec)
        by = H - 95 * S
        d.line([bx0, by, bx0 + (bx1 - bx0) * k, by], fill=RED, width=4 * S)
        d.line([bx0, by - 16 * S, bx0, by], fill=RED, width=4 * S)
        if k >= 1:
            d.line([bx1, by - 16 * S, bx1, by], fill=RED, width=4 * S)
        _text_c(d, ((bx0 + bx1) / 2, by + 12 * S), br["label"], f("bold", 28),
                _mix(BG, RED, k))
    return img


# ---------------------------------------------------------------------- bars
def bars_frame(spec: dict, t: float, dur: float) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    _title(d, spec.get("title", ""), spec.get("subtitle", ""), ease_out(t / 0.8))
    items = spec["items"]
    vmax = max(i["value"] for i in items)
    base_y, top_y = H - 200 * S, 300 * S
    n = len(items)
    slot = (W - 280 * S) / n
    bw = slot * 0.46
    step = min(dur * 0.35 / n, 0.9)
    for k, it in enumerate(items):
        p = ease_out((t - 0.4 - k * step) / max(step * 1.4, 0.6))
        cx = 140 * S + slot * (k + 0.5)
        hgt = max((base_y - top_y) * (it["value"] / vmax), 14 * S) * p
        col = RED if it.get("highlight") else GOLD
        if hgt > 0:
            d.rounded_rectangle([cx - bw / 2, base_y - max(hgt, 6 * S), cx + bw / 2, base_y],
                                radius=8 * S, fill=col)
        val = it["value"] * p
        txt = f"{int(round(val)):,}".replace(",", ".") + it.get("suffix", "")
        if p > 0:
            _text_c(d, (cx, base_y - max(hgt, 6 * S) - 64 * S), txt, f("bold", 40),
                    _mix(BG, FG, min(p * 2, 1)))
        _text_c(d, (cx, base_y + 24 * S), it["label"], f("semi", 28), FG)
        if it.get("note"):
            _text_c(d, (cx, base_y + 66 * S), it["note"], f("regular", 22), MUTED)
    d.line([140 * S, base_y, W - 140 * S, base_y], fill=GRID, width=3 * S)
    if spec.get("source"):
        d.text((140 * S, H - 70 * S), "Nguồn: " + spec["source"], font=f("regular", 22),
               fill=MUTED)
    return img


# ---------------------------------------------------------------------- line
def line_frame(spec: dict, t: float, dur: float) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    _title(d, spec.get("title", ""), spec.get("subtitle", ""), ease_out(t / 0.8))
    pts = spec["points"]
    vmax = spec.get("ymax") or max(p["y"] for p in pts) * 1.1
    x0, x1 = 180 * S, W - 160 * S
    y0, y1 = H - 190 * S, 290 * S
    for gv in spec.get("grid", []):
        gy = y0 - (y0 - y1) * gv / vmax
        d.line([x0, gy, x1, gy], fill=GRID, width=2 * S)
        d.text((x0 - 90 * S, gy - 16 * S), f"{gv}%", font=f("regular", 22), fill=MUTED)
    xy = [(x0 + (x1 - x0) * i / (len(pts) - 1), y0 - (y0 - y1) * p["y"] / vmax)
          for i, p in enumerate(pts)]
    for i, p in enumerate(pts):
        _text_c(d, (xy[i][0], y0 + 22 * S), str(p["x"]), f("regular", 24), MUTED)
    prog = ease((t - 0.5) / (dur * 0.65)) * (len(pts) - 1)
    if prog > 0:
        full = int(prog)
        frac = prog - full
        path = xy[:full + 1]
        if full < len(xy) - 1:
            a, b = xy[full], xy[full + 1]
            path = path + [(a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac)]
        area = Image.new("L", (W, H), 0)
        ImageDraw.Draw(area).polygon([(path[0][0], y0)] + path + [(path[-1][0], y0)],
                                     fill=70)
        img.paste(Image.new("RGB", (W, H), RED), (0, 0), area)
        d = ImageDraw.Draw(img)
        d.line(path, fill=RED, width=6 * S, joint="curve")
        for i in range(full + 1):
            if pts[i].get("label"):
                lx, ly = xy[i]
                d.ellipse([lx - 10 * S, ly - 10 * S, lx + 10 * S, ly + 10 * S], fill=FG)
                _text_c(d, (lx + 90 * S, ly - 30 * S), pts[i]["label"], f("bold", 36), FG)
        ex, ey = path[-1]
        pulse = 14 + 6 * math.sin(t * 6)
        d.ellipse([ex - pulse * S, ey - pulse * S, ex + pulse * S, ey + pulse * S],
                  outline=RED, width=3 * S)
    if spec.get("source"):
        d.text((140 * S, H - 70 * S), "Nguồn: " + spec["source"], font=f("regular", 22),
               fill=MUTED)
    return img


# -------------------------------------------------------------------- counter
def counter_frame(spec: dict, t: float, dur: float) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    _title(d, spec.get("title", ""), spec.get("subtitle", ""), ease_out(t / 0.8))
    p = ease_out((t - 0.5) / max(dur * 0.45, 1.0))
    val = spec["value"] * p
    txt = f"{val:,.0f}".replace(",", ".") + spec.get("suffix", "")
    _text_c(d, (W / 2, H * 0.36), txt, f("bold", 220), _mix(FG, RED, p))
    # thanh so sanh: gia nam truoc = 1, nam nay = 1 + value/100
    bx0, bx1, by = 360 * S, W - 360 * S, int(H * 0.74)
    base = (bx1 - bx0) / (1 + spec["value"] / 100)
    k = ease_out((t - dur * 0.35) / 1.2)
    if k > 0:
        d.rounded_rectangle([bx0, by - 60 * S, bx0 + base, by - 20 * S], radius=8 * S, fill=MUTED)
        d.text((bx0, by - 110 * S), spec.get("from_label", ""), font=f("regular", 26), fill=MUTED)
        d.rounded_rectangle([bx0, by + 20 * S, bx0 + (bx1 - bx0) * k, by + 60 * S],
                            radius=8 * S, fill=RED)
        d.text((bx0, by + 76 * S), spec.get("to_label", ""), font=f("regular", 26), fill=FG)
    if spec.get("source"):
        d.text((140 * S, H - 70 * S), spec["source"], font=f("regular", 22), fill=MUTED)
    return img


FRAMES: dict[str, Callable[[dict, float, float], Image.Image]] = {
    "timeline": timeline_frame, "bars": bars_frame, "line": line_frame,
    "counter": counter_frame,
}


def render(spec: dict, dur: float, dest: Path, fps: int = 24) -> Path:
    """Ve toan bo hieu ung thanh mot clip mp4 (khong tieng)."""
    fn = FRAMES[spec["anim"]]
    dest.parent.mkdir(parents=True, exist_ok=True)
    n = max(int(round(dur * fps)), 1)
    proc = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", "1920x1080", "-r", str(fps), "-i", "-",
         "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
         str(dest)],
        stdin=subprocess.PIPE,
    )
    try:
        for k in range(n):
            frame = fn(spec, k / fps, dur).resize((1920, 1080), Image.LANCZOS)
            proc.stdin.write(frame.tobytes())
    finally:
        proc.stdin.close()
        proc.wait()
    return dest


def cut(src: Path, start: float, dur: float, dest: Path) -> Path:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-i", str(src),
                    "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                    "-pix_fmt", "yuv420p", str(dest)], check=True)
    return dest


def render_group(scenes: list, spec: dict, gap: float, workdir: Path,
                 fps: int = 24) -> dict[str, Path]:
    """Ve mot hieu ung chay lien qua nhieu canh, roi cat ra tung canh.

    Moc nao co "say" se hien len dung luc loi doc nhac toi cum tu do (uoc theo
    vi tri ky tu trong cau, vi giong doc deu toc do).
    """
    starts, t = [], 0.0
    for sc in scenes:
        starts.append(t)
        t += sc.duration + gap
    total = t
    for ev in spec.get("events", []) + ([spec["bracket"]] if spec.get("bracket") else []):
        say = ev.get("say")
        if not say:
            continue
        for sc, st in zip(scenes, starts, strict=True):
            pos = sc.narration.find(say)
            if pos >= 0:
                ev["at"] = st + sc.duration * pos / max(len(sc.narration), 1)
                break
    spec.setdefault("sweep_end", 0.95)
    if spec.get("anim") == "timeline":
        timed = sorted((e["at"], e["year"]) for e in spec.get("events", []) if "at" in e)
        if timed:
            first_year = spec["segments"][0][0]
            spec["keyframes"] = ([(0.0, first_year)] + timed
                                 + [(total * 0.97, spec["segments"][-1][1])])
    full = render(spec, total, workdir / "group.mp4", fps)
    out = {}
    for sc, st in zip(scenes, starts, strict=True):
        out[sc.id] = cut(full, st, sc.duration + gap, workdir / f"{sc.id}.mp4")
    return out
