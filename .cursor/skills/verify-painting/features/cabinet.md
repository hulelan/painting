# Cabinet (the case)

`cabinet.html` is the front door: a grid of compartments (`#grid` `.cell`) built from `window.PAINTINGS` plus a 诗渊 / Shi Yuan cell that leaves this origin. The first ready cell is 千里江山圖 (`slug: qianli`). Clicking it goes to `./?p=qianli`. From the viewer, `#back` (`href="cabinet.html"`) returns to the case.

## Sub-features

- Case chrome: `#room` `#geo` `#h1` `#sub` `#grid` `#lang`. Default language `ccp_lang||'zh'`: `#h1` is `畫　匣`, `#lang` shows `EN`.
- Ready paintings are `.cell.open` with `.name` / `.meta`. 千里江山圖 is the first register entry with `dir: 'assets/scroll'`.
- Open: click that cell → `/?p=qianli` (plus any existing query string). Viewer `#title` / `document.title` is 千里江山圖 (or the English title if `ccp_ui` is `en`).
- Back: viewer `<a id="back" href="cabinet.html">`; aria-label from `applyLang()`.
- Legacy `classic.html` is linked from cabinet as `#classic` (“舊版” / “classic view”) but is not the case’s primary door. `grid.html` / `nav.html` are not linked from the cabinet.

## How to get to it (user POV)

Open `/cabinet.html` (or click `#back` from the viewer). Read the grid. Click 千里江山圖. Use the ‹ control in the viewer corner to return.

## Driving it with control

Preconditions: launch + doctor. Fresh profile → cabinet zh.

- **Open the case**
  - Command: `.cursor/skills/verify-painting/bin/control open /cabinet.html`
  - Observable: JSON `url` ends with `/cabinet.html`; page `#h1` (use `control state` → `title` `畫　匣` or `The Case` if `ccp_lang=en`); `cabinetCells` has an entry `{name: "千里江山圖", open: true}` (zh) or `{name: "A Thousand Li of Rivers and Mountains", open: true}` (en). Capture `cabinet-case`.

- **Open 千里江山图**
  - User: click that compartment.
  - Command: `.cursor/skills/verify-painting/bin/control click-text '.cell.open' '千里江山圖'`
  - Observable: `href` contains `p=qianli` (or is `/` / `/?p=qianli`); `painting.slug` `"qianli"`; `#window` / `#rail img` present; `mode` `"pane"`. Capture `cabinet-open-qianli`.
  - If the profile is already English, use `click-text '.cell.open' 'A Thousand Li of Rivers and Mountains'` instead.

- **Back to the case**
  - User: click the ‹ control.
  - Command: `.cursor/skills/verify-painting/bin/control click '#back'`
  - Observable: `href` path is `/cabinet.html`; `#grid .cell` visible again. Capture `cabinet-back`. `#back` in the viewer is `a#back[href="cabinet.html"]` with `aria-label` `返回畫匣` or `Return to Cabinet`.

## Gotchas

- Cells are JS-generated; there is no static `<a href="index.html">千里江山圖</a>`. `click-text` on `.cell.open` is the user path.
- `entries()` appends query flags from the cabinet URL onto `./?p=<slug>`. Opening `cabinet.html?bg=paper` then the cell yields `/?p=qianli&bg=paper`.
- The poetry cell navigates **off origin** to `https://classicalchinesepoetry.com/`. Do not click it during a drive; control would then be on a foreign host — doctor/control isolation forbids that.
- Several cells are `.cell.shut` (no scan). They are not a viewer failure.
- Cabinet language is two-stop and does not understand pictograms. Mixing cabinet `#lang` with viewer `#lang` shares `ccp_lang` only.
