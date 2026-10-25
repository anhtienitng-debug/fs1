import json

from typer.testing import CliRunner

from autovid import cli
from autovid.job import Job

EP = "episodes/su-az-001-tien-viet"


def test_script_new_tao_job_tu_kich_ban(tmp_path, monkeypatch):
    monkeypatch.setattr(Job, "create", classmethod(
        lambda cls, url, title="", jobs_dir=None: cls(tmp_path / "job")))
    res = CliRunner().invoke(cli.app, ["script-new", f"{EP}/script.md",
                                       "-d", f"{EP}/data.json", "--approve"])
    assert res.exit_code == 0, res.output

    job = Job(tmp_path / "job")
    script = json.loads(job.file("script.json").read_text(encoding="utf-8"))
    assert script["hook"].startswith("Tháng 9 năm 1985")
    assert len(script["chapters"]) == 8
    assert all(ch["key_point"] and ch["visual_note"] for ch in script["chapters"])
    # dong ghi chu cho bien tap khong duoc lot vao loi doc
    assert not any("Gợi ý hình" in ch["body"] or "Chữ trên màn hình" in ch["body"]
                   for ch in script["chapters"])
    assert "Cần kiểm" not in script["outro"]
    assert len(script["data_points"]) == 2
    assert job.is_approved("script")
