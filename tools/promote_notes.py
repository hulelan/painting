#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mount notes from a room export onto the scroll itself.

    python3 tools/promote_notes.py annotations-2026-08-29.json --list
    python3 tools/promote_notes.py annotations-2026-08-29.json --take houchibi:3,7 qianli:1

A room is a conversation; assets/data/notes-<slug>.js is the mounted colophon.
Crossing between them should be deliberate and reviewable, so this takes the
ids you name and nothing else, and writes a file you then commit.

Whoever wrote a note is carried across with it. Anonymous mounting is how a
comment board happens by accident.
"""
import json, os, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "assets", "data")

ap = argparse.ArgumentParser()
ap.add_argument("export", help="the JSON written by 'save all' in the room panel")
ap.add_argument("--list", action="store_true", help="show what is in it and stop")
ap.add_argument("--take", nargs="*", default=[], metavar="SLUG:ID,ID",
                help="which notes to mount, per painting")
a = ap.parse_args()

doc = json.load(open(a.export, encoding="utf-8"))
by_painting = doc.get("paintings") or {}
if doc.get("mine", {}).get("notes"):
    m = doc["mine"]
    by_painting.setdefault(m.get("slug", "qianli"), []).extend(m["notes"])

if a.list or not a.take:
    for slug, notes in sorted(by_painting.items()):
        print(f"\n{slug}  ({len(notes)})")
        for n in notes:
            who = n.get("by", "—")
            print(f"   {str(n.get('id')):<24} {who:<12} ({n.get('x')},{n.get('y')})  {n.get('title','')[:52]}")
    if not a.take:
        print("\nnothing mounted. name some: --take houchibi:3,7")
    raise SystemExit

want = {}
for spec in a.take:
    slug, _, ids = spec.partition(":")
    want[slug] = set(x.strip() for x in ids.split(",") if x.strip())

for slug, ids in want.items():
    notes = by_painting.get(slug) or []
    keep = [n for n in notes if str(n.get("id")) in ids]
    missing = ids - {str(n.get("id")) for n in keep}
    if missing:
        print(f"  {slug}: no such id: {', '.join(sorted(missing))}")

    path = os.path.join(DATA, "notes.js" if slug == "qianli" else f"notes-{slug}.js")
    existing = []
    srcW = srcH = None
    if os.path.exists(path):
        raw = open(path, encoding="utf-8").read()
        obj = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        existing = obj.get("items", [])
        srcW, srcH = obj.get("srcW"), obj.get("srcH")

    seen = {str(n.get("id")) for n in existing}
    nid = max([n.get("id", 0) for n in existing if isinstance(n.get("id"), int)] or [0])
    added = 0
    for n in keep:
        nid += 1
        existing.append({"id": nid, "x": n["x"], "y": n["y"],
                         "w": n.get("w", 0), "h": n.get("h", 0),
                         "type": n.get("type", "note"),
                         "title": n.get("title", ""), "text": n.get("text", ""),
                         "by": n.get("by", "")})
        added += 1

    hdr = ("/* Notes mounted on the scroll. A note is a box round something and a\n"
           "   remark about it -- what a viewer noticed, not what a catalogue says is\n"
           "   there. Promoted from a room by tools/promote_notes.py; the writer's\n"
           "   name travels with the note. */\n")
    out = {"srcW": srcW, "srcH": srcH, "items": existing}
    open(path, "w", encoding="utf-8").write(
        hdr + "window.NOTES = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print(f"  {slug}: +{added} -> {os.path.relpath(path, ROOT)}  ({len(existing)} total)")

print("\nreview the diff, then commit.")
