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
):
    """Chạy phần còn lại: tách cảnh → đọc → căn phụ đề → lấy hình → dựng → đóng gói."""
    cfg = _cfg(set_)
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
def voices(set_: list[str] | None = SetOpt):
    """Liệt kê giọng đọc có trên server VieNeu-TTS."""
    cfg = _cfg(set_)
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
def doctor(set_: list[str] | None = SetOpt):
    """Kiểm tra môi trường trước khi chạy thật."""
    import os
    import shutil
    cfg = _cfg(set_)
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
