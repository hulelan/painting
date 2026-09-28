#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Make the copies of a painting's photographs that the site actually serves.

    python3 tools/webcopies.py --slug handu
    python3 tools/webcopies.py --all

The originals off a phone are 5,000 px across and 3 MB each, and they stay out
of git. What ships is a web copy (1,800 px, for the one photograph that is
open) and a small copy (820 px, for the collage), both with the EXIF stripped.
photos.js is written beside them: the same placements as photos.json, with H
rescaled so it maps the WEB copy's pixels to source pixels, which is what the
viewer hands to CSS matrix3d without further arithmetic.
"""
import argparse, json, os
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAINTINGS = os.path.join(ROOT, "assets", "paintings")
WEB, SMALL = 1800, 820

HEADER = """/* Where each gallery photograph sits on this scroll. H maps the WEB copy's
   pixels to source pixels; the viewer hands it straight to CSS matrix3d.
   Regenerate with tools/register_photos.py + tools/webcopies.py. */
"""

def resized(img, long_edge):
    h, w = img.shape[:2]
    k = long_edge / max(w, h)
    if k >= 1: return img, w, h
    out = cv2.resize(img, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)
    return out, out.shape[1], out.shape[0]

def do_slug(slug):
    d = os.path.join(PAINTINGS, slug, "photos")
    src = os.path.join(d, "photos.json")
    if not os.path.exists(src):
        print(f"{slug}: no photos.json"); return
    o = json.load(open(src, encoding="utf-8"))
    os.makedirs(os.path.join(d, "web"), exist_ok=True)
    os.makedirs(os.path.join(d, "small"), exist_ok=True)
    items = []
    for it in o["items"]:
        img = cv2.imread(os.path.join(d, it["file"]))
        if img is None:
            print(f"  {it['file']}: original missing, skipped"); continue
        ow = img.shape[1]
        web, pw, ph = resized(img, WEB)
        small, _, _ = resized(img, SMALL)
        cv2.imwrite(os.path.join(d, "web", it["file"]), web, [cv2.IMWRITE_JPEG_QUALITY, 82])
        cv2.imwrite(os.path.join(d, "small", it["file"]), small, [cv2.IMWRITE_JPEG_QUALITY, 80])
        k = ow / pw
        H = [[row[0] * k, row[1] * k, row[2]] for row in it["H"]]
        items.append(dict(it, H=H, pw=pw, ph=ph))
    out = {"slug": o["slug"], "srcW": o["srcW"], "srcH": o["srcH"], "items": items}
    with open(os.path.join(d, "photos.js"), "w", encoding="utf-8") as f:
        f.write(HEADER + "window.PHOTOS = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print(f"{slug}: {len(items)} photographs -> web/ small/ photos.js")

ap = argparse.ArgumentParser()
ap.add_argument("--slug"); ap.add_argument("--all", action="store_true")
a = ap.parse_args()
if a.all:
    for s in sorted(os.listdir(PAINTINGS)):
        if not s.startswith("_") and os.path.isdir(os.path.join(PAINTINGS, s, "photos")): do_slug(s)
elif a.slug:
    do_slug(a.slug)
else:
    ap.error("--slug or --all")
