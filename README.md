# 千里江山图 · classicalchinesepainting.com

A full-resolution, full-screen viewer for 王希孟《千里江山图》 (*A Thousand Li of
Rivers and Mountains*, Northern Song, ink and colour on silk).

Sister site to [诗渊 · classicalchinesepoetry.com](https://classicalchinesepoetry.com) —
the two are linked only by the tab strip at the top of every page.

## Views

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

## Copyright

The painting is in the public domain. The digitised scan is published by the Palace
Museum; this site presents it for study and appreciation.
