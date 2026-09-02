# Feature map — 千里江山图 viewer

Verification source for `.cursor/skills/verify-painting`. Drive the **local** instance from `bin/launch`. Do not treat https://classicalchinesepainting.com as the app under test.

## Baseline preconditions

Every drive starts from:

1. Cwd-independent: helpers resolve the repo as the directory that contains `index.html` and `assets/scroll/manifest.js`.
2. `npm install --prefix .cursor/skills/verify-painting` has been run once in this checkout (Playwright, skill-local only).
3. `bin/launch` (use `--evidence seed` when capturing the committed proof) printed `launch: ready http://127.0.0.1:<PORT>`.
4. `bin/doctor` exited 0. If it failed, **do not drive**. Cleanup, fix, relaunch.
5. Dedicated Chrome profile from that launch (empty `localStorage` → viewer default `ccp_ui` is pictograms / `ico`).
6. Viewport used by `control` is 1400×900.

Do not start a second ad-hoc `python3 -m http.server`. A second **launch** on another port is allowed; select it with `VERIFY_PAINTING_RUN_FILE`.

## Driving conventions

- Harness: `.cursor/skills/verify-painting/bin/control` (Playwright over the run's CDP).
- Selectors: CSS / Playwright locators from `index.html` and `cabinet.html` (ids, `data-t`, `data-k`, `aria-label`). No click-by-coordinates.
- User path only: click `#lang`, click `.persp`, click `#track .stop`, drag `#rollR` / wheel `#window`. Do not `evaluate` `setMode`, `applyLang`, or assign `x0`.
- After each meaningful action, `control capture <stem>` or `control state` so the proof has action + result.
- Isolation: `control open` takes a **site-relative** path (`/`, `/cabinet.html`, `/?p=qianli`). Absolute production URLs are refused.

## Proof / skip reporting

When reporting a drive:

- **proven** — doctor passed; the feature file's commands ran; evidence files exist at the named path; cleanup left them in place.
- **failed** — quote the helper JSON / doctor FAIL line; run `bin/cleanup`; do not claim success.
- **skipped** — only if a stated prerequisite is absent (example: Detail stop `#track .stop[data-k="custom"]` does not exist until a marquee/pinch zoom). Name the prerequisite and the route attempted.
- **verified-unreachable** — the UI path is gone from source (cite the file). That is map drift, not a product pass.

A proof that only opens `/` does not cover zoom, overlays, language, or cabinet. This map lists five features; the generator seed drives **one** (`handscroll-viewer`). Later runs should cover the rest.

## Feature index

| Feature | File | User-visible claim |
|---|---|---|
| Handscroll viewer | [handscroll-viewer.md](handscroll-viewer.md) | Opens at the right; 21 lazy JPEG strips; unroll toward the colophon loads further tiles; rolls present in pane |
| Zoom stops | [zoom-stops.md](zoom-stops.md) | Whole / Wide / Pane / Detail on `#track`; default Pane |
| Overlays | [overlays.md](overlays.md) | Locator, roads, noticed/notes via `.persp[data-t]` |
| Language toggle | [language-toggle.md](language-toggle.md) | `#lang` cycles pictograms → 中 → EN → pictograms (`ccp_ui` / `ccp_lang`) |
| Cabinet | [cabinet.md](cabinet.md) | Case at `cabinet.html`; open 千里江山圖; `#back` returns |

Out of scope for this map (exist in the repo, not linked from the case as primary): `trace.html` (the only editor, localStorage), `grid.html`, `classic.html`, `nav.html`. `css/shell.css` is not driven.
