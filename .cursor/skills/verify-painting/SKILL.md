---
name: verify-painting
description: Drive the 千里江山图 / classicalchinesepainting.com handscroll viewer (static web UI) as a user would. Use when proving viewer, zoom, overlay, language-toggle, cabinet, or tile-loading behavior, or after any UI change.
---

# verify-painting

Agent-facing control skill for this checkout: a **static** GitHub Pages site (no `package.json`, no Makefile, no Playwright at site level, no API). Primary surface is the handscroll viewer in `index.html`. Sister poetry site is out of scope. `css/shell.css` is a cross-site tab-strip contract — do not edit it. Do not flatten the 21 JPEG strips under `assets/scroll/tiles/` into one image (mobile Safari decode caps).

Read this file cold. Commands below are from this repo, not a template. Re-read `index.html` / `cabinet.html` / `assets/scroll/manifest.js` if anything looks stale.

Helpers live under `.cursor/skills/verify-painting/`. The site root stays static; verification-only npm deps live in this skill directory.

```
SKILL=.cursor/skills/verify-painting
```

## Launch

There is no site start script. Serve the checkout with Python's stdlib HTTP server, bound to loopback, from the **repo root** (the directory that contains `index.html` and `assets/scroll/`).

```bash
$SKILL/bin/launch                  # free port >= 4173, fresh Chrome profile
$SKILL/bin/launch --evidence seed  # evidence lands in $SKILL/evidence/seed/
```

What it does (do not substitute a server you did not start):

1. Picks a free TCP port on `127.0.0.1` starting at **4173**, and a free CDP port starting at **9333**.
2. Runs `python3 -m http.server $PORT --bind 127.0.0.1` with cwd = repo root, `start_new_session=True`.
3. Creates a dedicated Chromium `--user-data-dir` at `$SKILL/.run/<run-id>/chrome-profile`. Starts system Chrome (`VERIFY_PAINTING_CHROME` or `/usr/bin/google-chrome`) headless on `about:blank` with `--remote-debugging-port=$CDP`. Never navigates to `https://classicalchinesepainting.com`.
4. Writes `$SKILL/.run/<run-id>/run.json` and copies it to `$SKILL/.run/current.json`. Doctor, control, and cleanup read that file. Fields: `run_id`, `base_url`, `port`, `server_pid`, `chrome_pid`, `cdp_url`, `user_data_dir`, `evidence_dir`, `repo_root`.

**Ready when all of these are true** (launch already waits; you can re-check):

- Server log `$SKILL/.run/<run-id>/server.log` contains:
  `Serving HTTP on 127.0.0.1 port <PORT>`
- `GET http://127.0.0.1:<PORT>/` → 200
- `GET http://127.0.0.1:<PORT>/assets/scroll/manifest.js` → 200
- `GET http://127.0.0.1:<CDP>/json/version` → 200

Stdout prints the run JSON. Two instances may run on different ports; each has its own run id / profile / PIDs. Point `VERIFY_PAINTING_RUN_FILE` at a specific `run.json` to select one.

Teardown is `bin/cleanup` (below). Launch itself rolls back PIDs if ready-checks fail.

First time this clone needs `control`:

```bash
npm install --prefix .cursor/skills/verify-painting
```

Do not add a package.json at the site root just to serve HTML.

## Doctor

Read-only. Answers: is **this** instance worth driving? Fail closed. Never health-check production as if it were the instance.

```bash
$SKILL/bin/doctor
```

Checks, all required:

| Check | What |
|---|---|
| Run file | `$SKILL/.run/current.json` (or `VERIFY_PAINTING_RUN_FILE`) exists and was written by launch |
| Bind / host | `bind=127.0.0.1`; `base_url` host is not `classicalchinesepainting.com` |
| Process up | `server_pid` alive; `/proc/<pid>/cmdline` contains `http.server`, the port, and `127.0.0.1` |
| Port owned by our PID | `lsof -iTCP:$PORT -sTCP:LISTEN` is **exactly** `server_pid` — extra listeners = shared = refuse |
| GET `/` | 200 |
| GET `/assets/scroll/manifest.js` | 200 |
| GET `/assets/scroll/tiles/tile-20.jpg` | 200, JPEG SOI, not a stub |
| BUILD | served `window.BUILD='…'` equals checkout `index.html` (`tools/stamp_build.py` stamps it; do not require it equal `git rev-parse --short HEAD` — this checkout can be one stamp behind HEAD) |
| 21 tiles | served `window.SCROLL.tiles` is 21 files `tile-00.jpg`…`tile-20.jpg`, no width ≥ 40000 (that would be a flattened huge image), widths sum to `SCROLL.w` (41783), disk listing matches |
| Chromium profile is ours | `chrome_pid` alive; cmdline contains this run's `user_data_dir` under `$SKILL/.run/<run-id>/chrome-profile` and the CDP port; CDP port owned by `chrome_pid`; CDP tab list has no production URL |

Exit 0 + `doctor: PASS` = drive it. Anything else = refuse. Do not fall back to a random `python3 -m http.server` or to the live site.

Live site `https://classicalchinesepainting.com` may be fetched **read-only** to compare BUILD string and tile count. That is not a doctor pass and not a drive target.

## Drive

Playwright against the run's `base_url` via CDP (Chrome already running). Selectors from this checkout, not coordinates.

```bash
$SKILL/bin/control --help
$SKILL/bin/control open /
$SKILL/bin/control click '#lang'
$SKILL/bin/control click '.persp[data-t="loc"]'
$SKILL/bin/control click '#track .stop[data-k="fold"]'
$SKILL/bin/control unroll --dx 700 --until-tile 15
$SKILL/bin/control capture open-at-right
$SKILL/bin/control state
```

`control` refuses absolute `http(s)` URLs and any origin other than the run file. Each invocation `process.exit`s after printing JSON: Playwright's CDP WebSocket otherwise holds the Node event loop, and `browser.close()` would kill the Chrome `bin/launch` started.

### Viewer chrome (`index.html`)

IDs present in the markup: `#room` `#desk` `#window` `#rail` `#rollL` `#rollR` `#fold` `#panel` `#track` `#corner` `#lang` `#back` `#title` `#loc` `#locBox` `#editor`.

Overlays (click toggles class `on` on the `.persp`; see the click handler on `.persp`):

- `.persp[data-t="loc"]` → `#loc` `display:block`, `#locBox` is the viewport mark
- `.persp[data-t="roads"]` → `#roads` SVG `display:block` (22 paths in `assets/data/roads.js` in this checkout)
- `.persp[data-t="notes"]` → noticed boxes `.nt` (4 items in `assets/data/notes.js`); gated by zoom unless `?notes=all`
- `.persp[data-t="write"]` `#editor` — localStorage notes; not required for viewer proofs
- `.persp[data-t="read"]` → `#script.on` colophon list
- `.persp[data-t="log"]` → `#log.on` room log

There is **no** `.persp[data-t="marks"]` in the HTML (Things overlay was removed; `THINGS=[]`).

### Zoom (`buildTrack()` in `index.html`)

Stops written into `#track` as `.stop[data-k=…]`:

| `data-k` | EN (`t('…')`) | 中 |
|---|---|---|
| `fold` | Whole | 全卷 |
| `wide` | Wide | 通幅 |
| `pane` | Pane | 展卷 |
| `custom` | Detail | 細看 |

`custom` is appended only after `customUsed` (marquee on `#window` at Z≈1, ctrl-wheel, or pinch). Default arrival: `let mode='pane'` then `setMode('pane')`. Keyboard: `1` fold, `2` wide, `3` pane, `4` custom if used. Active stop has class `on`.

Tile positioning is **`measure()`**, not a function named `layout()` (README still says `layout()`). Each `#rail img` is `position:absolute` with integer `left`/`width`. `loading='eager'` only for the last 5 tiles (indices ≥ length-5 → `tile-16.jpg`…`tile-20.jpg`); the rest are `lazy`.

### Open-at-right

After `measure(); applyLang();`:

```
x0 = VERT ? 0 : Math.max(0, CR - visW());   // CR = SCROLL.contentRight = 41071
```

Default painting is `qianli` (horizontal). The view sits at the **right** of the silk; mounting/frontispiece (`contentRight`…`w`) is just off-screen to the right. `render()` sets `#rail` `transform: translate3d(TX,TY,0) scale(Z)` with `TX = -x0 * scale * Z` — a large **negative** `tx` (typically < -8000 at 1400×900). Traditional unroll travels **left** toward the colophon (`tile-00.jpg`): dragging `#rollR` to the right decreases `x0`, so `tx` **increases** (becomes less negative).

**Do not drag `#window` at pane / Z=1** — that starts a marquee and becomes Detail (`mode='custom'`). Unroll with `#rollL`/`#rollR` or `wheel` on `#window`. Wheel: `x0 += d / (scale*Z) * 1.1` (positive delta moves toward the right / frontispiece; already clamped there on arrival).

### Language

`#lang` click cycles `ui` through `UI_NEXT = {zh:'en', en:'ico', ico:'zh'}` and writes `localStorage ccp_ui` always, `ccp_lang` when `ui` is not `ico`.

Default arrival is **pictograms**, not 中: `localStorage.getItem('ccp_ui')||'ico'`. Fresh profile → `body.icons`, words replaced by SVG, `#lang` **shows the next stop** which is `中`. Then: click → 中文 labels, `#lang` text `EN`; click → English labels, `#lang` has class `asIcon` (pictogram button); click → pictograms again, `#lang` text `中`.

`#back` is `<a id="back" href="cabinet.html" aria-label="Return to Cabinet">`. `applyLang()` overwrites aria-label with `t('back')`: `返回畫匣` (zh) or `Return to Cabinet` (en).

### Query flags (viewer)

From `index.html` (do not invent others as required):

- `?p=<slug>` — painting from `assets/data/paintings.js` (`qianli` default)
- `?bg=paper|silk|blush|dawn`
- `?rolls=a|b|c|e` (`d` is default; `a` restores the lit cylinder)
- `?font=a|c|d|e` (`b` is default)
- `?icons=1` — force pictograms
- also present, not in the original interview: `?notes=all`, `?roads=all`

Cabinet understands `?bg=` and `?font=` the same way; its `#lang` is **two**-stop 中↔EN (`ccp_lang` only).

### Isolation rules

- Drive `http://127.0.0.1:$PORT` from the run file only.
- Dedicated `--user-data-dir` under `$SKILL/.run/<run-id>/`.
- Never drive `https://classicalchinesepainting.com`.
- Never drive an `http.server` whose PID is not in the run file.
- Doctor must refuse a shared/unknown instance.

Feature recipes: `features/README.md` and the five files next to it.

## Evidence

Directory: `$SKILL/evidence/<run-id>/`. Launch `--evidence seed` uses `$SKILL/evidence/seed/` (committed proof). Other run-id dirs are gitignored. **Cleanup must not delete evidence.**

Proof standards:

1. Exercise the real user path: `click '#lang'`, `click '.persp[data-t=…]'`, `unroll` / `wheel '#window'`. Do not call `setMode`, `applyLang`, or write `x0` via `evaluate`.
2. Capture **action and resulting state**, not only the last frame: `control capture <stem>` writes `<stem>.png`, `<stem>.aria.yml`, `<stem>.state.json`.
3. Side effects to record in `state.json`:
   - tile HTTP: `performance.getEntriesByType('resource')` filtered to `/tiles/tile-NN.jpg` (`tileHttpFiles`)
   - `localStorage.ccp_lang` / `ccp_ui`
   - `.persp.on` / `#loc` display / `#roads` display
   - `#track .stop.on` → `mode`
   - `window.BUILD`
   - `tx` from `#rail` transform
4. No mocks. There is no viewer API boundary.

`control state` JSON fields used as pass/fail: `BUILD`, `mode`, `openAtRight`, `tx`, `tileCount` (21), `tileHttpFiles`, `completeFiles`, `overlays`, `bodyIcons`, `langText`, `localStorage`.

## Cleanup

```bash
$SKILL/bin/cleanup
```

Sends SIGTERM (then SIGKILL) to **the recorded `chrome_pid` and `server_pid` only** (`killpg` on the sessions launch started). Removes that run's `chrome-profile`. Unlinks `.run/current.json` if it points at this run. Prints `evidence: KEPT <path>`. Never `pkill python`, never `pkill chrome`. After cleanup, confirm `evidence/seed/` (or the run's evidence dir) still exists before calling the proof done.

If a drive fails, run cleanup before the next launch so ports/PIDs are not stranded.

## Helpers

All `chmod +x`. Invocations:

| Helper | Command |
|---|---|
| Launch | `.cursor/skills/verify-painting/bin/launch` |
| Launch + seed evidence path | `.cursor/skills/verify-painting/bin/launch --evidence seed` |
| Doctor | `.cursor/skills/verify-painting/bin/doctor` |
| Drive | `.cursor/skills/verify-painting/bin/control <verb> …` |
| Cleanup | `.cursor/skills/verify-painting/bin/cleanup` |

`control` verbs: `open`, `click`, `click-text`, `drag`, `wheel`, `unroll`, `press`, `wait`, `wait-ms`, `screenshot`, `snapshot`, `state`, `capture`, `eval`. Each prints JSON of the action and observable result.

Seed proof (handscroll-viewer only — see `features/handscroll-viewer.md`): launch → doctor → open `/` → capture `open-at-right` → unroll until a lazy left-of-eager tile is requested → capture `after-unroll` → cleanup → confirm `evidence/seed/` still has the png/aria/state files.
