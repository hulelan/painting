# Can an off-the-shelf VLM trace roads? A first measurement

*Run 2026-08-04, against Qwen-VL via OpenRouter. Harness and raw output in the session
scratchpad; method reproducible from this document.*

**Headline:** Qwen3-VL-235B locates **bridges** to a median **11px** on a 41,783px-wide
painting, at **$0.50 per 1,000 crops** — good enough to be a proposal generator. It does
**not** find faint mountain paths, and it falls for the shoreline trap that fooled a human
on this same painting. So: not a road tracer; a very cheap bridge-finder that makes the
labelling loop faster.

---

## Method

- **Crops:** 1,000 × 500 source px, upscaled 1.6× to 1600 × 800, cut from the live site's
  own 2048px tiles (no access to the master scan was needed).
- **Prompt:** one JSON reply — `has_road`, plus polylines in fractional coordinates.
  The exclusion list from [`labelling-protocol.md`](labelling-protocol.md) §3 was given
  verbatim, so the model was told shorelines and ridgelines do not count.
- **Temperature 0.**
- **Positives (6):** crops centred on traced paths 1, 4, 8, 10, 11, 12.
- **Negatives (6):** five dense painted passages with no traced road, plus the
  x≈25,081 shoreline-with-fish-weirs — the hard case that produced a false proposal
  from me earlier.
- **Probe (1):** x≈26,500, where a faint path is visible but untraced.
- **Scoring:** predictions resampled every 6px; buffer precision/recall at 20px against
  the traced centerline; median point-to-polyline error.

### A methodological trap worth recording

My first negative set was generated automatically as "crops >750px from any traced road."
It was worthless: five of six were blank silk or the colophon calligraphy — trivially
roadless. Worse, when I regenerated them from *dense painted* passages, one of the six
(x≈26,500) visibly contains a path we simply had not traced.

**"Unlabelled" is not "negative"** when only 21% of the scroll's columns have been traced.
Any future training run must sample negatives from *verified* empty regions, or it will be
penalising the model for being right.

---

## Results

| | qwen3-vl-235b-a22b | qwen2.5-vl-72b |
|---|---|---|
| Detection on positives | **5 / 6** | 5 / 6 |
| Detection on negatives | 5 / 6 | **6 / 6** |
| Median localisation error | **11 px** | 49 px |
| Buffer precision @20px | **0.66** | 0.28 |
| Buffer recall @20px | **0.59** | 0.23 |
| Cost per 1,000 crops | $0.50 | $0.52 |

Per-case, for qwen3-vl-235b:

| case | what it is | median err | P@20 | R@20 |
|---|---|---|---|---|
| POS_path11 | stilted walkway | **8 px** | 0.83 | 1.00 |
| POS_path10 | arched trestle | **11 px** | 0.68 | 0.76 |
| POS_path8 | great trestle bridge | **11 px** | 0.83 | 0.78 |
| POS_path4 | eastern trestle | 12 px | 0.97 | 0.39 |
| POS_path12 | stone arch over gorge | 51 px | 0.00 | 0.00 |
| POS_path1 | path through trees | *missed entirely* | — | — |

## What this actually says

**1. Bridges are solved well enough to be useful.** Four of six positives are bridge or
walkway structures, and on all four the predicted line lies on the deck to ~11px — about
one road-width. Rendered over the traces, they are visually correct, not accidentally
close. This directly supports Phase 2 of the proposal: bridges are the cheap foothold.

**2. Faint paths are not.** The two failures are the two least architectural cases.
On path 12 (a small stone arch in a gorge) it drew a confident straight line across the
wrong part of the ravine. On path 1 (a track through trees) it returned `has_road: false`.
Both are the "pale ridge among pale ridges" problem, unchanged.

**3. Recall is capped by framing, not by seeing.** Path 4 scores 0.97 precision but 0.39
recall — it found the bridge and stopped, while the traced road continues off across the
crop. The model answers "where is the bridge", not "where does the route go". For a
proposal generator that is acceptable; the human extends it.

**4. It reproduces the human error.** On the shoreline-with-weirs crop it returned two
confident paths along the bank — the same mistake I made, *despite* being explicitly told
in the prompt that shorelines do not count. That the exclusion was stated and ignored is
the interesting part: this confusion is in the visual features, not in the instructions.

**5. It found a road we missed.** On the x≈26,500 probe it flagged a path, agreeing with
what I had spotted by eye. Small sample, but it is the behaviour the labelling loop needs:
surfacing candidates in the 79% of the scroll nobody has looked at closely.

**6. Bigger is decisively better.** Qwen2.5-VL-72B detects about as often but localises
4.5× worse — near-useless lines that happen to be in the right crop. Detection accuracy
alone would have hidden this; it is only visible in the buffer metrics.

---

## What this changes in the plan

The [proposal](road-model-proposal.md) assumed the first proposal-generator would have to be
trained. It does not.

- **Phase 1 gets a baseline it must beat.** Any trained model now has to clear 11px median
  and P@20 = 0.66 on bridges. That is a real bar.
- **Phase 3 can start now.** The active loop — model proposes, human corrects in
  `trace.html?review` — no longer waits on training. Qwen3-VL can generate first-pass
  bridge proposals for a new painting today, for well under a cent.
- **Order of work changes.** Sweep the *untraced 79%* of this scroll with the VLM, review
  the proposals, and the label set grows without anyone hunting for roads by eye.

**What it does not change:** the VLM cannot do faint paths or inferred segments, which are
the intellectually interesting 15%. Those still need a human, and eventually a trained model
with a proper receptive field.

## Reproducing

1. Crops are cut from `https://classicalchinesepainting.com/assets/scroll/tiles/tile-NN.jpg`
   (2048px wide, full height) — no master scan needed.
2. Ground truth from `assets/data/roads.js`.
3. OpenRouter `chat/completions`, model `qwen/qwen3-vl-235b-a22b-instruct`, temperature 0,
   image as a base64 data URL.
4. Score with buffer precision/recall at 20px after resampling both polylines every 6px.

**Security note:** the OpenRouter key used lives in the poetry project's `.env` and was at
one point pasted into a chat transcript. It should be rotated before any larger run.
