"""Giao dien dong lenh.

Luong chuan:
    autovid new <url> --text-file bai.txt   # -> dung o script cho ban duyet
    autovid approve latest --reload          # nap lai script.md ban vua sua
    autovid run latest                       # dung ra final.mp4
"""

from __future__ import annotations

import sys
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import llm as llm_mod
from .config import ROOT, load_config
from .job import Job
from .models import VideoScript
from .stages import align, assemble, charts, ingest, package, research, visuals
from .stages import scenes as scenes_mod
from .stages import script as script_mod
from .stages import tts as tts_mod

app = typer.Typer(add_completion=False, help="Biến link bài báo thành video review dài.")
con = Console()

SetOpt = typer.Option(None, "--set", "-s", help="Ghi đè config, ví dụ -s tts.speed=1.05")
ConfigOpt = typer.Option(None, "--config", "-c",
                         help="File cấu hình kênh, ví dụ config/su-az.yaml")


def _cfg(sets: list[str] | None, config: str | None = None):
    return load_config(extra=sets or [], config_file=config)


def _step(name: str):
    con.print(f"[bold cyan]▸ {name}[/bold cyan]")

    def emit(msg: str) -> None:
        con.print(f"  [dim]│[/dim] {msg}")

    return emit


def _load_script(job: Job) -> VideoScript:
    from .models import DataPoint, Source
    d = job.read_json("script.json")
    s = VideoScript(**{k: v for k, v in d.items() if k not in ("data_points", "sources")})
    s.data_points = [DataPoint(**p) for p in d.get("data_points", [])]
    s.sources = [Source(**x) for x in d.get("sources", [])]
    return s


def _save_script(job: Job, script: VideoScript) -> None:
    job.write_json("script.json", script.to_dict())


# ==================================================================== new
@app.command()
def new(
    url: str = typer.Argument(..., help="Link bài báo"),
    text_file: str | None = typer.Option(None, "--text-file", "-f",
                                            help="File chứa toàn văn bài (khuyến nghị)"),
    stdin: bool = typer.Option(False, "--stdin", help="Đọc toàn văn từ stdin"),
    no_research: bool = typer.Option(False, "--no-research", help="Bỏ bước đối chiếu"),
    set_: list[str] | None = SetOpt,
):
    """Tạo job mới: lấy bài → nghiên cứu đối chiếu → viết script → dừng cho bạn duyệt."""
    cfg = _cfg(set_)

    emit = _step("Lấy nội dung bài")
    article = ingest.run(url, text_file=text_file, stdin=stdin)
    if article.paywalled and not (text_file or stdin):
        con.print(Panel(
            "Chỉ lấy được phần công khai của bài (tường phí).\n"
            "Nếu bạn là thuê bao, lưu toàn văn ra file rồi chạy lại với "
            "[bold]--text-file bai.txt[/bold] để script sắc hơn hẳn.",
            title="Cảnh báo tường phí", border_style="yellow"))
    emit(f"«{article.title}» — {article.word_count} từ")

    job = Job.create(url, article.title)
    job.write_json("article.json", article.to_dict())
    job.mark("ingest", words=article.word_count, paywalled=article.paywalled)
    con.print(f"  [dim]│[/dim] job: [bold]{job.path.name}[/bold]")

    brief: dict = {}
    if cfg.get("research.enabled", True) and not no_research:
        emit2 = _step("Nghiên cứu đối chiếu")
        brief = research.run(
            article, llm_mod.build(cfg, role="utility"),
            max_queries=cfg.get("research.max_queries", 8),
            max_sources=cfg.get("research.max_sources", 15),
            on_progress=emit2,
        )
        job.write_json("brief.json", brief)
        job.mark("research", sources=len(brief.get("nguon", [])))

    emit3 = _step("Viết kịch bản")
    script = script_mod.build(article, brief, llm_mod.build(cfg, role="script"), cfg,
                              on_progress=emit3)
    _save_script(job, script)
    job.write_text("script.md", script_mod.to_markdown(script, article))
    job.mark("script", words=script.est_words)

    con.print(Panel(
        f"[bold]{script.title}[/bold]\n\n"
        f"{script.est_words} từ ≈ {script.est_words / 145:.1f} phút đọc\n\n"
        f"Mở và sửa:  [bold]{job.file('script.md')}[/bold]\n"
        f"Rồi chạy:   [bold]autovid approve {job.path.name} --reload[/bold]\n"
        f"            [bold]autovid run {job.path.name}[/bold]",
        title="Script sẵn sàng để bạn duyệt", border_style="green"))


# ============================================================= script-new
@app.command(name="script-new")
def script_new(
    script_file: str = typer.Argument(..., help="Kịch bản viết tay theo định dạng script.md"),
    data: str | None = typer.Option(None, "--data", "-d",
                                    help="File JSON chứa thesis, data_points, sources"),
    approve_now: bool = typer.Option(False, "--approve", help="Duyệt luôn kịch bản"),
):
    """Tạo job từ kịch bản viết sẵn (không cần bài báo, không gọi LLM)."""
    import json

    from .models import Article, DataPoint, Source
    from .util.text import word_count

    path = Path(script_file)
    md = path.read_text(encoding="utf-8")
    extra = json.loads(Path(data).read_text(encoding="utf-8")) if data else {}
    base = VideoScript(
        title="", hook="", thesis=extra.get("thesis", ""),
        data_points=[DataPoint(**p) for p in extra.get("data_points", [])],
        sources=[Source(**x) for x in extra.get("sources", [])],
    )
    script = script_mod.from_markdown(md, base)
    if not script.hook or not script.chapters:
        con.print("[red]Không đọc được [HOOK] hoặc [CHƯƠNG] trong kịch bản.[/red]")
        raise typer.Exit(1)

    article = Article(url=path.resolve().as_uri(), title=script.title, source="Kịch bản viết tay",
                      text=script.full_text(), word_count=word_count(script.full_text()))
    job = Job.create(article.url, script.title)
    job.write_json("article.json", article.to_dict())
    _save_script(job, script)
    job.write_text("script.md", md)
    if extra.get("meta"):
        job.write_json("meta.json", extra["meta"])
    job.mark("script", words=script.est_words, source=str(path))
    if approve_now:
        job.approve("script")

    con.print(Panel(
        f"[bold]{script.title}[/bold]\n\n"
        f"{len(script.chapters)} chương, {script.est_words} từ ≈ "
        f"{script.est_words / 145:.1f} phút đọc\n"
        f"job: [bold]{job.path.name}[/bold]\n\n"
        + ("Đã duyệt. Chạy: " if approve_now else
           f"Duyệt: [bold]autovid approve {job.path.name}[/bold]\nRồi chạy: ")
        + f"[bold]autovid run {job.path.name} -c <config kênh>[/bold]",
        title="Đã tạo job từ kịch bản", border_style="green"))


# ============================================================ plan-visuals
def fx_timing(scene, items: list[dict], min_show: float = 1.6) -> list[dict]:
    """Gan moc from/to (giay) cho lop chu nhan manh theo cum tu trong loi doc.

    Moi luc chi hien MOT lop chu: lop sau xuat hien thi lop truoc tat. Lop nao
    hien chua du min_show giay thi bo, vi chu vua hien da tat se gay roi mat.
    The chuong (goc tren trai, 0,4-4,2 giay) chiem cho cua the ngay, nen the
    ngay don sang phai.
    """
    out = []
    text = scene.narration
    for it in items:
        it = dict(it)
        if "say" in it:
            pos = text.find(it.pop("say"))
            it["from"] = round(scene.duration * max(pos, 0) / max(len(text), 1), 2)
        it.setdefault("from", 0.0)
        if scene.chapter_tag and it["type"] == "date" and it["from"] < 4.4:
            it["pos"] = "top-right"
        out.append(it)
    out.sort(key=lambda i: i["from"])
    end = scene.duration + 0.6
    if scene.callout:
        # thanh "LY DO" truot vao goc duoi luc 4,8 giay cuoi canh: chu nhan manh nhuong cho
        end = max(0.6, scene.duration - 4.8)
        out = [i for i in out if i["from"] < end - min_show]
    kept: list[dict] = []
    for i, it in enumerate(out):
        nxt = out[i + 1]["from"] if i + 1 < len(out) else end
        hold = it.pop("hold", 99)
        it["to"] = round(min(it.get("to", 99), nxt + 0.15, end, it["from"] + hold), 2)
        if it["to"] - it["from"] >= min_show or i + 1 == len(out):
            kept.append(it)
    return kept



@app.command(name="plan-visuals")
def plan_visuals(
    plan_file: str = typer.Argument(..., help="visuals.json: hình cho từng cảnh"),
    job_ref: str = typer.Argument("latest"),
    media: str | None = typer.Option(
        None, "--media", "-m",
        help="Thư mục ảnh đã tải, kèm db.json ghi tác giả/giấy phép"),
    config: str | None = ConfigOpt,
):
    """Gán hình cho từng cảnh theo kế hoạch viết tay: ảnh tư liệu, thẻ chữ, biểu đồ."""
    import json
    import shutil

    from .models import Asset
    from .stages import cards

    job = Job.open(job_ref)
    plan = json.loads(Path(plan_file).read_text(encoding="utf-8"))
    db = {}
    if media and (Path(media) / "db.json").exists():
        db = json.loads((Path(media) / "db.json").read_text(encoding="utf-8"))
    have = {k: Path(media) / Path(v["file"]).name for k, v in db.items()
            if media and (Path(media) / Path(v["file"]).name).exists()}

    scene_list = scenes_mod.from_json(job.file("scenes.json").read_text(encoding="utf-8"))
    assets: dict[str, Asset] = {}
    counts = {"photo": 0, "card": 0, "chart": 0}
    mismatched: list[str] = []
    for sc in scene_list:
        spec = plan.get(sc.id)
        if not spec:
            continue
        if spec.get("says") and spec["says"].lower() not in sc.narration.lower():
            mismatched.append(sc.id)
        sc.callout = spec.get("callout", "")
        sc.chapter_tag = spec.get("chapter_tag", "")
        sc.fx = fx_timing(sc, spec.get("fx", []))
        sc.shots = spec.get("shots", [])
        if "anim" in spec or "group" in spec:
            sc.on_screen_text = ""
            continue
        sc.on_screen_text = spec.get("label", "")
        key = spec.get("photo") or spec.get("video")
        if key and key in have:
            src = have[key]
            dest = job.file("media", src.name)
            shutil.copy2(src, dest)
            kind = "video" if "video" in spec else "photo"
            sc.media_path, sc.visual_kind = str(dest), kind
            info = db[key]
            assets[key] = Asset(
                scene_id=sc.id, provider=info.get("provider", "Internet Archive"),
                provider_id=info["title"], url=info["desc"], local_path=str(dest),
                kind=kind, license=info.get("lic", ""),
                license_url=info.get("licurl", ""),
                author=info.get("artist") or info["title"])
            counts["photo"] += 1
            continue
        spec = spec.get("else", spec) if key else spec
        if "chart" in spec:
            sc.visual_kind, sc.chart_ref, sc.media_path = "chart", spec["chart"], ""
            counts["chart"] += 1
            continue
        if "card" in spec:
            out = cards.render(spec, job.file("cards", f"{sc.id}.png"), have)
            sc.media_path, sc.visual_kind = str(out), "photo"
            if spec.get("bg") in have and spec["bg"] not in assets:
                info = db[spec["bg"]]
                assets[spec["bg"]] = Asset(
                    scene_id=sc.id, provider="Wikimedia Commons",
                    provider_id=info["title"], url=info["desc"],
                    local_path=str(have[spec["bg"]]), kind="photo",
                    license=info.get("lic", ""), license_url=info.get("licurl", ""),
                    author=info.get("artist", ""))
            counts["card"] += 1
        if spec.get("card") != "overlay":
            sc.on_screen_text = ""  # the chu da noi dung, khong chong them nhan
    if mismatched:
        # "says" la doan loi doc ma hinh minh hoa: lech nghia la kich ban da chia canh lai
        con.print(f"[red]Kế hoạch hình lệch với lời đọc ở {', '.join(mismatched)}.[/red] "
                  "Kiểm tra lại visuals.json, chưa ghi gì.")
        raise typer.Exit(1)
    # Bieu do chuyen dong: ve sau cung vi can thoi luong that cua tung canh
    from .config import load_config
    from .stages import motion
    cfg = load_config(config_file=config) if config else load_config()
    gap = cfg.get("tts.pause_between_scenes_ms", 450) / 1000.0
    fps = int(cfg.get("video.fps", 30))
    groups: dict[str, list] = {}
    for sc in scene_list:
        spec = plan.get(sc.id) or {}
        g = spec.get("group") or (sc.id if "anim" in spec else None)
        if g:
            groups.setdefault(g, []).append(sc)
    for g, members in groups.items():
        spec = json.loads(json.dumps(
            next(plan[m.id]["anim"] for m in members if "anim" in plan[m.id])))
        if spec.get("bg") in have:
            spec["bg_path"] = str(have[spec["bg"]])
        clips = motion.render_group(members, spec, gap,
                                    job.file("motion", g), fps)
        for m in members:
            m.media_path, m.visual_kind = str(clips[m.id]), "video"
        counts["chart"] += len(members)
    job.write_text("scenes.json", scenes_mod.to_json(scene_list))
    job.write_json("assets.json", [a.__dict__ for a in assets.values()])
    con.print(f"[green]✓[/green] {counts['photo']} ảnh/phim tư liệu, {counts['card']} thẻ chữ, "
              f"{counts['chart']} biểu đồ · ghi công {len(assets)} ảnh")


# ================================================================ approve
@app.command()
def approve(
    job_ref: str = typer.Argument("latest"),
    reload_: bool = typer.Option(False, "--reload", "-r",
                                 help="Nạp lại script.md bạn vừa sửa tay"),
    set_: list[str] | None = SetOpt,
):
    """Duyệt script để pipeline chạy tiếp."""
    _cfg(set_)
    job = Job.open(job_ref)
    script = _load_script(job)
    if reload_:
        md = job.file("script.md").read_text(encoding="utf-8")
        script = script_mod.from_markdown(md, script)
        _save_script(job, script)
        con.print(f"  đã nạp lại: [bold]{script.est_words} từ[/bold], "
                  f"{len(script.chapters)} chương")
    job.approve("script")
    con.print(f"[green]✓[/green] Đã duyệt. Chạy: [bold]autovid run {job.path.name}[/bold]")


# ==================================================================== run
@app.command()
def run(
    job_ref: str = typer.Argument("latest"),
    force: str | None = typer.Option(
        None, "--force", help="Chạy lại từ bước này: scenes|tts|visuals|assemble"),
    skip_render: bool = typer.Option(False, "--skip-render", help="Dừng trước khi dựng"),
    set_: list[str] | None = SetOpt,
    config: str | None = ConfigOpt,
):
    """Chạy phần còn lại: tách cảnh → đọc → căn phụ đề → lấy hình → dựng → đóng gói."""
    cfg = _cfg(set_, config)
    job = Job.open(job_ref)

    if "script" in (cfg.get("review.gates", []) or []) and not job.is_approved("script"):
        con.print(Panel(
            f"Script chưa được duyệt.\nXem [bold]{job.file('script.md')}[/bold] "
            f"rồi chạy [bold]autovid approve {job.path.name} --reload[/bold]",
            title="Đang chờ bạn duyệt", border_style="yellow"))
        raise typer.Exit(1)

    script = _load_script(job)
    brief = job.read_json("brief.json") if job.has("brief.json") else {}
    forced = {"scenes": 1, "tts": 2, "visuals": 3, "assemble": 4}.get(force or "", 0)

    if job.has("scenes.json") and forced < 1:
        scene_list = scenes_mod.from_json(job.file("scenes.json").read_text(encoding="utf-8"))
        con.print(f"[dim]▸ Tách cảnh (dùng lại {len(scene_list)} cảnh)[/dim]")
    else:
        emit = _step("Tách cảnh")
        scene_list = scenes_mod.run(script, llm_mod.build(cfg, role="utility"), cfg,
                                    on_progress=emit)
        job.write_text("scenes.json", scenes_mod.to_json(scene_list))
        job.mark("scenes", count=len(scene_list))

    emit = _step("Đọc bằng VieNeu-TTS")
    try:
        scene_list = tts_mod.run(scene_list, cfg, job.file("audio"),
                                 force=forced >= 2, on_progress=emit)
    except tts_mod.TTSUnavailable as exc:
        con.print(Panel(str(exc), title="TTS không chạy được", border_style="red"))
        raise typer.Exit(1) from exc
    job.write_text("scenes.json", scenes_mod.to_json(scene_list))
    job.mark("tts", minutes=round(sum(s.duration for s in scene_list) / 60, 2))

    emit = _step("Căn phụ đề")
    cues = align.run(scene_list, cfg, on_progress=emit)
    if cfg.get("video.subtitles_file", True):
        job.write_text("subtitles.srt", align.to_srt(cues))
    ass_path = job.file("subtitles.ass")
    ass_path.write_text(align.to_ass(cues, cfg), encoding="utf-8")
    job.mark("align", cues=len(cues))
    emit(f"{len(cues)} dòng phụ đề")

    emit = _step("Vẽ biểu đồ, bản đồ, timeline")
    scene_list = charts.run(scene_list, script.data_points, brief, cfg,
                            job.file("charts"), on_progress=emit)

    emit = _step("Lấy hình ảnh và video")
    scene_list, asset_list = visuals.run(scene_list, cfg, job.file("media"),
                                         force=forced >= 3, on_progress=emit)
    if job.has("assets.json"):  # giu ghi cong cua anh da gan tay (plan-visuals)
        from .models import Asset
        known = {a.local_path for a in asset_list}
        asset_list = [Asset(**a) for a in job.read_json("assets.json")
                      if a.get("local_path") not in known] + asset_list
    job.write_json("assets.json", [a.__dict__ for a in asset_list])
    job.write_text("scenes.json", scenes_mod.to_json(scene_list))
    job.mark("visuals", assets=len(asset_list))

    if skip_render:
        con.print("[yellow]Dừng trước khi dựng (--skip-render).[/yellow]")
        raise typer.Exit(0)

    emit = _step("Dựng video")
    final = assemble.run(scene_list, cfg, job.path, ass_file=ass_path,
                         force=forced >= 4, on_progress=emit)
    job.mark("assemble", output=str(final))

    emit = _step("Đóng gói metadata")
    meta = package.run(script, scene_list, asset_list,
                       llm_mod.build(cfg, role="utility"), cfg, job.path,
                       on_progress=emit)
    job.mark("package", title=meta["title"])

    con.print(Panel(
        f"[bold]{meta['title']}[/bold]\n\n"
        f"Video     : {final}\n"
        f"Phụ đề    : {job.file('subtitles.srt')}\n"
        f"Metadata  : {job.file('metadata.json')}\n"
        f"Credit    : {job.file('credits.txt')}\n"
        f"Ảnh bìa   : {meta.get('thumbnail') or '(chưa tạo được)'}",
        title="Hoàn tất", border_style="green"))


# ================================================================= tien ich
@app.command()
def status(job_ref: str = typer.Argument("latest")):
    """Xem job đã chạy tới đâu."""
    from .job import STAGES
    job = Job.open(job_ref)
    t = Table(title=job.path.name, show_header=True, header_style="bold")
    t.add_column("Bước")
    t.add_column("Xong")
    t.add_column("Chi tiết")
    for stage in STAGES:
        info = job.state.get("stages", {}).get(stage, {})
        mark = "[green]✓[/green]" if info.get("done") else "[dim]·[/dim]"
        detail = ", ".join(f"{k}={v}" for k, v in info.items() if k not in ("done", "at"))
        t.add_row(stage, mark, detail)
    con.print(t)
    con.print(f"Đã duyệt: {', '.join(job.state.get('approved', [])) or '(chưa)'}")


@app.command(name="list")
def list_jobs():
    """Liệt kê các job."""
    base = ROOT / "jobs"
    rows = sorted((d for d in base.iterdir() if d.is_dir()), reverse=True)
    t = Table(show_header=True, header_style="bold")
    t.add_column("Job")
    t.add_column("Tiêu đề")
    t.add_column("Bước cuối")
    for d in rows[:25]:
        try:
            job = Job(d)
            title = job.read_json("script.json").get("title", "") if job.has("script.json") else ""
            done = [s for s, v in job.state.get("stages", {}).items() if v.get("done")]
            t.add_row(d.name, title[:60], done[-1] if done else "-")
        except Exception:  # noqa: BLE001
            continue
    con.print(t)


@app.command()
def models(set_: list[str] | None = SetOpt):
    """Hỏi thẳng API xem hiện có những model nào (tên model hay đổi)."""
    cfg = _cfg(set_)
    try:
        for m in llm_mod.build(cfg).list_models():
            con.print(f"  {m}")
    except Exception as exc:  # noqa: BLE001
        con.print(f"[red]Không lấy được danh sách model:[/red] {exc}")
        raise typer.Exit(1) from exc


@app.command()
def voices(set_: list[str] | None = SetOpt, config: str | None = ConfigOpt):
    """Liệt kê giọng đọc có trên server VieNeu-TTS."""
    cfg = _cfg(set_, config)
    client = tts_mod.VieNeuClient(cfg)
    try:
        client.health()
        for v in client.voices():
            mark = " [green]← đang dùng[/green]" if v == client.voice else ""
            con.print(f"  {v}{mark}")
    except Exception as exc:  # noqa: BLE001
        con.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc


@app.command()
def doctor(set_: list[str] | None = SetOpt, config: str | None = ConfigOpt):
    """Kiểm tra môi trường trước khi chạy thật."""
    import os
    import shutil
    cfg = _cfg(set_, config)
    t = Table(show_header=True, header_style="bold")
    t.add_column("Thành phần")
    t.add_column("OK")
    t.add_column("Ghi chú")

    def row(name: str, ok: bool, note: str = "") -> None:
        t.add_row(name, "[green]✓[/green]" if ok else "[red]✗[/red]", note)

    for exe in ("ffmpeg", "ffprobe"):
        found = bool(shutil.which(exe))
        row(exe, found, "" if found else "sudo apt install ffmpeg")

    provider = cfg.get("llm.provider", "deepseek")
    key_env = llm_mod.PRESETS.get(provider, {}).get("key_env", "")
    has_key = bool(os.getenv(key_env)) or provider == "ollama"
    row(f"LLM ({provider})", has_key,
        f"model: {cfg.get('llm.model_script')}" if has_key else f"đặt {key_env} trong .env")

    try:
        client = tts_mod.VieNeuClient(cfg)
        client.health()
        vs = client.voices()
        ok_voice = (not vs) or client.voice in vs
        row("VieNeu-TTS", True,
            f"giọng {client.voice}" + ("" if ok_voice else " [red](không có trên server)[/red]"))
    except Exception as exc:  # noqa: BLE001
        row("VieNeu-TTS", False, str(exc).splitlines()[0])

    try:
        import faster_whisper  # noqa: F401
        row("faster-whisper", True, "phụ đề căn theo từng từ")
    except ImportError:
        row("faster-whisper", False, "pip install 'autovid[align]' — không có vẫn chạy")

    for name, envk in (("Pexels", "PEXELS_API_KEY"), ("Pixabay", "PIXABAY_API_KEY")):
        row(name, bool(os.getenv(envk)), "tuỳ chọn — có thì B-roll đẹp hơn")

    music = Path(cfg.get("music.dir", "assets/music"))
    n = len(list(music.glob("*"))) if music.exists() else 0
    row("Nhạc nền", n > 0, f"{n} file trong {music}" if n else f"thả file nhạc vào {music}")

    con.print(t)


def main() -> None:  # pragma: no cover
    try:
        app()
    except KeyboardInterrupt:
        con.print("\n[yellow]Đã dừng.[/yellow]")
        sys.exit(130)


if __name__ == "__main__":  # pragma: no cover
    main()
