#!/usr/bin/env node
/**
 * Drive the local handscroll viewer through Playwright over this run's CDP.
 *
 * Refuses any host other than the run file's 127.0.0.1 base_url.
 * Never opens https://classicalchinesepainting.com.
 *
 * Usage: see `control --help`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_CURRENT = path.join(SKILL_ROOT, ".run", "current.json");
const PROD = /classicalchinesepainting\.com/i;

const HELP = `control — drive the painting viewer as a user would (Playwright over this run's CDP)

Requires: bin/launch then bin/doctor (must pass). Install once:
  npm install --prefix ${SKILL_ROOT}

Usage:
  control open <path>                 Go to this run's BASE_URL + path
                                      path is site-relative: /  /cabinet.html  /?p=qianli
  control click <selector>            Click first Playwright locator match
  control click-text <sel> <text>     Click first match whose text includes <text>
  control drag <selector> --dx N --dy N
  control wheel <selector> --dx N --dy N
  control unroll [--dx N] [--until-tile NN] [--max-steps N]
                                      Drag #rollR to the right (traditional unroll,
                                      toward the colophon / left of the painting).
                                      Repeat until tile-NN.jpg is requested, or once.
  control press <key>                 page.keyboard.press (e.g. Digit1, Escape)
  control wait <selector>             Wait for locator to be visible
  control wait-ms <ms>
  control screenshot <name.png>       Viewport PNG under the run evidence dir
  control snapshot <name.yml>         ARIA snapshot (body) under evidence dir
  control state [name.json]           Observed viewer state (JSON to stdout; optional file)
  control capture <stem>              screenshot + snapshot + state as stem.*
  control eval <js>                   page.evaluate; print JSON
  control --help

Selectors are CSS / Playwright locators from this checkout, not coordinates:
  #room #desk #window #rail #rollL #rollR #fold #panel #track #corner
  #lang #back #title #loc #locBox #editor
  #track .stop[data-k="fold"|"wide"|"pane"|"custom"]
  .persp[data-t="loc"|"roads"|"notes"|"write"|"read"|"log"]
  .cell.open  (cabinet.html)
  a#back[href="cabinet.html"]

Evidence lands in the run's evidence_dir (launch --evidence seed → evidence/seed/).
`;

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function loadRun() {
  const explicit = process.env.VERIFY_PAINTING_RUN_FILE;
  const p = explicit || RUN_CURRENT;
  if (!fs.existsSync(p)) {
    die(`control: no run file at ${p}. Run bin/launch first.`);
  }
  const run = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!run.base_url || !run.cdp_url) die("control: run file missing base_url/cdp_url");
  if (PROD.test(run.base_url) || PROD.test(run.cdp_url)) {
    die("control: run file points at production — refuse");
  }
  const host = new URL(run.base_url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    die(`control: refusing host ${host}. Drive only 127.0.0.1.`);
  }
  return run;
}

function evidenceDir(run) {
  const d = run.evidence_dir || path.join(SKILL_ROOT, "evidence", run.run_id);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function outPath(run, name) {
  if (!name) return null;
  if (path.isAbsolute(name)) return name;
  return path.join(evidenceDir(run), name);
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.flags.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith("--")) args.flags[key] = true;
      else {
        args.flags[key] = nxt;
        i++;
      }
    } else args._.push(a);
  }
  return args;
}

function num(v, dflt) {
  if (v === undefined || v === true || v === false) return dflt;
  const n = Number(v);
  if (Number.isNaN(n)) die(`control: not a number: ${v}`);
  return n;
}

/** In-page observer. Grounded in index.html: measure() positions tiles,
 *  render() writes #rail transform, buildTrack() writes #track .stop,
 *  applyLang() writes #lang / body.icons / localStorage ccp_ui + ccp_lang.
 *  There is no window.layout(); do not call internal setters. */
const OBSERVE = () => {
  const rail = document.getElementById("rail");
  const win = document.getElementById("window");
  const loc = document.getElementById("loc");
  const roads = document.getElementById("roads");
  const fold = document.getElementById("fold");
  const desk = document.getElementById("desk");
  const lang = document.getElementById("lang");
  const back = document.getElementById("back");
  const track = document.getElementById("track");
  const tf = rail ? rail.style.transform : "";
  const tm = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(tf);
  const sm = /scale\(([-\d.]+)\)/.exec(tf);
  const tx = tm ? parseFloat(tm[1]) : null;
  const ty = tm ? parseFloat(tm[2]) : null;
  const zScale = sm ? parseFloat(sm[1]) : null;
  const imgs = rail ? [...rail.querySelectorAll("img")] : [];
  const tiles = imgs.map((im, i) => {
    const src = im.getAttribute("src") || "";
    const file = src.split("/").pop();
    return {
      i,
      file,
      src,
      loading: im.loading || "",
      complete: !!im.complete,
      naturalWidth: im.naturalWidth || 0,
      currentSrc: im.currentSrc || "",
    };
  });
  const tileHttp = performance
    .getEntriesByType("resource")
    .filter((e) => /\/tiles\/tile-\d+\.jpg/.test(e.name))
    .map((e) => ({
      name: e.name,
      file: (e.name.split("/").pop() || "").split("?")[0],
      duration: Math.round(e.duration),
      transferSize: e.transferSize,
    }));
  const stopOn = track && track.querySelector(".stop.on");
  const stops = track
    ? [...track.querySelectorAll(".stop")].map((el) => ({
        k: el.dataset.k,
        on: el.classList.contains("on"),
        label: (el.querySelector(".lb") && el.querySelector(".lb").textContent) || "",
        aria: (el.querySelector(".lb") && el.querySelector(".lb").getAttribute("aria-label")) || "",
      }))
    : [];
  const persp = [...document.querySelectorAll(".persp")].map((el) => ({
    t: el.dataset.t,
    on: el.classList.contains("on"),
    off: el.classList.contains("off"),
  }));
  const cs = (id) => {
    const el = document.getElementById(id);
    return el ? getComputedStyle(el).display : null;
  };
  const roll = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { display: s.display, opacity: parseFloat(s.opacity), width: s.width };
  };
  const ls = {};
  try {
    ls.ccp_ui = localStorage.getItem("ccp_ui");
    ls.ccp_lang = localStorage.getItem("ccp_lang");
  } catch (e) {
    ls.error = String(e);
  }
  const completeFiles = tiles.filter((t) => t.complete && t.naturalWidth > 0).map((t) => t.file);
  const httpFiles = [...new Set(tileHttp.map((t) => t.file))].sort();
  const tile00 = tiles.find((t) => t.file === "tile-00.jpg");
  const tile20 = tiles.find((t) => t.file === "tile-20.jpg");
  // Open-at-right: render() sets translate3d(-x0*scale*Z, ...). Arrival is
  // x0 = contentRight - visW (index.html), so tx is a large negative number
  // and the right-end eager tiles (16–20) have decoded while tile-00 has not.
  const openAtRight =
    tx !== null &&
    tx < -8000 &&
    !!tile20 &&
    tile20.complete &&
    tile20.naturalWidth > 0 &&
    !!tile00 &&
    !(tile00.complete && tile00.naturalWidth > 0);
  return {
    BUILD: window.BUILD || null,
    href: location.href,
    path: location.pathname + location.search,
    title: document.title,
    htmlLang: document.documentElement.lang,
    painting: window.PAINTING
      ? { slug: window.PAINTING.slug, zh: window.PAINTING.zh, dir: window.PAINTING.dir }
      : null,
    scroll: window.SCROLL
      ? {
          w: window.SCROLL.w,
          h: window.SCROLL.h,
          contentRight: window.SCROLL.contentRight,
          tileCount: (window.SCROLL.tiles || []).length,
        }
      : null,
    mode: stopOn ? stopOn.dataset.k : null,
    stops,
    railTransform: tf,
    tx,
    ty,
    zScale,
    openAtRight,
    tileCount: tiles.length,
    tiles,
    completeFiles,
    tileHttp,
    tileHttpFiles: httpFiles,
    overlays: persp,
    locDisplay: loc ? getComputedStyle(loc).display : null,
    roadsDisplay: roads ? getComputedStyle(roads).display : null,
    foldDisplay: fold ? getComputedStyle(fold).display : null,
    deskDisplay: desk ? getComputedStyle(desk).display : null,
    windowSize: win ? { w: win.clientWidth, h: win.clientHeight } : null,
    langText: lang ? lang.textContent.trim() : null,
    langAsIcon: lang ? lang.classList.contains("asIcon") : null,
    langAria: lang ? lang.getAttribute("aria-label") : null,
    bodyIcons: document.body.classList.contains("icons"),
    bodyClasses: [...document.body.classList],
    backHref: back ? back.getAttribute("href") : null,
    backAria: back ? back.getAttribute("aria-label") : null,
    localStorage: ls,
    chrome: {
      room: !!document.getElementById("room"),
      desk: !!desk,
      window: !!win,
      rail: !!rail,
      rollL: !!document.getElementById("rollL"),
      rollR: !!document.getElementById("rollR"),
      fold: !!fold,
      panel: !!document.getElementById("panel"),
      track: !!track,
      corner: !!document.getElementById("corner"),
      lang: !!lang,
      back: !!back,
      title: !!document.getElementById("title"),
      loc: !!loc,
      locBox: !!document.getElementById("locBox"),
      editor: !!document.getElementById("editor"),
    },
    rolls: { L: roll("rollL"), R: roll("rollR") },
    noteCount: document.querySelectorAll("#marks .nt, #window .nt").length,
    zhint: document.getElementById("zhint") ? document.getElementById("zhint").textContent : null,
    cabinetCells: [...document.querySelectorAll("#grid .cell")].map((el) => ({
      name: (el.querySelector(".name") && el.querySelector(".name").textContent) || "",
      open: el.classList.contains("open"),
      shut: el.classList.contains("shut"),
    })),
  };
};

async function connect(run) {
  const browser = await chromium.connectOverCDP(run.cdp_url);
  const context = browser.contexts()[0] || (await browser.newContext());
  await context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("ccp_netlog_hook")) {
        sessionStorage.setItem("ccp_netlog_hook", "1");
      }
    } catch (e) {}
  });
  let page =
    context.pages().find((p) => {
      try {
        const u = p.url();
        return u.startsWith(run.base_url) || u === "about:blank" || u.startsWith("chrome://");
      } catch {
        return false;
      }
    }) || context.pages()[0];
  if (!page) page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
  } catch {
    /* headless chrome via CDP may already have a window */
  }
  return { browser, context, page };
}

function assertLocal(run, url) {
  if (PROD.test(url)) die(`control: refusing production URL ${url}`);
  let u;
  try {
    u = new URL(url, run.base_url);
  } catch {
    die(`control: bad URL ${url}`);
  }
  if (u.origin !== new URL(run.base_url).origin) {
    die(`control: refusing origin ${u.origin} (run is ${run.base_url})`);
  }
  return u.toString();
}

async function waitViewer(page) {
  await page.waitForSelector("#room", { timeout: 15000 });
  const hasWindow = await page.locator("#window").count();
  if (hasWindow) {
    await page.waitForSelector("#rail img", { timeout: 15000 });
    await page.waitForSelector('#track .stop[data-k="pane"]', { timeout: 15000 });
  }
}

async function stateOf(page) {
  return page.evaluate(OBSERVE);
}

function printJson(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function writeCapture(run, page, stem) {
  const png = outPath(run, `${stem}.png`);
  const yml = outPath(run, `${stem}.aria.yml`);
  const json = outPath(run, `${stem}.state.json`);
  await page.screenshot({ path: png, fullPage: false });
  let aria;
  try {
    aria = await page.locator("body").ariaSnapshot();
  } catch {
    const snap = await page.accessibility.snapshot();
    aria = JSON.stringify(snap, null, 2);
  }
  fs.writeFileSync(yml, aria.endsWith("\n") ? aria : aria + "\n");
  const st = await stateOf(page);
  fs.writeFileSync(json, JSON.stringify(st, null, 2) + "\n");
  return { png, yml, json, state: st };
}

async function drag(page, selector, dx, dy) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 10000 });
  const box = await loc.boundingBox();
  if (!box) die(`control: ${selector} has no bounding box`);
  const x = box.x + Math.min(box.width / 2, Math.max(4, box.width - 4));
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 24 });
  await page.mouse.up();
}

async function unrollOnce(page, dx) {
  // #rollR sits to the right of #window. Dragging it to the right decreases
  // x0 (index.html rollMove): the view travels toward the colophon (tile-00).
  const before = await stateOf(page);
  await drag(page, "#rollR", dx, 0);
  await page.waitForTimeout(400);
  const after = await stateOf(page);
  return { before, after };
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.flags.help || argv._.length === 0) {
    process.stdout.write(HELP);
    process.exit(argv._.length === 0 && !argv.flags.help ? 2 : 0);
  }
  const cmd = argv._[0];
  const run = loadRun();
  const { page } = await connect(run);
  // Do not browser.close(): connectOverCDP + close() would kill the Chrome
  // launch started. Detach by exiting the Node process.

  if (cmd === "open") {
      const rel = argv._[1];
      if (!rel) die("control open <path>");
      if (/^https?:/i.test(rel)) die("control open: pass a site-relative path, not an absolute URL");
      const url = assertLocal(run, rel.startsWith("/") ? rel : "/" + rel);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await waitViewer(page);
      // Give eager right-end tiles (tile-16..20) a moment to decode.
      await page.waitForTimeout(600);
      const st = await stateOf(page);
      printJson({
        action: "open",
        url,
        BUILD: st.BUILD,
        mode: st.mode,
        openAtRight: st.openAtRight,
        tileCount: st.tileCount,
        tileHttpFiles: st.tileHttpFiles,
        completeFiles: st.completeFiles,
        tx: st.tx,
        backHref: st.backHref,
        bodyIcons: st.bodyIcons,
        painting: st.painting,
      });
      return;
    }

    if (cmd === "click") {
      const sel = argv._[1];
      if (!sel) die("control click <selector>");
      const loc = page.locator(sel).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      await loc.click();
      await page.waitForTimeout(250);
      const st = await stateOf(page);
      printJson({ action: "click", selector: sel, href: st.href, mode: st.mode, overlays: st.overlays, langText: st.langText, bodyIcons: st.bodyIcons, locDisplay: st.locDisplay, roadsDisplay: st.roadsDisplay });
      return;
    }

    if (cmd === "click-text") {
      const sel = argv._[1];
      const text = argv._[2];
      if (!sel || !text) die('control click-text <selector> <text>');
      const loc = page.locator(sel).filter({ hasText: text }).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      await loc.click();
      await page.waitForTimeout(400);
      await waitViewer(page);
      const st = await stateOf(page);
      printJson({ action: "click-text", selector: sel, text, href: st.href, title: st.title, painting: st.painting, mode: st.mode });
      return;
    }

    if (cmd === "drag") {
      const sel = argv._[1];
      if (!sel) die("control drag <selector> --dx N --dy N");
      const dx = num(argv.flags.dx, 0);
      const dy = num(argv.flags.dy, 0);
      const before = await stateOf(page);
      await drag(page, sel, dx, dy);
      await page.waitForTimeout(400);
      const after = await stateOf(page);
      printJson({
        action: "drag",
        selector: sel,
        dx,
        dy,
        txBefore: before.tx,
        txAfter: after.tx,
        mode: after.mode,
        newTileHttp: after.tileHttpFiles.filter((f) => !before.tileHttpFiles.includes(f)),
      });
      return;
    }

    if (cmd === "wheel") {
      const sel = argv._[1];
      if (!sel) die("control wheel <selector> --dx N --dy N");
      const dx = num(argv.flags.dx, 0);
      const dy = num(argv.flags.dy, 0);
      const loc = page.locator(sel).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      await loc.hover();
      const before = await stateOf(page);
      await page.mouse.wheel(dx, dy);
      await page.waitForTimeout(400);
      const after = await stateOf(page);
      printJson({
        action: "wheel",
        selector: sel,
        dx,
        dy,
        txBefore: before.tx,
        txAfter: after.tx,
        mode: after.mode,
        newTileHttp: after.tileHttpFiles.filter((f) => !before.tileHttpFiles.includes(f)),
      });
      return;
    }

    if (cmd === "unroll") {
      const dx = num(argv.flags.dx, 700);
      const until = argv.flags["until-tile"];
      const maxSteps = num(argv.flags["max-steps"], until ? 16 : 1);
      const want = until === undefined || until === true ? null : String(until).padStart(2, "0");
      const wantFile = want ? `tile-${want}.jpg` : null;
      const steps = [];
      let last = await stateOf(page);
      for (let i = 0; i < maxSteps; i++) {
        const { before, after } = await unrollOnce(page, dx);
        const moved = before.tx !== null && after.tx !== null && after.tx > before.tx + 20;
        const newTiles = after.tileHttpFiles.filter((f) => !before.tileHttpFiles.includes(f));
        steps.push({
          i,
          txBefore: before.tx,
          txAfter: after.tx,
          movedTowardColophon: moved,
          newTileHttp: newTiles,
          tileHttpFiles: after.tileHttpFiles,
        });
        last = after;
        if (!moved) {
          printJson({
            action: "unroll",
            ok: false,
            reason:
              "tx did not increase (view did not travel toward the colophon). Drag #rollR to the right, or wheel #window with negative --dy. At pane, do NOT drag #window (that is a marquee zoom).",
            dx,
            steps,
          });
          process.exitCode = 1;
          return;
        }
        if (wantFile && after.tileHttpFiles.includes(wantFile)) break;
      }
      const ok = wantFile ? last.tileHttpFiles.includes(wantFile) : steps.length > 0;
      printJson({
        action: "unroll",
        ok,
        dx,
        untilTile: wantFile,
        tileHttpFiles: last.tileHttpFiles,
        completeFiles: last.completeFiles,
        tx: last.tx,
        openAtRight: last.openAtRight,
        steps,
      });
      if (!ok) process.exitCode = 1;
      return;
    }

    if (cmd === "press") {
      const key = argv._[1];
      if (!key) die("control press <key>");
      await page.keyboard.press(key);
      await page.waitForTimeout(250);
      const st = await stateOf(page);
      printJson({ action: "press", key, mode: st.mode, foldDisplay: st.foldDisplay, deskDisplay: st.deskDisplay });
      return;
    }

    if (cmd === "wait") {
      const sel = argv._[1];
      if (!sel) die("control wait <selector>");
      await page.locator(sel).first().waitFor({ state: "visible", timeout: 15000 });
      printJson({ action: "wait", selector: sel, visible: true });
      return;
    }

    if (cmd === "wait-ms") {
      const ms = Number(argv._[1]);
      if (!ms) die("control wait-ms <ms>");
      await page.waitForTimeout(ms);
      printJson({ action: "wait-ms", ms });
      return;
    }

    if (cmd === "screenshot") {
      const name = argv._[1];
      if (!name) die("control screenshot <name.png>");
      const dest = outPath(run, name);
      await page.screenshot({ path: dest, fullPage: false });
      printJson({ action: "screenshot", path: dest });
      return;
    }

    if (cmd === "snapshot") {
      const name = argv._[1] || "aria.yml";
      const dest = outPath(run, name);
      let aria;
      try {
        aria = await page.locator("body").ariaSnapshot();
      } catch {
        aria = JSON.stringify(await page.accessibility.snapshot(), null, 2);
      }
      fs.writeFileSync(dest, aria.endsWith("\n") ? aria : aria + "\n");
      printJson({ action: "snapshot", path: dest, bytes: fs.statSync(dest).size });
      return;
    }

    if (cmd === "state") {
      const st = await stateOf(page);
      const name = argv._[1];
      if (name) {
        const dest = outPath(run, name);
        fs.writeFileSync(dest, JSON.stringify(st, null, 2) + "\n");
        printJson({ action: "state", path: dest, summary: { BUILD: st.BUILD, mode: st.mode, openAtRight: st.openAtRight, tx: st.tx, tileHttpFiles: st.tileHttpFiles, completeFiles: st.completeFiles } });
      } else {
        printJson(st);
      }
      return;
    }

    if (cmd === "capture") {
      const stem = argv._[1];
      if (!stem) die("control capture <stem>");
      const cap = await writeCapture(run, page, stem);
      printJson({
        action: "capture",
        stem,
        png: cap.png,
        aria: cap.yml,
        state: cap.json,
        BUILD: cap.state.BUILD,
        mode: cap.state.mode,
        openAtRight: cap.state.openAtRight,
        tx: cap.state.tx,
        tileHttpFiles: cap.state.tileHttpFiles,
        completeFiles: cap.state.completeFiles,
        overlays: cap.state.overlays,
        langText: cap.state.langText,
        bodyIcons: cap.state.bodyIcons,
      });
      return;
    }

    if (cmd === "eval") {
      const js = argv._.slice(1).join(" ");
      if (!js) die("control eval <js>");
      const result = await page.evaluate(js);
      printJson({ action: "eval", result });
      return;
    }

    die(`control: unknown command ${cmd}\n${HELP}`);
}

main().catch((err) => {
  console.error("control:", err && err.stack ? err.stack : err);
  process.exit(1);
});
