#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find where each gallery photograph sits on its painting.

    python3 tools/register_photos.py --slug houchibi
    python3 tools/register_photos.py --all --write

For each photograph in assets/paintings/<slug>/photos/, match it against that
painting's own scan and solve for the homography taking photo pixels to source
pixels. Writes photos.json beside the images.

Why a homography and not a rectangle: you stood to one side of the case, so the
near edge of the painting is larger than the far edge. That is projective. The
rectangle is derived and stored too, because every cheap question -- is this in
view, what covers this point -- wants a rectangle.

Why it reports its own confidence: silk has a repeating weave and a scroll has a
hundred similar rocks, so a matcher WILL produce confident nonsense if allowed.
Below the inlier threshold a photograph is left unplaced rather than guessed at.
"""
import argparse, json, os, sys, glob, math
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAINTINGS = os.path.join(ROOT, "assets", "paintings")

# A photograph is a few thousand pixels of one small area; the scan is tens of
# thousands across the whole scroll. Both go to a common working scale, or SIFT
# spends its life on a scale difference it was only meant to tolerate.
WORK_LONG_EDGE = 1400          # photo
MIN_INLIERS = 18               # below this, we do not know where it is
MIN_INLIER_RATIO = 0.18

def load_scan(slug):
    """Stitch the painting back from its tiles, at a workable scale."""
    d = os.path.join(PAINTINGS, slug)
    man = open(os.path.join(d, "manifest.js"), encoding="utf-8").read()
    man = json.loads(man[man.index("{"): man.rindex("}") + 1])
    vert = man.get("axis") == "v"
    W, H = man["w"], man["h"]
    scale = min(1.0, 6000.0 / (H if vert else W))
    out = np.zeros((int(H * scale) + 2, int(W * scale) + 2), np.uint8)
    pos = 0
    for t in man["tiles"]:
        im = cv2.imread(os.path.join(d, "tiles", t["f"]), cv2.IMREAD_GRAYSCALE)
        if im is None:
            continue
        if vert:
            h = int(round(t["w"] * scale))
            im = cv2.resize(im, (out.shape[1], max(1, h)), interpolation=cv2.INTER_AREA)
            out[int(pos * scale):int(pos * scale) + im.shape[0], :im.shape[1]] = im[:out.shape[0] - int(pos * scale)]
        else:
            w = int(round(t["w"] * scale))
            im = cv2.resize(im, (max(1, w), out.shape[0]), interpolation=cv2.INTER_AREA)
            out[:, int(pos * scale):int(pos * scale) + im.shape[1]] = im[:, :out.shape[1] - int(pos * scale)]
        pos += t["w"]
    return out, scale, (W, H)

def register(photo_path, scan, sift, scan_kp, scan_des, scale):
    img = cv2.imread(photo_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    k = WORK_LONG_EDGE / max(img.shape)
    small = cv2.resize(img, (int(img.shape[1] * k), int(img.shape[0] * k)), interpolation=cv2.INTER_AREA)
    # gallery light is dim and uneven; equalising makes the ink comparable
    small = cv2.createCLAHE(2.0, (8, 8)).apply(small)
    kp, des = sift.detectAndCompute(small, None)
    if des is None or len(kp) < 12:
        return None
    matcher = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 5}, {"checks": 64})
    pairs = matcher.knnMatch(des, scan_des, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < MIN_INLIERS:
        return {"ok": False, "why": f"only {len(good)} good matches"}
    src = np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([scan_kp[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0, maxIters=8000, confidence=0.995)
    if H is None:
        return {"ok": False, "why": "no homography"}
    inl = int(mask.sum())
    ratio = inl / len(good)
    if inl < MIN_INLIERS or ratio < MIN_INLIER_RATIO:
        return {"ok": False, "why": f"{inl} inliers of {len(good)} ({ratio:.0%})"}
    # photo(working px) -> scan(working px) -> source px
    S1 = np.diag([k, k, 1.0]).astype(np.float64)          # full photo -> working
    S2 = np.diag([1 / scale, 1 / scale, 1.0])             # working scan -> source
    Hfull = S2 @ H @ S1
    h, w = img.shape
    corners = cv2.perspectiveTransform(
        np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2), Hfull).reshape(4, 2)
    xs, ys = corners[:, 0], corners[:, 1]
    box = [float(xs.min()), float(ys.min()), float(xs.max() - xs.min()), float(ys.max() - ys.min())]
    area = 0.5 * abs(sum(xs[i] * ys[(i + 1) % 4] - xs[(i + 1) % 4] * ys[i] for i in range(4)))
    return {"ok": True, "H": Hfull.tolist(), "box": [round(v) for v in box],
            "corners": [[round(float(x)), round(float(y))] for x, y in corners],
            "inliers": inl, "matches": len(good), "ratio": round(ratio, 3),
            "ppsp": round(math.sqrt((w * h) / area), 2) if area > 1 else None}

def do_slug(slug, write):
    d = os.path.join(PAINTINGS, slug, "photos")
    files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg")))
    if not files:
        print(f"{slug}: no photographs"); return
    print(f"{slug}: {len(files)} photographs — stitching the scan…", flush=True)
    scan, scale, (W, H) = load_scan(slug)
    sift = cv2.SIFT_create(nfeatures=0, contrastThreshold=0.02)
    scan_kp, scan_des = sift.detectAndCompute(scan, None)
    print(f"  scan {scan.shape[1]}x{scan.shape[0]} at {scale:.3f} · {len(scan_kp)} features", flush=True)
    items, placed = [], 0
    for i, f in enumerate(files, 1):
        r = register(os.path.join(d, f), scan, sift, scan_kp, scan_des, scale)
        if r and r.get("ok"):
            placed += 1
            items.append({"file": f, "box": r["box"], "corners": r["corners"], "H": r["H"],
                          "ppsp": r["ppsp"], "inliers": r["inliers"], "ratio": r["ratio"]})
            print(f"  [{i:>3}/{len(files)}] {f}  x{r['box'][0]}  {r['inliers']} inliers ({r['ratio']:.0%})  {r['ppsp']}px/src", flush=True)
        else:
            why = (r or {}).get("why", "unreadable")
            print(f"  [{i:>3}/{len(files)}] {f}  unplaced — {why}", flush=True)
    print(f"  placed {placed} of {len(files)}")
    if write:
        json.dump({"slug": slug, "srcW": W, "srcH": H, "items": items},
                  open(os.path.join(d, "photos.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"  wrote {slug}/photos/photos.json")

ap = argparse.ArgumentParser()
ap.add_argument("--slug"); ap.add_argument("--all", action="store_true")
ap.add_argument("--write", action="store_true")
a = ap.parse_args()
slugs = [a.slug] if a.slug else (
    [s for s in sorted(os.listdir(PAINTINGS))
     if not s.startswith("_") and os.path.isdir(os.path.join(PAINTINGS, s, "photos"))] if a.all else [])
if not slugs:
    sys.exit("need --slug <name> or --all")
for s in slugs:
    do_slug(s, a.write)
