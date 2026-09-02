# Language toggle

`#lang` is a three-stop control, not a bilingual switch. Stops are **pictograms** (default), **中**, and **EN**. The button label is always the *next* stop. Pictogram mode (`body.icons`) replaces panel words with SVG (`iconise`); `localStorage ccp_ui` holds the stop (`ico`|`zh`|`en`). `ccp_lang` is the last real language and is written only when leaving pictograms. Cycle in code: `UI_NEXT = {zh:'en', en:'ico', ico:'zh'}`.

## Sub-features

- Fresh profile: `ccp_ui` missing → `'ico'`. `body.icons` true. `#lang` text `中`, `aria-label` is `中文` (`t('uiZh')`). `#hZoom` / stop labels are icons. `#title` stays the Chinese name (`I18N.zh.title`).
- Click 1: `ui='zh'`, `ccp_ui=zh`, `ccp_lang=zh`. `#lang` text `EN`. Stop labels 全卷 / 通幅 / 展卷. `#hZoom` is `縮放`. `#back` aria-label `返回畫匣`. `htmlLang` `zh-Hans`.
- Click 2: `ui='en'`, `ccp_lang=en`. `#lang` has class `asIcon` (four-shape SVG). Labels Whole / Wide / Pane. `#hZoom` `Zoom`. `#back` aria-label `Return to Cabinet`. `htmlLang` `en`.
- Click 3: `ui='ico'` again. `ccp_lang` remains `en`. `body.icons` true. `#lang` text `中`.
- `?icons=1` forces pictograms regardless of storage.

## How to get to it (user POV)

Open `/`. The control is the small bordered button in `#corner` next to `#back`. Click it to walk 中 → EN → pictograms → 中 from the *next-stop* labels (starting from pictograms, the first thing you see on the button is `中`).

## Driving it with control

Preconditions: launch + doctor; `control open /` on a **fresh** profile (do not reuse a profile that already has `ccp_ui`). If `state.localStorage.ccp_ui` is already `zh` or `en`, launch a new instance instead of fighting storage.

- **Arrival is pictograms**
  - Command: `.cursor/skills/verify-painting/bin/control state`
  - Observable: `bodyIcons` true; `langText` is `"中"`; `langAsIcon` false; `localStorage.ccp_ui` is `null` or `"ico"`. Capture `lang-ico`.

- **Click to 中文**
  - User: click `#lang`.
  - Command: `.cursor/skills/verify-painting/bin/control click '#lang'`
  - Observable: `bodyIcons` false; `langText` `"EN"`; `htmlLang` `"zh-Hans"`; `localStorage.ccp_ui` `"zh"`; `ccp_lang` `"zh"`; some stop `label` is `全卷` or `展卷` (if icons off). Capture `lang-zh`.

- **Click to English**
  - Command: `.cursor/skills/verify-painting/bin/control click '#lang'`
  - Observable: `langAsIcon` true; `htmlLang` `"en"`; `ccp_ui` `"en"`; `ccp_lang` `"en"`; a stop label `Pane` or `Whole`; `#back` `backAria` `"Return to Cabinet"`. Capture `lang-en`.

- **Click back to pictograms**
  - Command: `.cursor/skills/verify-painting/bin/control click '#lang'`
  - Observable: `bodyIcons` true; `langText` `"中"`; `ccp_ui` `"ico"`; `ccp_lang` still `"en"`. Capture `lang-ico-again`.

## Gotchas

- Interview shorthand “cycles 中 → EN → pictograms” is the stop order, **not** the default arrival. Default is pictograms (`||'ico'`). The button showing `中` means the next click *goes to* 中文.
- Cabinet `#lang` is only 中↔EN and only writes `ccp_lang`. A cabinet visit can leave `ccp_lang=en` while the viewer still defaults `ccp_ui` to ico on first viewer load. Viewer does not adopt cabinet language until the user leaves ico (comment in `index.html` above `ccp_ui`).
- Do not set `localStorage` from `eval` to fake a language proof.
- `#lang.asIcon` innerHTML is an SVG; `textContent` may be empty-ish — use `langAsIcon` and `aria-label` (`pictograms — no words` / `圖示 —— 不用文字` depending on `ccp_lang`).
