#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""File the gallery photographs into each painting's folder.

    python3 tools/file_photos.py                 # say what it would do
    python3 tools/file_photos.py --commit        # do it

The plan is in tools/photo_plan.json and is written as FILE RANGES:

    ["5845-5848", "linluan", "inscription matched character for character"]

Ranges, not run numbers. An earlier version rebuilt the shooting runs from EXIF
and keyed the plan on run index -- which quietly renumbered everything the
moment some photographs had already been filed by hand, and confidently
proposed moving sixty-six frames to the wrong scroll. A filename cannot drift.

Nothing is renamed and nothing is deleted. A photograph not covered by a range
stays where it is: unfiled is a state, and a better one than filed wrongly,
because nobody re-checks a photograph that looks sorted.
"""
import argparse, json, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAINTINGS = os.path.join(ROOT, "assets", "paintings")
UNSORTED = os.path.join(PAINTINGS, "_unsorted")

ap = argparse.ArgumentParser()
ap.add_argument("--plan", default=os.path.join(HERE, "photo_plan.json"))
ap.add_argument("--commit", action="store_true")
ap.add_argument("--into-root", action="store_true",
                help="file into <slug>/ instead of <slug>/photos/")
a = ap.parse_args()

plan = json.load(open(a.plan, encoding="utf-8"))["ranges"]

def num(f):
    m = re.search(r"IMG_(\d+)", f)
    return int(m.group(1)) if m else None

dest_of, why_of = {}, {}
for spec, slug, why in plan:
    lo, _, hi = spec.partition("-")
    lo, hi = int(lo), int(hi or lo)
    for f in os.listdir(UNSORTED):
        n = num(f)
        if n is not None and lo <= n <= hi:
            dest_of[f] = slug
            why_of[f] = why

here = sorted(f for f in os.listdir(UNSORTED) if f.lower().endswith((".jpg", ".jpeg")))
moves, left = {}, [f for f in here if f not in dest_of]
for f in here:
    if f in dest_of:
        moves.setdefault(dest_of[f], []).append(f)

print(f"{len(here)} in _unsorted · {len(here) - len(left)} placed · {len(left)} left\n")
for slug in sorted(moves):
    d = os.path.join(PAINTINGS, slug)
    if not slug.startswith("_") and not a.into_root:
        d = os.path.join(d, "photos")   # beside the README that explains them
    fs = sorted(moves[slug], key=lambda f: num(f) or 0)
    print(f"  {slug:<11} {len(fs):>3}  {num(fs[0])}–{num(fs[-1])}")
    if not a.commit:
        continue
    os.makedirs(d, exist_ok=True)
    for f in fs:
        dst = os.path.join(d, f)
        if os.path.exists(dst):
            print(f"      already there: {f}")
            continue
        shutil.move(os.path.join(UNSORTED, f), dst)
if left:
    print(f"\n  staying put {len(left):>3}  {', '.join(str(num(f)) for f in left[:14])}"
          + (" …" if len(left) > 14 else ""))
print("\n" + ("moved." if a.commit else "nothing moved — add --commit"))
