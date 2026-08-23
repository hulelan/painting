# 千里江山图 · classicalchinesepainting.com

A full-resolution, full-screen viewer for 王希孟《千里江山图》 (*A Thousand Li of
Rivers and Mountains*, Northern Song, ink and colour on silk).

Sister site to [诗渊 · classicalchinesepoetry.com](https://classicalchinesepoetry.com) —
the two are linked only by the tab strip at the top of every page.

## Pages

| Page | What it is | Can you edit anything on it? |
|---|---|---|
| `index.html` | The viewer. Full-height handscroll, opens at the right. Four zooms (whole / wide / pane / detail), three overlays (locator, things, roads). Toggle cycles 中 → EN → pictograms. `?bg=` `?rolls=` `?font=` `?icons=1`. | No — read-only |
| `cabinet.html` | The case. Two doors: this scroll, and the poetry site. | No |
| `trace.html` | The workbench. Two modes: **Roads** (draw polylines) and **Objects** (draw a box, give it a title and a note). Everything lives in this browser's localStorage. `?review` opens a scratch copy for correcting machine proposals; `?load=<name>` pulls a named trace. | **Yes — this is the only page you can edit on** |
| `grid.html` | 叠卷 — the scroll folded into four bands, whole composition at once. Predates the viewer. | No |
| `classic.html` | 展卷 — the first scrolling viewer. Superseded by `index.html`. | No |
| `nav.html` | 导览 — viewer with a thumbnail strip. Superseded. | No |
| `view.html` | A redirect to `./`, kept so old links work. | — |

`grid`, `classic` and `nav` are reachable only if you know the filename; the
cabinet links to `index.html` alone.

## The five ways something gets added

1. **Roads mode**, `trace.html` — you draw the geometry.
2. **Objects mode**, `trace.html` — you draw a box and write a note on it.
3. **Review mode**, `trace.html?review` — you correct a machine proposal instead
   of drawing from scratch.
4. **A model sweep** — Qwen over the tiles via OpenRouter, run offline. Produces
   `*_qwen.js` proposals, never live data.
5. **A commit** to `assets/data/*.js` — the only thing the public site reads.

Everything in 1–4 is a draft. Step 5 is the publication, and it is a commit, so
it is reviewable and revertible. There is no path from a browser to the live site
that skips it.

## The eight ways work leaves a browser

localStorage is per-device and never syncs, so a trace made on a phone is
invisible on a laptop until one of these is used.

| Button | Carries | Needs |
|---|---|---|
| Export roads.js | roads only | — |
| Copy JSON | roads only | — |
| Copy my edits | roads only, as a diff vs the published file | — |
| Send to Claude | roads only | a local server (`POST /_save`); dead on GitHub Pages |
| Publish… | roads **and** notes | opens a prefilled GitHub issue; also copies to clipboard |
| Copy device link | roads **and** notes | nothing — the payload rides in a `#w=` fragment, never sent to any server |
| Sync | roads **and** notes | the Cloudflare worker in `tools/`, **not yet deployed** |
| Load by name… | pulls a named trace in | a file under `assets/data/wip/`, committed by hand |

Note the split: the first four drop notes silently. Use Publish, the device link,
or Sync if you have annotated anything.

## Two gaps, stated plainly

- **Annotations have no way onto the site.** The viewer loads `things.js` — the
  object catalogue — but nothing loads notes. An annotation written in Objects
  mode can reach a commit, and stops there. Rendering it needs a `notes.js` and
  a panel in the viewer; neither exists yet.
- **Sync is a file, not a service.** `tools/sync-worker.js` is written and the
  button calls it, but until it is deployed to a Cloudflare account the only
  cross-device routes are the device link and a hand-committed named trace.

## Views (original note)

| Tab | File | What it is |
|---|---|---|
| 展卷 | `index.html` | Immersive full-height scroll. Opens at the right and unrolls leftward, the way a handscroll is actually read. |
| 叠卷 | `grid.html` | The whole scroll folded into four equal bands — rightmost (the opening) on top, leftmost (the end) at the bottom — so the entire composition is visible at once. |

## Structure

```
index.html            展卷 — immersive viewer
grid.html             叠卷 — four-band overview
css/shell.css         two-layer tab strip, shared with the poetry site
assets/scroll/
  manifest.js         window.SCROLL — dimensions + tile list
  tiles/tile-NN.jpg   21 full-height strips, 2048px wide (24 MB total)
assets/grid/row-N.jpg 4 downscaled bands (2.8 MB total)
CNAME                 classicalchinesepainting.com
```

## Why the scroll is tiled

The source image is **41783 × 1673 px** (~70 MP, 25.8 MB). Served as one file it would
be downsampled by mobile Safari (which caps decoding around 16k px / 16 MP) and force a
25 MB one-shot download. It is therefore sliced into 21 full-height strips laid
edge-to-edge, so the browser lazy-loads only the strips actually scrolled to.

Strips are positioned **absolutely at integer offsets computed in JS** (`layout()` in
`index.html`) rather than flowed inline. At an arbitrary viewport height the scale factor
is fractional, and inline-flowed strips land on sub-pixel boundaries that render as
hairline seams; snapping each boundary to a shared integer eliminates them.

## Provenance

Original scan: 故宫博物院 (The Palace Museum), DeepZoom tile pyramid at
`dpm.org.cn/Uploads/tilegenerator/dest/files/image/8831/2009/2121/img0065.xml`
(`TileSize="256" Overlap="1" Width="41783" Height="1673"`).

The full-resolution image was reconstructed from all 1,148 level-16 tiles (164 × 7 grid),
trimming the 1px overlap on each interior edge. Alignment was verified against the
museum's own tiles: correct placement scores MAE ≈ 1.6 against re-fetched source tiles,
versus ≈ 4.7 for any ±1px shift — a decisive margin confirming the stitch is pixel-exact
at both an interior tile and the far-right edge tile.

The rightmost ~712 px of the scan is mounting silk and frontispiece rather than painting,
so `manifest.js` records `contentRight: 41071` and the viewer opens on the artwork with
the frontispiece just off-screen to the right.

Faint residual discontinuities remain measurable at 256px intervals (~1.29× the local
adjacent-pixel difference). These are baked into the museum's individually JPEG-compressed
tiles and are not a stitching error; they are not removable from this source.

## Regenerating the tiles

From a stitched `img0065_full_41783x1673.jpg` (macOS, no dependencies):

```bash
# 21 full-height strips
W=41783; H=1673; TW=2048; i=0; x=0
while [ $x -lt $W ]; do
  w=$TW; rem=$((W-x)); [ $rem -lt $TW ] && w=$rem
  sips -s format jpeg -s formatOptions 86 -c $H $w --cropOffset 0 $x src.jpg \
       --out "assets/scroll/tiles/$(printf 'tile-%02d.jpg' $i)"
  x=$((x+w)); i=$((i+1))
done
```

Tile widths must sum to exactly 41783; `manifest.js` must be updated to match.

### ⚠️ `sips --cropOffset 0 0` is broken — do not use it

When **both** offsets are zero, `sips` silently ignores `--cropOffset` and returns a
**centre crop** instead of the top-left crop. The loop above therefore produces a
`tile-00.jpg` containing the middle of the painting rather than its left end. This is
not hypothetical: it shipped, and it replaced the entire colophon section (蔡京's
inscription and the imperial seals at the scroll's end) with a duplicate of the middle.

Verified behaviour on macOS 15:

```
sips -c 1673 2048 --cropOffset 0 0 src.jpg   # -> MAE 1.93 vs the CENTRE, 91.98 vs left edge
```

Flag order does not help. To crop anchored at x=0, flip horizontally, crop at a non-zero
offset, then flip back (use PNG intermediates so no extra JPEG generation is added):

```bash
sips -s format png -f horizontal src.jpg --out flip.png
sips -s format png -c 1673 2048 --cropOffset 0 $((41783-2048)) flip.png --out c.png
sips -s format png -f horizontal c.png --out t00.png
sips -s format jpeg -s formatOptions 86 t00.png --out assets/scroll/tiles/tile-00.jpg
```

The same trap applies to `assets/grid/row-3.jpg` (the leftmost band).

**Always verify after regenerating** by comparing each tile against the master, and the
master against the museum's own tiles. A correct tile scores MAE ≈ 0.4–0.9 against the
master; wrong content scores ≈ 90.

## Copyright

The painting is in the public domain. The digitised scan is published by the Palace
Museum; this site presents it for study and appreciation.
