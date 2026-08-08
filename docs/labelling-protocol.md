# Road labelling protocol

*The rules we trace by. Version 1, 2026-08-04.*

If we are building a dataset, the labels have to mean the same thing in month six as in
week one. This is that definition. It is deliberately short and deliberately opinionated —
a rule that is written down and slightly wrong beats a rule that lives in someone's head.

Companion to [`road-model-proposal.md`](road-model-proposal.md). Data: `assets/data/roads.js`.
Tool: `trace.html`, review mode `trace.html?review`.

---

## 1. What we are tracing

**The centerline of a route a person could walk along.**

Not the edges of it. Not a region. One line down the middle, in the direction of travel.

## 2. Counts as a road

- **Footpaths and tracks** over hillsides, through valleys, between buildings
- **Bridge decks** — arched stone bridges, timber trestles, plank footbridges
- **Stilted walkways** (棧道) and jetties that carry foot traffic
- **Paved or swept ground** inside a compound where it is drawn as a route, not as a courtyard
- **A route that passes behind something** — see §4 on inferred segments

## 3. Does NOT count

Listed because each one has already fooled a human or a model on this painting:

| Not a road | Why it looks like one |
|---|---|
| **Shoreline / sandbank** | A bright ochre band against green water is the same colour signature as a path. Cost us proposal C, and Qwen-VL falls for it too. |
| **Mountain ridgelines** | Pale, unsaturated, linear, and often runs exactly where a path would. |
| **Roof ridges** | Same brushstroke as a track seen at distance. |
| **Rivers, streams, waterfalls** | Linear and continuous, but you cannot walk on them. |
| **Tree lines** | Read as a hedge along a road; the road may not be drawn at all. |
| **Colour-area boundaries** | The seam between two washes is not a route. |
| **Boat wakes, fences, walls** | Linear, not walkable. |

**The test:** could a figure in this painting *plausibly be shown walking there*? If the
answer needs an argument, it is not a road — mark it and move on.

## 4. Visible vs inferred

Roads in this painting disappear behind ridges, foliage and mist, then reappear. **Trace
through the gap.** The renderer distinguishes the two automatically by point spacing:

- **Click densely (5–15px apart) where the road is visible.**
- **Click sparsely — one point either side — where you are inferring it.**

Segments longer than `max(4 × the path's median spacing, 18px)` render dotted. This is
the whole mechanism, so the *rhythm of your clicking is itself a label*. Do not click
evenly across a gap you cannot see; that will mark inferred road as visible.

Currently 85.4% of traced length is visible, 14.6% inferred.

> If you are more than about 60% confident a route continues, trace it sparsely.
> If less, stop the path. A stopped path is honest; a guessed one is noise.

## 5. Where one path ends and the next begins

- **One path per continuous route.** Do not break at a bridge — a road that crosses a
  bridge is *one* path running over it.
- **Start a new path** at a genuine fork, or when you lose the route entirely and pick up
  something you cannot connect.
- Direction does not matter. Order does: points must run along the route, not jump about.
- Short stubs are fine (paths 6 and 7 are 70px and 57px). An honest fragment beats a
  confident invention.

## 6. Precision expected

Roads are 3–10px wide in a 41,783 × 1,673 master. **Aim to be within ~5px of the
centerline.** Beyond that, do not fuss: the site strokes roads at 1.4px and buffer metrics
are scored at 10–20px.

Verify by rendering the trace back over the scan at 5–10× — **not** by eyeballing at
fit-to-screen. Two of five machine proposals looked perfect at low zoom and were following
the wrong feature at high zoom (one was tracking a hillside crease a good 20px above the
walkway it was supposed to be on).

## 7. Procedure for a new painting

1. Open `trace.html` (phone or laptop; one finger pans, tap adds, pinch zooms, hold a
   handle to delete).
2. Work **right to left**, the direction the scroll is read.
3. Trace bridges first — they are unambiguous and they anchor the roads at each end.
4. Then trace outward from each bridge until the route is genuinely lost.
5. Then sweep for isolated paths.
6. Export. Re-render over the scan at 5–10× and fix what is off.
7. Record anything the rules did not cover in §9 below.

## 7b. Order of operations for a session

The mechanics, as distinct from the tracing rules above. Every step here exists
because skipping it has already cost work.

**Before you draw anything**

1. **Pick one origin and stay on it for the whole session.**
   `localhost:8777` and `classicalchinesepainting.com` are different origins, so
   they have *completely separate* localStorage. An edit made on one is invisible
   on the other. Most "my edits vanished" moments are this.
2. **Pick the right page.**
   - `trace.html` — drawing new roads. Seeds from the live `roads.js`.
   - `trace.html?review` — correcting proposals. A scratch copy; never writes to
     your own trace.
3. **Reload before starting.** Review mode pulls in any new proposals; your edits
   survive a reload untouched. If the amber *out of step* banner appears, deal
   with it now — it means this browser's copy predates something that has since
   gone live, and exporting from it would undo that work.
4. **Do not press `reload proposals`** unless you intend to throw the scratch copy
   away. It is a reset, not a refresh.

**Drawing** — see §7 for the tracing order (right to left, bridges first).
Saving is automatic: every point added and every handle drag writes to
localStorage, and the status bar shows `saved <time>`.

**Before you call it done**

5. **Zoom to 5–10× and check the line sits on the structure**, not on something
   parallel to it. Bridges characteristically have two roughly parallel dark
   features — the deck or railing, and a shadow or cross-brace beneath — and it
   is easy to trace the wrong one. Paths 10, 11 and 12 went live wrong for
   exactly this reason and had to be pulled.

**Getting it out of the browser**

6. **`Copy my edits`** — copies only what differs from the published version,
   usually a few hundred characters. Paste it back.
   Or **`Export roads.js`** for the whole file.
7. It gets diffed against the published version, rendered back over the scan at
   high zoom, and merged only if it survives that.
8. `git pull` afterwards so the local checkout matches.

**A rule worth keeping:** nothing goes live that has not been looked at on the
painting at high magnification, in the styling the site actually uses. A thick
solid line on a tightly-framed crop flatters alignment and hides exactly the
error that matters.

## 8. Known-hard sites in 千里江山图

Places where a careful person could reasonably disagree. Kept so we can measure agreement
on the same ground later.

| x | What | Ruling |
|---|---|---|
| ~25,081 | Ochre band along a bank with fish weirs | **Not a road.** Shoreline. |
| ~14,686 | Low walkway over marsh | Real, but too faint to place. **Left untraced.** |
| ~15,624 | Watermill with a covered deck | Deck is walkable but cluttered by the roof. **Left untraced.** |
| ~16,666 | Below the stilted walkway | Rocks and cascade, not a second bridge. **Not a road.** |
| ~26,500 | Faint winding path on a mountain face | **Is a road, still untraced.** Found while building a test set. |
| ~2,570 / ~16,620 / ~32,420 | Arched trestle, stilted walkway, stone arch | Traced wrong once (paths 10/11/12): the line followed a brace or shadow parallel to the deck. Pulled from live, awaiting a correct trace. |

## 9. Open questions

Not yet ruled on. Decide when first encountered, then write the ruling here.

- Do garden paths *inside* a walled compound count?
- Do steps cut into rock count as path, or as terrain?
- A jetty that only serves boats — road, or not (no through-route)?
- When two paths merge, do we trace a Y, or two overlapping paths?

## 10. Before this becomes a dataset

The unmeasured quantity is **how much a careful tracer agrees with themselves.** Until we
know that, no model score is interpretable — a model at 65% may already be at the ceiling.

**The measurement:** re-trace two sections blind — sections you have traced before, without
looking at the old trace — and compute buffer-agreement at 5/10/20px against v1. Half a day,
no GPU, and it gates everything downstream. Suggested sections: one dense
(x 38,400–39,500, the eastern trestle) and one sparse (x 16,300–16,800, the stilted walkway).

---

## Changelog

- **v2 — 2026-08-08.** Added §7b, the session order of operations, and the
  ruling that nothing goes live unchecked at high magnification in site styling.
- **v1 — 2026-08-04.** First written, after 10 paths / 380 points / 4,581px on 千里江山图.
  Rules §3 and §4 are back-formed from mistakes actually made, not invented in advance.
