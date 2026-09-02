# Overlays (locator, roads, noticed)

The Perspectives list under `#hPersp` layers extra drawings on the silk. Three that a reader uses without writing: **Locator** (卷影) — a strip of the whole scroll with `#locBox` showing the window; **Roads** (道路) — traced paths that draw in as you unroll onto them; **Noticed** (所见 / 所見) — boxes and remarks from `assets/data/notes.js`. Clicking the row toggles class `on` on that `.persp`.

## Sub-features

- Locator: `.persp[data-t="loc"]` toggles `showLoc`; `#loc` goes from `display:none` to `block`; `#loc img` is `assets/nav/strip.jpg`; `#locBox` width tracks `visW()/SCROLL.w`. Drag on `#loc` seeks (`seek()`).
- Roads: `.persp[data-t="roads"]` toggles `showRoads` only if `ROADS.length` (22 paths in this checkout). `#roads` SVG becomes `display:block`. Paths light via `drawIn()` when their x-range meets the window (`?roads=all` shows every path immediately).
- Noticed: `.persp[data-t="notes"]` toggles `showNotes` if `NOTES.length` (4 published items). Boxes are `.nt`. At Pane Z=1, `noteWeight()` is 0 so boxes stay hidden and `#zhint` may read `放大即見所書` (or the English string). Zoom in or open `/?notes=all` to see them.
- Also in the DOM, not this feature’s proof: `write` (`#editor`), `read` (`#script.on`), `log` (`#log.on`). No `data-t="marks"` node.

## How to get to it (user POV)

Open `/`. In the right panel, click 卷影 / Locator (or the frame pictogram), 道路 / Roads, 所见 / Noticed. Locator appears as a thin strip near the bottom (or top when `body.topbar`). Roads are pale lines on the silk. Noticed needs zoom.

## Driving it with control

Preconditions: launch + doctor; `control open /`. Default pictograms still click the same `.persp[data-t=…]` rows.

- **Locator on**
  - User: click Locator.
  - Command: `.cursor/skills/verify-painting/bin/control click '.persp[data-t="loc"]'`
  - Observable: that persp has `on: true` in `overlays`; `locDisplay` is `"block"`; `#locBox` exists (`chrome.locBox`). Capture `overlay-loc`. Click the same selector again to turn it off (`locDisplay` `"none"`, `on: false`).

- **Roads on**
  - Command: `.cursor/skills/verify-painting/bin/control click '.persp[data-t="roads"]'`
  - Observable: persp `roads` `on: true`; `roadsDisplay` is `"block"` (not `none`). Near the right-hand arrival some paths should already intersect the window (path id 1 in `roads.js` starts near x=40976). Capture `overlay-roads`.

- **Noticed on at Pane (expect zoom gate)**
  - Command: `.cursor/skills/verify-painting/bin/control click '.persp[data-t="notes"]'`
  - Observable: persp `notes` `on: true`; `noteCount` may be 0; `zhint` may be `放大即見所書`. This is the real user result at Pane, not a failure. Capture `overlay-notes-pane`.

- **Noticed boxes actually visible**
  - User: either marquee-zoom (see zoom-stops) then click notes, or reload with the existing flag.
  - Command: `.cursor/skills/verify-painting/bin/control open '/?notes=all'` then `click '.persp[data-t="notes"]'` then unroll/seek toward x≈32428 (the published notes cluster) if they are not in the arrival window.
  - Observable: `noteCount` ≥ 1; `.nt` visible. Capture `overlay-notes-visible`.
  - Skip with reason if you cannot bring x≈32428 on screen without `eval` of `x0` — prefer `click` on `#loc` after locator is on (`control drag '#loc' --dx -200`) rather than internal setters.

## Gotchas

- `.persp.off` means empty data (`ROADS.length===0` or `NOTES.length===0`). On `qianli` both lists are populated; on another `?p=` slug roads/notes files may 404 (`onerror` silent) and the row stays `off` / click no-ops.
- Roads off-screen do nothing visible until you unroll onto them — that is intentional (`litRoads`), not a broken toggle. `#roads` `display:block` is the overlay-on proof; individual path draw-in is extra.
- Notes at Z≤1.25 are intentionally invisible. Do not “fix” the proof by calling `showNotes` from `eval`.
- `body.vert` hides `.persp[data-t="loc"]`. Stick to default `qianli`.
