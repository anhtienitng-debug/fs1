"""Buoc 9 - Sinh bieu do, ban do va timeline lam khung hinh video.

Khac voi bieu do tren web, day la anh tinh 1920x1080 nen khong co hover/tooltip.
Bu lai: chu phai to (nguoi xem tren dien thoai), nhan gan thang vao diem du lieu,
va moi khung chi noi DUNG MOT y.

Bang mau: palette toi da qua bo sau kiem tra (dai sang, san do bao hoa, tach mau
cho nguoi mu mau, nen tuong phan >= 3:1). Thu tu mau co dinh, khong xoay vong.
Sequential dung mot tong xanh sang -> dam cho ban do.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..models import DataPoint, Scene

# ---------------------------------------------------------------- bang mau
SURFACE = "#1a1a19"
INK = "#ffffff"
INK_MUTED = "#c3c2b7"
GRID = "#383835"
# Thu tu co dinh, khong bao gio cycle. Qua kiem tra o che do toi.
SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181",
          "#008300", "#9085e9", "#e66767"]
# Mot tong xanh, nhat -> dam, danh cho do lon lien tuc (ban do)
SEQ = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
       "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"]
NEUTRAL = "#383835"

GEOJSON_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_110m_admin_0_countries.geojson"
)


def vn(value: float, unit: str = "") -> str:
    """Dinh dang so kieu Viet Nam: dau phay thap phan, dau cham hang nghin."""
    if value == int(value):
        text = f"{int(value):,}".replace(",", ".")
    else:
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
        whole, _, frac = text.partition(".")
        text = whole.replace(",", ".") + ("," + frac if frac else "")
    return f"{text}{unit}"


def _setup(cfg: Any):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager

    want = cfg.get("video.subtitle_font", "Be Vietnam Pro")
    have = {f.name for f in font_manager.fontManager.ttflist}
    family = want if want in have else "DejaVu Sans"  # DejaVu co day du dau tieng Viet

    plt.rcParams.update({
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "font.family": family,
        "text.color": INK,
        "axes.labelcolor": INK_MUTED,
        "xtick.color": INK_MUTED,
        "ytick.color": INK_MUTED,
        "axes.edgecolor": GRID,
        "grid.color": GRID,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.linewidth": 1.0,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "font.size": 26,
    })
    return plt


def _figure(plt, cfg):
    w, h = cfg.get("video.resolution", [1920, 1080])
    dpi = 100
    fig, ax = plt.subplots(figsize=(w / dpi, h / dpi), dpi=dpi)
    fig.subplots_adjust(left=0.10, right=0.95, top=0.80, bottom=0.14)
    return fig, ax


def _title(fig, title: str, subtitle: str = "") -> None:
    fig.text(0.10, 0.92, title, fontsize=46, color=INK, ha="left", va="top",
             fontweight="bold", wrap=True)
    if subtitle:
        fig.text(0.10, 0.855, subtitle, fontsize=26, color=INK_MUTED, ha="left", va="top")


def _source(fig, source: str) -> None:
    if source:
        fig.text(0.10, 0.045, f"Nguồn: {source}", fontsize=22, color=INK_MUTED,
                 ha="left", va="bottom")


def _save(fig, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(dest, facecolor=SURFACE)
    fig.clf()
    return dest


# ------------------------------------------------------------------- bar
def bar_chart(point: DataPoint, dest: Path, cfg: Any) -> Path:
    plt = _setup(cfg)
    fig, ax = _figure(plt, cfg)

    series = point.series or ([{"x": point.label, "y": point.value}]
                              if point.value is not None else [])
    labels = [str(s.get("x", "")) for s in series]
    values = [float(s.get("y") or 0) for s in series]

    bars = ax.bar(labels, values, color=SERIES[0], width=0.55,
                  edgecolor=SURFACE, linewidth=2)
    # Nhan gan thang vao dau cot -> khong can legend cho mot chuoi
    for rect, v in zip(bars, values, strict=False):
        ax.annotate(vn(v, point.unit), (rect.get_x() + rect.get_width() / 2,
                                        rect.get_height()),
                    textcoords="offset points", xytext=(0, 12), ha="center",
                    fontsize=30, color=INK, fontweight="bold")
    ax.grid(axis="x", visible=False)
    ax.set_ylim(min(0, min(values) * 1.15) if values else 0,
                (max(values) * 1.25) if values else 1)
    ax.tick_params(length=0)
    _title(fig, point.label, point.unit and f"Đơn vị: {point.unit}" or "")
    _source(fig, point.source)
    return _save(fig, dest)


# ------------------------------------------------------------------ line
def line_chart(point: DataPoint, dest: Path, cfg: Any) -> Path:
    plt = _setup(cfg)
    fig, ax = _figure(plt, cfg)

    xs = [str(s.get("x", "")) for s in point.series]
    ys = [float(s.get("y") or 0) for s in point.series]
    ax.plot(xs, ys, color=SERIES[0], linewidth=3.5, marker="o",
            markersize=13, markerfacecolor=SERIES[0],
            markeredgecolor=SURFACE, markeredgewidth=3)

    # Chi ghi nhan o diem dau, diem cuoi va diem cuc tri - khong ghi moi diem
    if ys:
        marks = {0, len(ys) - 1, ys.index(max(ys)), ys.index(min(ys))}
        last = len(ys) - 1
        for i in sorted(marks):
            # Nhan o hai dau phai neo vao trong, neu khong se tran ra ngoai khung
            ha = "left" if i == 0 else ("right" if i == last else "center")
            dx = 14 if i == 0 else (-14 if i == last else 0)
            ax.annotate(vn(ys[i], point.unit), (i, ys[i]),
                        textcoords="offset points", xytext=(dx, 16), ha=ha,
                        fontsize=26, color=INK, fontweight="bold")
    ax.grid(axis="x", visible=False)
    ax.tick_params(length=0)
    if len(xs) > 10:
        step = max(1, len(xs) // 10)
        ax.set_xticks(range(0, len(xs), step))
        ax.set_xticklabels(xs[::step])
    _title(fig, point.label, point.unit and f"Đơn vị: {point.unit}" or "")
    _source(fig, point.source)
    return _save(fig, dest)


# ------------------------------------------------------------------- map
def _geojson(cache_dir: Path) -> dict | None:
    dest = cache_dir / "ne_110m_admin_0_countries.geojson"
    if not dest.exists():
        try:
            from ..util.http import download
            download(GEOJSON_URL, dest)
        except Exception:  # noqa: BLE001
            return None
    try:
        return json.loads(dest.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None


def world_map(countries: list[str], title: str, dest: Path, cfg: Any,
              cache_dir: Path) -> Path | None:
    geo = _geojson(cache_dir)
    if not geo:
        return None
    plt = _setup(cfg)
    fig, ax = _figure(plt, cfg)
    ax.grid(False)
    ax.set_axis_off()

    wanted = {c.strip().lower() for c in countries if c.strip()}
    highlight = SEQ[-3]   # xanh dam cho nuoc duoc nhac toi
    base = NEUTRAL        # con lai lui ve nen

    for feat in geo.get("features", []):
        props = feat.get("properties", {})
        names = {str(props.get(k, "")).lower()
                 for k in ("NAME", "NAME_LONG", "ADMIN", "SOVEREIGNT", "NAME_VI")}
        color = highlight if names & wanted else base
        for poly in _polygons(feat.get("geometry") or {}):
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            ax.fill(xs, ys, color=color, edgecolor=SURFACE, linewidth=0.6)

    ax.set_xlim(-180, 180)
    ax.set_ylim(-60, 85)
    ax.set_aspect("equal")
    _title(fig, title, ", ".join(countries))
    _source(fig, "Bản đồ: Natural Earth (public domain)")
    return _save(fig, dest)


def _polygons(geometry: dict) -> list[list[list[float]]]:
    t = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if t == "Polygon":
        return [ring for ring in coords]
    if t == "MultiPolygon":
        return [ring for poly in coords for ring in poly]
    return []


# --------------------------------------------------------------- timeline
def timeline(events: list[dict], title: str, dest: Path, cfg: Any) -> Path | None:
    """Truc thoi gian cac su kien tien le.

    Cac moc deu la cung mot loai thuc the nen dung CHUNG mot mau - mau khac nhau
    o day se ngu y chung thuoc cac nhom khac nhau, ma khong co gi de phan nhom.
    Nam luon nam cung phia voi ten su kien, sat ngay diem, de khong bi gan nham.
    """
    events = [e for e in events if e.get("nam")]
    if len(events) < 2:
        return None
    plt = _setup(cfg)
    fig, ax = _figure(plt, cfg)
    ax.grid(False)

    def year(e) -> int:
        digits = "".join(ch for ch in str(e.get("nam", "")) if ch.isdigit())[:4]
        return int(digits) if digits else 0

    events = sorted(events, key=year)
    xs = [year(e) for e in events]
    span = max(max(xs) - min(xs), 1)
    pad = span * 0.08
    ax.hlines(0, min(xs) - pad, max(xs) + pad, color=GRID, linewidth=3)

    for i, e in enumerate(events):
        up = 1 if i % 2 == 0 else -1
        ax.vlines(xs[i], 0, up * 0.30, color=SERIES[0], linewidth=3)
        ax.plot(xs[i], 0, "o", markersize=18, color=SERIES[0],
                markeredgecolor=SURFACE, markeredgewidth=3)
        # nam truoc, sat diem; ten su kien phia ngoai - ca hai cung phia
        ax.annotate(str(e.get("nam", "")), (xs[i], up * 0.36),
                    ha="center", va="bottom" if up > 0 else "top",
                    fontsize=30, color=INK, fontweight="bold")
        ax.annotate(_wrap(str(e.get("su_kien", "")), 26), (xs[i], up * 0.52),
                    ha="center", va="bottom" if up > 0 else "top",
                    fontsize=25, color=INK_MUTED)

    ax.set_xlim(min(xs) - pad * 1.6, max(xs) + pad * 1.6)
    ax.set_ylim(-1.05, 1.05)
    ax.set_yticks([])
    ax.set_xticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)
    _title(fig, title)
    return _save(fig, dest)


def _wrap(text: str, width: int) -> str:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = f"{cur} {w}".strip()
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return "\n".join(lines[:3])


# ------------------------------------------------------------------ stage
def run(
    scenes: list[Scene],
    data_points: list[DataPoint],
    brief: dict[str, Any],
    cfg: Any,
    charts_dir: Path,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> list[Scene]:
    if not cfg.get("charts.enabled", True):
        return scenes
    try:
        import matplotlib  # noqa: F401
    except ImportError:
        if on_progress:
            on_progress("chưa cài matplotlib — bỏ qua biểu đồ")
        return scenes

    by_label = {p.label.lower(): p for p in data_points}
    made = 0
    cap = cfg.get("charts.max_charts", 6)

    for scene in scenes:
        if made >= cap:
            break
        dest = charts_dir / f"{scene.id}.png"

        if scene.visual_kind == "chart":
            point = by_label.get((scene.chart_ref or "").lower())
            if point is None:
                point = _best_match(scene.chart_ref or scene.visual_query, data_points)
            if point is None or (not point.series and point.value is None):
                scene.visual_kind = "auto"   # de visuals.py lo
                continue
            fn = line_chart if (point.chart_type == "line" and len(point.series) > 2) \
                else bar_chart
            try:
                fn(point, dest, cfg)
            except Exception as exc:  # noqa: BLE001
                if on_progress:
                    on_progress(f"{scene.id}: vẽ biểu đồ lỗi ({exc})")
                scene.visual_kind = "auto"
                continue
            scene.media_path = str(dest)
            made += 1
            if on_progress:
                on_progress(f"{scene.id}: biểu đồ «{point.label}»")

        elif scene.visual_kind == "map" and cfg.get("charts.maps", True):
            countries = [c.strip() for c in scene.visual_query.split(",") if c.strip()]
            out = world_map(countries, scene.on_screen_text or scene.chapter,
                            dest, cfg, charts_dir.parent / "geo")
            if out:
                scene.media_path = str(out)
                made += 1
                if on_progress:
                    on_progress(f"{scene.id}: bản đồ {', '.join(countries)}")
            else:
                scene.visual_kind = "auto"

    # Mot khung timeline cho ca video, chen vao canh dau cua chuong doi chieu
    if cfg.get("charts.timeline", True) and brief.get("tien_le"):
        dest = charts_dir / "timeline.png"
        if timeline(brief["tien_le"], "Những lần trước chuyện này xảy ra", dest, cfg):
            for scene in scenes:
                if scene.visual_kind in ("auto", "photo") and not scene.media_path:
                    scene.media_path = str(dest)
                    scene.visual_kind = "chart"
                    if on_progress:
                        on_progress(f"{scene.id}: timeline tiền lệ")
                    break
    return scenes


def _best_match(needle: str, points: list[DataPoint]) -> DataPoint | None:
    needle = (needle or "").lower()
    if not needle:
        return None
    best, score = None, 0.0
    for p in points:
        words = set(p.label.lower().split()) & set(needle.split())
        s = len(words) / max(len(p.label.split()), 1)
        if s > score:
            best, score = p, s
    return best if score >= 0.3 else None
