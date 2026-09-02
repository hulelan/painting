#!/usr/bin/env python3
"""Shared paths and run-file I/O for verify-painting helpers.

Skill root:  .cursor/skills/verify-painting/
Repo root:   directory that contains index.html and assets/scroll/manifest.js
Run file:    .run/current.json  (copy also at .run/<run-id>/run.json)
"""
from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]  # .cursor/skills/verify-painting -> repo
RUN_DIR = SKILL_ROOT / ".run"
EVIDENCE_ROOT = SKILL_ROOT / "evidence"
PROD_HOSTS = {"classicalchinesepainting.com", "www.classicalchinesepainting.com"}
DEFAULT_PORT_FLOOR = 4173
DEFAULT_CDP_FLOOR = 9333
CHROME_CANDIDATES = [
    os.environ.get("VERIFY_PAINTING_CHROME"),
    "/usr/bin/google-chrome",
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
]


class DoctorFail(Exception):
    """Fail-closed doctor error. Message is the whole report."""


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def chrome_bin() -> str:
    for c in CHROME_CANDIDATES:
        if c and Path(c).is_file() and os.access(c, os.X_OK):
            return c
    die("no Chrome/Chromium binary found (set VERIFY_PAINTING_CHROME)")


def repo_looks_right() -> None:
    if not (REPO_ROOT / "index.html").is_file():
        die(f"repo root {REPO_ROOT} has no index.html")
    if not (REPO_ROOT / "assets" / "scroll" / "manifest.js").is_file():
        die(f"repo root {REPO_ROOT} has no assets/scroll/manifest.js")


def run_id_from_env() -> str | None:
    return os.environ.get("VERIFY_PAINTING_RUN_ID") or None


def run_file_path(run_id: str | None = None) -> Path:
    explicit = os.environ.get("VERIFY_PAINTING_RUN_FILE")
    if explicit:
        return Path(explicit)
    if run_id:
        return RUN_DIR / run_id / "run.json"
    current = RUN_DIR / "current.json"
    if current.is_file():
        return current
    return current


def load_run(run_id: str | None = None, required: bool = True) -> dict:
    path = run_file_path(run_id)
    if not path.is_file():
        if required:
            raise DoctorFail(
                f"FAIL: no run file at {path}. Start one with "
                f"{SKILL_ROOT}/bin/launch — doctor refuses unknown/shared instances."
            )
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise DoctorFail(f"FAIL: run file {path} is not JSON: {e}") from e
    data["_run_file"] = str(path)
    return data


def save_run(data: dict) -> Path:
    run_id = data["run_id"]
    folder = RUN_DIR / run_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "run.json"
    text = json.dumps(data, indent=2, sort_keys=True) + "\n"
    path.write_text(text, encoding="utf-8")
    (RUN_DIR / "current.json").write_text(text, encoding="utf-8")
    return path


def free_port(floor: int, bind: str = "127.0.0.1") -> int:
    for p in range(floor, floor + 200):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((bind, p))
            except OSError:
                continue
            return p
    die(f"no free port in {floor}..{floor + 199}")


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def proc_cmdline(pid: int) -> str:
    p = Path(f"/proc/{pid}/cmdline")
    if not p.is_file():
        return ""
    raw = p.read_bytes().replace(b"\x00", b" ").strip()
    return raw.decode("utf-8", "replace")


def listening_pids(port: int) -> set[int]:
    try:
        out = subprocess.check_output(
            ["lsof", f"-iTCP:{port}", "-sTCP:LISTEN", "-n", "-P", "-t"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        return set()
    return {int(x) for x in out.split() if x.strip().isdigit()}


def http_get(url: str, timeout: float = 4.0) -> tuple[int, bytes]:
    req = urllib.request.Request(url, method="GET", headers={"Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() if e.fp else b""
    except Exception as e:
        raise DoctorFail(f"FAIL: GET {url} did not complete: {e}") from e


def checkout_build() -> str:
    html = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
    m = re.search(r"window\.BUILD='([^']*)'", html)
    if not m:
        raise DoctorFail("FAIL: checkout index.html has no window.BUILD='...' stamp")
    return m.group(1)


def parse_manifest(text: str) -> dict:
    m = re.search(r"window\.SCROLL\s*=\s*(\{.*\})\s*;", text, re.S)
    if not m:
        raise DoctorFail("FAIL: manifest.js has no window.SCROLL = {...}")
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise DoctorFail(f"FAIL: window.SCROLL is not JSON: {e}") from e


def host_of(url: str) -> str:
    from urllib.parse import urlparse

    return (urlparse(url).hostname or "").lower()


def refuse_production_url(url: str) -> None:
    host = host_of(url)
    if host in PROD_HOSTS:
        raise DoctorFail(
            f"FAIL: refusing {url} — https://classicalchinesepainting.com is production "
            "(shared). Drive only the 127.0.0.1 instance this skill launched. "
            "Live site is read-only comparison of BUILD / tile count, never the driven instance."
        )
    if host and host not in {"127.0.0.1", "localhost"}:
        raise DoctorFail(
            f"FAIL: refusing host {host!r}. Isolation requires 127.0.0.1 "
            "(an http.server this skill started)."
        )


def dump_ok(obj: dict) -> None:
    print(json.dumps(obj, indent=2, sort_keys=True))
