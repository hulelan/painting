#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Slice a painting into edge-to-edge strips and write its manifest.

    python3 tools/tile_painting.py --src scan.jpg --slug yufu

One 41,783-px-wide JPEG gets downsampled by mobile Safari (which caps decoding
around 16k px / 16 MP) and forces the whole file down in one go. Full-height
strips stay under the decode limit and let the browser fetch only what is
scrolled to. The same argument holds for a hanging scroll turned on its side,
so `--axis v` cuts horizontal bands instead.

Writes assets/paintings/<slug>/tiles/tile-NN.jpg and .../manifest.js, which is
what assets/data/paintings.js points `dir` at.
"""
import os, json, argparse
from PIL import Image

Image.MAX_IMAGE_PIXELS = None      # a local file we chose; not a hostile upload

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

ap = argparse.ArgumentParser()
ap.add_argument("--src", required=True, help="the full-resolution image")
ap.add_argument("--slug", required=True, help="register key, e.g. yufu")
ap.add_argument("--tile", type=int, default=2048, help="strip width in px")
ap.add_argument("--quality", type=int, default=86)
ap.add_argument("--axis", choices=["h", "v"], default="h",
                help="h: vertical strips for a handscroll (default). "
                     "v: horizontal bands for a tall hanging scroll.")
ap.add_argument("--content-right", type=int, default=0,
                help="px from the left where the painting ends and mounting "
                     "silk begins; the viewer opens on the artwork, not the "
                     "frontispiece. 0 means the whole width is painting.")
a = ap.parse_args()

out = os.path.join(ROOT, "assets", "paintings", a.slug, "tiles")
os.makedirs(out, exist_ok=True)

im = Image.open(a.src).convert("RGB")
W, H = im.size
print("source %dx%d  (%.1f MP)" % (W, H, W * H / 1e6))
if a.axis == "h" and W < H:
    print("  note: this is taller than it is wide -- did you mean --axis v?")

tiles, i, pos = [], 0, 0
span = W if a.axis == "h" else H
while pos < span:
    n = min(a.tile, span - pos)
    box = (pos, 0, pos + n, H) if a.axis == "h" else (0, pos, W, pos + n)
    fn = "tile-%02d.jpg" % i
    im.crop(box).save(os.path.join(out, fn), "JPEG",
                      quality=a.quality, optimize=True, progressive=True)
    tiles.append({"f": fn, "w": n})
    pos += n
    i += 1

# The Whole view paints its four bands from one long downscaled strip. Without
# it that view falls back to whatever the stylesheet names, which is how every
# painting once showed the Wang Ximeng scroll.
strip_h = 300
strip = im.resize((max(1, round(W * strip_h / H)), strip_h), Image.LANCZOS)
sp = os.path.join(ROOT, "assets", "paintings", a.slug, "strip.jpg")
strip.save(sp, "JPEG", quality=82, optimize=True, progressive=True)
print("strip %dx%d  %.0f KB" % (strip.size[0], strip_h, os.path.getsize(sp) / 1000))

man = {"w": W, "h": H, "tileW": a.tile, "axis": a.axis, "tiles": tiles}
if a.content_right:
    man["contentRight"] = a.content_right
mp = os.path.join(ROOT, "assets", "paintings", a.slug, "manifest.js")
open(mp, "w").write("window.SCROLL = " + json.dumps(man) + ";\n")

total = sum(os.path.getsize(os.path.join(out, t["f"])) for t in tiles)
print("%d tiles, %.1f MB -> %s" % (len(tiles), total / 1e6, out))
print("now add to assets/data/paintings.js:")
print("  dir:'assets/paintings/%s', tiles:'assets/paintings/%s/tiles/', strip:'assets/paintings/%s/strip.jpg'," % (a.slug, a.slug, a.slug))
