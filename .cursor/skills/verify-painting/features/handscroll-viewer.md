# Handscroll viewer

The default page (`/`, `index.html`, painting `qianli`) is a full-height handscroll of 王希孟《千里江山图》. It arrives already unrolled to the **right** of the silk (frontispiece / mounting just off-screen), in Pane / 展卷. The painting is 21 full-height JPEG strips in `#rail`, not one image. The user travels toward the colophon (left) by dragging the geometric rolls `#rollL` / `#rollR` or by wheeling over `#window`; further strips lazy-load as they approach.

## Sub-features

- Open-at-right: `x0 ≈ contentRight - visW` (41071 − visible source width); `#rail` translate3d `tx` is a large negative number; `tile-20.jpg` decoded; `tile-00.jpg` not.
- 21 absolutely positioned strips (`measure()` sets integer `left`/`width` on each `#rail img`). Filenames `tile-00.jpg`…`tile-20.jpg` from `assets/scroll/manifest.js`. Last five (`tile-16`…`tile-20`) `loading=eager`; the rest `lazy`.
- Unroll toward the colophon: drag `#rollR` to the right (or wheel `#window` with negative `deltaY`). `tx` increases; new `/assets/scroll/tiles/tile-NN.jpg` requests appear for NN &lt; 16.
- Rolls visible in pane at Z=1 (`#rollL` / `#rollR` opacity &gt; 0). They fade when zoomed (`render()`).

## How to get to it (user POV)

1. From a cold browser: open `/` on the launched origin (or from the cabinet, click the 千里江山圖 cell — see cabinet.md).
2. Wait until the silk is visible inside `#window` and the right-hand `#panel` shows zoom stops.
3. To travel: grab the right roll and pull right, or scroll/wheel over the painting. Do not click-drag the silk itself at Pane — that frames a Detail zoom.

## Driving it with control

Preconditions: `bin/launch --evidence seed` succeeded; `bin/doctor` exited 0; `npm install --prefix .cursor/skills/verify-painting` done; Chrome profile is the one launch created (empty localStorage).

- **Open the scroll (user loads the viewer)**
  - Command: `.cursor/skills/verify-painting/bin/control open /`
  - Observable: JSON `url` is `http://127.0.0.1:<PORT>/`; `BUILD` equals checkout `window.BUILD` in `index.html`; `mode` is `"pane"`; `tileCount` is 21; `painting.slug` is `"qianli"`; `openAtRight` is `true`; `completeFiles` includes `tile-20.jpg` and does not include `tile-00.jpg`; `tx` &lt; -8000.

- **Record arrival (screenshot + ARIA + state)**
  - Command: `.cursor/skills/verify-painting/bin/control capture open-at-right`
  - Observable: files `open-at-right.png`, `open-at-right.aria.yml`, `open-at-right.state.json` under the run `evidence_dir`. State repeats `openAtRight: true`, `chrome.rollL`/`rollR` true, `rolls.L.opacity` and `rolls.R.opacity` &gt; 0.

- **Unroll toward the colophon until a lazy tile is requested**
  - User action: pull `#rollR` to the right, repeatedly, as if drawing more silk from the right roll.
  - Command: `.cursor/skills/verify-painting/bin/control unroll --dx 700 --until-tile 15 --max-steps 16`
  - Observable: JSON `ok` true; `movedTowardColophon` true on steps; `tx` greater than at arrival; `tileHttpFiles` contains `tile-15.jpg` (a strip with `loading=lazy`, left of the eager 16–20 group). If `ok` is false with “tx did not increase”, stop — do not flip to dragging `#window`.

- **Record the post-unroll state**
  - Command: `.cursor/skills/verify-painting/bin/control capture after-unroll`
  - Observable: `after-unroll.state.json` has more `tileHttpFiles` than `open-at-right.state.json`; `openAtRight` is now false (view has left the right-hand arrival); `#track .stop[data-k="pane"]` still `on` (`mode` remains `"pane"`).

- **Optional check that silk-drag is not unroll**
  - Do **not** `control drag '#window'` at this zoom. That path is zoom-stops / Detail.

## Gotchas

- README says tiles are positioned in `layout()`; the function in `index.html` is `measure()`. Believe the code.
- Opening at the right means the **eager** tiles are the right-hand ones (16–20), not tile-00. Lazy-load proof is “a file ≤ tile-15.jpg appears in resource timing after unroll”, not “tile-20 loaded”.
- At Pane, pointer-drag on `#window` is a marquee → `mode='custom'` and a fourth stop. That is not unroll.
- `VERT` paintings (`?p=qinglan`, hanging scroll) open at `x0=0` and hide the rolls (`body.vert`). This feature is the default `qianli` handscroll.
- `#bleed` covers the window until `tile-20` loads (or 4s). Capture after `open` already waited; if a screenshot is a flat dark rectangle, wait longer (`control wait-ms 1000`) and recapture.
- Never replace the 21 strips with one 41783-px JPEG to “simplify” a test.
