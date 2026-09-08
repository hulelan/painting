#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ask every painting whether a photograph belongs to it, and where.

    python3 tools/classify_photos.py            # report
    python3 tools/classify_photos.py --write    # write photos.json per painting

This does the identifying and the placing in one pass, and it settles both with
the same evidence: a photograph belongs to the scroll whose scan it can be
warped onto. Six passes of looking got most of this right by eye, but eye
evidence -- a mount edge, a weave, a tree idiom -- turned out to be wrong in a
few places that this catches, because a homography that reprojects hundreds of
features to within a few pixels is not something a coincidence produces.

Two numbers decide it, and both must hold:
  inliers  -- RANSAC agreeing the geometry is consistent
  ncc      -- the warped photograph correlated against the scan underneath it.
              Inliers alone can be high on repeating silk weave; this is what
              says it landed on the right picture rather than a similar one.
"""
import json, os, sys, math, argparse
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
P = os.path.join(ROOT, "assets", "paintings")
WORK = 1400
MIN_INLIERS, MIN_RATIO, MIN_NCC = 25, 0.25, 0.35

def load_scan(slug):
    d = os.path.join(P, slug)
    m = open(os.path.join(d, "manifest.js"), encoding="utf-8").read()
    m = json.loads(m[m.index("{"): m.rindex("}") + 1])
    vert = m.get("axis") == "v"; W, H = m["w"], m["h"]
    sc = min(1.0, 6000.0 / (H if vert else W))
    out = np.zeros((int(H * sc) + 2, int(W * sc) + 2), np.uint8); pos = 0
    for t in m["tiles"]:
        im = cv2.imread(os.path.join(d, "tiles", t["f"]), cv2.IMREAD_GRAYSCALE)
        if im is None: continue
        if vert:
            hh = max(1, int(round(t["w"] * sc)))
            im = cv2.resize(im, (out.shape[1], hh), interpolation=cv2.INTER_AREA)
            o = int(pos * sc); out[o:o + im.shape[0], :] = im[:out.shape[0] - o]
        else:
            ww = max(1, int(round(t["w"] * sc)))
            im = cv2.resize(im, (ww, out.shape[0]), interpolation=cv2.INTER_AREA)
            o = int(pos * sc); out[:, o:o + im.shape[1]] = im[:, :out.shape[1] - o]
        pos += t["w"]
    return out, sc, W, H

def try_one(kp, des, img, scan, scan_kp, scan_des, sc, k):
    fl = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 5}, {"checks": 48})
    pairs = fl.knnMatch(des, scan_des, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < MIN_INLIERS: return None
    src = np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([scan_kp[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    Hm, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0, maxIters=6000, confidence=0.995)
    if Hm is None: return None
    inl = int(mask.sum()); ratio = inl / len(good)
    if inl < MIN_INLIERS or ratio < MIN_RATIO: return None
    h, w = img.shape
    Hf = np.diag([1/sc, 1/sc, 1.0]) @ Hm @ np.diag([k, k, 1.0])
    cs = cv2.perspectiveTransform(np.float32([[0,0],[w,0],[w,h],[0,h]]).reshape(-1,1,2), Hf).reshape(4,2)
    xs, ys = cs[:,0], cs[:,1]
    area = 0.5*abs(sum(xs[i]*ys[(i+1)%4]-xs[(i+1)%4]*ys[i] for i in range(4)))
    # correlate the warp against the scan: the only check that the picture agrees
    wsm = cv2.warpPerspective(cv2.resize(img,(int(w*k),int(h*k))), Hm, (scan.shape[1], scan.shape[0]))
    bx = cv2.perspectiveTransform(np.float32([[0,0],[w*k,0],[w*k,h*k],[0,h*k]]).reshape(-1,1,2), Hm).reshape(4,2)
    x0,y0 = max(0,int(bx[:,0].min())), max(0,int(bx[:,1].min()))
    x1,y1 = min(scan.shape[1],int(bx[:,0].max())), min(scan.shape[0],int(bx[:,1].max()))
    if x1-x0 < 20 or y1-y0 < 20: return None
    a = wsm[y0:y1, x0:x1].astype(np.float32); b = scan[y0:y1, x0:x1].astype(np.float32)
    m2 = a > 0
    if m2.sum() < 600: return None
    ncc = float(np.corrcoef(a[m2], b[m2])[0,1])
    return {"inliers": inl, "ratio": round(ratio,3), "ncc": round(ncc,3),
            "H": Hf.tolist(), "box": [round(float(xs.min())), round(float(ys.min())),
                                      round(float(xs.max()-xs.min())), round(float(ys.max()-ys.min()))],
            "ppsp": round(math.sqrt((w*h)/area),2) if area > 1 else None}

ap = argparse.ArgumentParser(); ap.add_argument("--write", action="store_true"); a = ap.parse_args()
slugs = [s for s in sorted(os.listdir(P)) if not s.startswith("_")
         and os.path.exists(os.path.join(P, s, "manifest.js"))]
print("loading", len(slugs), "scans…", flush=True)
sift = cv2.SIFT_create(nfeatures=0, contrastThreshold=0.02)
SC = {}
for s in slugs:
    scan, sc, W, H = load_scan(s)
    kp, des = sift.detectAndCompute(scan, None)
    SC[s] = (scan, sc, W, H, kp, des)
    print(f"  {s:<11} {scan.shape[1]}x{scan.shape[0]} · {len(kp)} features", flush=True)

photos = []
for s in sorted(os.listdir(P)):
    d = os.path.join(P, s, "photos") if not s.startswith("_") else os.path.join(P, s)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        if f.lower().endswith((".jpg", ".jpeg")) and f.startswith("IMG_"):
            photos.append((s, d, f))
print(f"\n{len(photos)} photographs\n", flush=True)

out, moved, unplaced = {}, [], []
for i, (folder, d, f) in enumerate(photos, 1):
    img = cv2.imread(os.path.join(d, f), cv2.IMREAD_GRAYSCALE)
    if img is None: unplaced.append((folder, f, "unreadable")); continue
    k = WORK / max(img.shape)
    sm = cv2.createCLAHE(2.0, (8,8)).apply(cv2.resize(img, (int(img.shape[1]*k), int(img.shape[0]*k)), interpolation=cv2.INTER_AREA))
    kp, des = sift.detectAndCompute(sm, None)
    best, bs = None, None
    if des is not None and len(kp) >= 12:
        for s in slugs:
            scan, sc, W, H, skp, sdes = SC[s]
            r = try_one(kp, des, img, scan, skp, sdes, sc, k)
            if r and r["ncc"] >= MIN_NCC and (best is None or r["ncc"]*r["inliers"] > best["ncc"]*best["inliers"]):
                best, bs = r, s
    if best:
        out.setdefault(bs, []).append(dict(file=f, **{q: best[q] for q in ("box","H","ppsp","inliers","ratio","ncc")}))
        if bs != folder: moved.append((folder, bs, f, best["ncc"], best["inliers"]))
    else:
        unplaced.append((folder, f, "no painting agreed"))
    if i % 25 == 0: print(f"  …{i}/{len(photos)}", flush=True)

print("\n=== placed ===")
for s in sorted(out): print(f"  {s:<11} {len(out[s]):>3}")
print(f"  unplaced   {len(unplaced):>3}")
if moved:
    print(f"\n=== {len(moved)} photographs answer to a different painting than the folder they are in ===")
    for a_, b_, f, n, inl in moved[:60]:
        print(f"  {f:<16} {a_:<10} -> {b_:<10} ncc {n}  {inl} inliers")
if a.write:
    for s in slugs:
        d = os.path.join(P, s, "photos"); os.makedirs(d, exist_ok=True)
        _,_,W,H,_,_ = SC[s]
        json.dump({"slug": s, "srcW": W, "srcH": H, "items": out.get(s, [])},
                  open(os.path.join(d, "photos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump([{"folder": a_, "file": f, "why": w} for a_, f, w in unplaced],
              open(os.path.join(P, "_unplaced.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\nwrote photos.json for each painting, and _unplaced.json")
