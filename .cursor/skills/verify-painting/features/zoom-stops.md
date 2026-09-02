# Zoom stops

The right-hand panel (`#panel` → `#track`) is a number line of how much silk is in the window. Arrival is **Pane** (展卷): one roughly square window, full painting height, horizontal travel. **Whole** (全卷) folds the scroll into stacked bands (`#fold`). **Wide** (通幅) stretches the window to the viewport. **Detail** (細看) exists only after the user has framed a region (marquee) or pinched/ctrl-wheeled; it is the `custom` stop.

## Sub-features

- Three stops on a cold load: `.stop[data-k="fold"|"wide"|"pane"]`. Pane has class `on`.
- Click a stop (or keys `1` / `2` / `3`) to change mode. `syncTrack()` moves `on`.
- Whole: `#desk` hidden, `#fold` `display:flex`, rows use `PAINTING.strip` (`assets/fold/strip.jpg` for qianli). Click a fold row to return to pane at that slice.
- Wide: `body.topbar`, window uses almost full viewport width (`measure()`).
- Detail: after a marquee on `#window` at Z=1 (drag a box ≥ 26×26 px), `customUsed=true`, `buildTrack()` appends `.stop[data-k="custom"]`, `mode='custom'`, `#window` has class `zoomed`.

## How to get to it (user POV)

Open the viewer (`/`). The zoom heading is `#hZoom` (hidden in pictogram default; the dots remain). Click a dot on the line, or press 1/2/3. To make Detail: at Pane, drag a rectangle on the painting, then release.

## Driving it with control

Preconditions: launch + doctor passed; `control open /` already done; still in pane (`control state` → `mode: "pane"`). Prefer `control click '#lang'` until `bodyIcons` is false if you need to read stop labels as 全卷/通幅/展卷 rather than SVGs — optional; `data-k` is the contract.

- **Confirm default Pane**
  - Command: `.cursor/skills/verify-painting/bin/control state`
  - Observable: `mode` is `"pane"`; `stops` is three entries `fold`, `wide`, `pane`; `pane.on` true; `deskDisplay` is `block`; `foldDisplay` is `none`.

- **Whole / 全卷**
  - User: click the Whole stop.
  - Command: `.cursor/skills/verify-painting/bin/control click '#track .stop[data-k="fold"]'`
  - Observable: `mode` `"fold"`; `foldDisplay` `"flex"`; `deskDisplay` `"none"`; `#fold .row` present (`control wait '#fold .row'`). Capture `zoom-fold`.

- **Wide / 通幅**
  - Command: `.cursor/skills/verify-painting/bin/control click '#track .stop[data-k="wide"]'`
  - Observable: `mode` `"wide"`; `deskDisplay` `"block"`; `foldDisplay` `"none"`; `bodyClasses` includes `topbar`; `#window` width is near the viewport (not the square pane). Capture `zoom-wide`.

- **Back to Pane / 展卷**
  - Command: `.cursor/skills/verify-painting/bin/control click '#track .stop[data-k="pane"]'`
  - Observable: `mode` `"pane"`; rolls opacity &gt; 0 again. Capture `zoom-pane`.

- **Detail / 細看 (creates the fourth stop)**
  - User: drag a box on the silk.
  - Command: `.cursor/skills/verify-painting/bin/control drag '#window' --dx 140 --dy 90`
  - Observable: `mode` `"custom"`; `stops` now includes `custom`; `#window.zoomed` (`zScale` &gt; 1.02). Capture `zoom-detail`.
  - If the drag was too small (&lt; 26×26 CSS px) the viewer ignores it — retry with larger `--dx/--dy`.

- **Keyboard equivalent (optional)**
  - Commands: `control press Digit1` → fold; `Digit2` → wide; `Digit3` → pane; `Digit4` → custom only after Detail exists.

## Gotchas

- Pictogram default replaces `.stop .lb` text with SVG (`iconise`); assert `data-k` and class `on`, not English/Chinese innerText.
- Detail is absent until `customUsed`. A recipe that clicks `#track .stop[data-k="custom"]` on a cold load is skipped, not failed.
- Wide and narrow viewports also set `body.topbar` (`innerWidth<=760`). Control uses 1400×900 so topbar on pane means something else went wrong.
- `setMode('fold')` is what the click handler calls — do not invoke it from `eval`.
