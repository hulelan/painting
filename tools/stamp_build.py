#!/usr/bin/env python3
"""Stamp index.html with the current commit, so a deploy busts its data files.

    python3 tools/stamp_build.py && git commit -am "..." 

Assets go out with max-age=600. Without a stamp a browser can hold a new
index.html beside a ten-minute-old paintings.js -- which is exactly how the
Whole view went on painting the Wang Ximeng scroll after the fix had shipped.
Run this whenever a file under assets/data or assets/*/manifest.js changes.
"""
import re, subprocess, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
build = subprocess.check_output(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"]).decode().strip()

p = os.path.join(ROOT, "index.html")
s = open(p, encoding="utf-8").read()
new = re.sub(r"window\.BUILD='[^']*'", "window.BUILD='%s'" % build, s, count=1)
new = re.sub(r"(assets/(?:data|scroll)/[A-Za-z0-9_.-]+\.js)\?b=[^\"']*", r"\1?b=" + build, new)
open(p, "w", encoding="utf-8").write(new)
print("stamped", build, "— changed" if new != s else "— already current")
