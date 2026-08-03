# Learning to trace roads in Chinese landscape painting

*A proposal. Written 2026-08-02, from the road tracing done on 千里江山图.*

## The idea

We are hand-tracing the road and path network in *A Thousand Li of Rivers and Mountains*.
There are thousands of other Chinese landscape paintings, most of them never read this way.
Could the traces we are making train a model that finds the roads in any of them?

Short answer: **not yet, and not from this painting alone** — but the path to it is real,
and the most valuable thing we have is not the traces. It is the tracing *tool*.

---

## 1. What we actually have

This is the number that governs everything else.

| | |
|---|---|
| Painting | 41,783 × 1,673 px = **69.9 Mpx** |
| Traced road | **4,581 px** of centerline, 10 paths, 380 points |
| Road as a share of pixels | **0.04%** at 6px wide, 0.10% at 16px |
| 256px tiles containing any road | **24** |
| 1000px columns of the scroll touched by a road | **9 of 42 (21%)** |
| Paths in the eastern quarter (x > 28,000) | **8 of 10** |

Twenty-four tiles. For comparison, the SegCLP painting-segmentation dataset used 709
annotated images for six chunky classes like *mountain* and *water*; satellite road
datasets like DeepGlobe run to thousands of tiles of dense road network.

So: **we do not have a training set. We have a seed and a proof that the label is
well-defined.** Any plan that starts with "train a model on what we have" is wrong.
Any plan that starts with "make labelling cheap" is right.

A second, subtler problem: the labels are **clustered**. Eight of ten paths sit in the
last quarter of the scroll. A model trained on this would learn that quarter's palette
and brushwork, not roads.

---

## 2. Why this is harder than satellite road extraction

It is tempting to treat this as a solved problem in a new domain. Three things say otherwise.

### 2.1 A large share of the label is not depicted

Our own renderer already encodes this. Segments where consecutive traced points are far
apart are drawn dotted, meaning *the road is there but not visible* — it passes behind a
ridge, under foliage, through mist. On the current trace:

- **85.4%** of traced length is visible road
- **14.6%** is inferred

The inferred part is not noise to be cleaned up. It is the interesting part: it is where a
human reader uses composition, the logic of terrain, and where the travellers are walking
to conclude that a path must continue. A pixel model will learn the 85%. The 15% requires
reasoning the architecture has to be chosen for — and it is exactly what makes a traced
road *legible as a route* rather than a set of disconnected marks.

**Design consequence:** predict two things, not one. A *visibility* channel (is there paint
here that depicts a path) and a *route* channel (does a path pass through here). Only the
first is honestly learnable from local texture.

### 2.2 The local signature of a road is shared by three other things

Established empirically on this painting, when automatic extraction was attempted and
abandoned: the pale, unsaturated, slightly-brighter-than-surroundings ridge that reads as a
road is **the same signature** as

- mountain edge-highlights where a slope catches light
- the ridgelines of roofs
- sandy shoreline where land meets water

I walked into the last one myself while proposing paths — a bright ochre band along a bank
at x≈25,081 that looks exactly like a road and is a beach with fish weirs in front of it.
A model reading 32×32 patches will make this error constantly. **Context over hundreds of
pixels is not optional**, which argues for a large receptive field or a transformer
backbone rather than a small-patch CNN.

### 2.3 Style variance is enormous, and our one painting is an outlier

千里江山图 is 青綠山水 — blue-green, mineral pigment, unusually saturated, unusually large.
The bulk of the surviving corpus is 水墨, ink monochrome, where the same road is a few
grey strokes on silk. A model fit to our painting transfers to the corpus roughly as well
as a model trained on one satellite city transfers to a different continent.

---

## 3. Prior art

Worth knowing before spending a weekend on it:

- **SegCLP** — 709 Chinese landscape paintings with pixel-level annotation across six
  classes: *mountain, water, tree, people, building, **bridge***.
  ([dataset](https://github.com/wanlinzhou/SegCLP), [DRANet paper](https://www.sciencedirect.com/science/article/abs/pii/S1051200424000526))
- **DRANet** — segmentation network built for exactly this domain's problems: blurred
  boundaries, abstraction, blank space standing in for sky and water.
- **clDice** — a topology-preserving loss for tubular structures, benchmarked on vessels,
  neurons and roads. Optimises the skeleton, not the area, so it rewards *connectivity*.
  ([CVPR 2021](https://openaccess.thecvf.com/content/CVPR2021/papers/Shit_clDice_-_A_Novel_Topology-Preserving_Loss_Function_for_Tubular_Structure_CVPR_2021_paper.pdf))
- **Frozen-backbone few-shot segmentation** — recent work gets useful segmentation from a
  frozen DINOv2/v3 encoder plus a small trained head; one geological application reports
  IoU ≈ 0.74 from **four** labelled images.
  ([UINO-FSS](https://arxiv.org/abs/2504.15669v2))

**Nobody has published road/path labels for Chinese painting.** SegCLP's six classes do not
include it. That is the gap, and it is a real one.

**But SegCLP's *bridge* class is a gift.** A bridge is a road segment that is (a) always
depicted, never inferred, (b) architecturally distinctive, and (c) already labelled across
709 paintings. Bridges are the cheapest possible foothold — see Phase 2.

---

## 4. Proposed plan

Five phases, each with a go/no-go so it can be abandoned cheaply.

### Phase 0 — Establish the ceiling (half a day)

Before measuring a model, measure the humans.

1. Freeze the current 10 paths as v1.
2. **Re-trace two sections blind**, months apart or by a second person, and compute
   buffer-agreement against the original.
3. Write the taxonomy down: what counts as a road? Bridges yes. Jetties? Garden paths
   inside a compound? The deck of a watermill? Shoreline — no, by fiat, and record why.

*Why this first:* if two careful traces of the same section agree only at, say, 70% within
a 10px buffer, then **70% is the ceiling** and a model scoring 65% is essentially done. Without
this number every later metric is uninterpretable. This is the single highest-value half-day
in the whole plan and it needs no GPU.

**Go/no-go:** if self-agreement is below ~60%, the label is too subjective and the project
should become something else — an annotation aid, not a predictor.

### Phase 1 — Is there any learnable signal? (a weekend)

The scroll is long enough to split **within itself**: 41,783px is ~25 image-heights of
material. Train on x < 28,000, test on x > 28,000 — except this is exactly backwards given
the label clustering, so invert it: **train on the dense east (8 paths), test on the sparse
west (2 paths)**. Small train set, honest test.

- **Input:** 512px crops at 2–3 scales, since road width varies with depth in the picture.
- **Backbone:** frozen DINOv2/v3 ViT-B. With 24 tiles of label, training a backbone is
  hopeless; training a linear-to-shallow head on frozen features is the only sane option.
- **Head:** small conv decoder → two channels (*visible path*, *route*).
- **Loss:** soft-clDice + focal, weighted heavily toward positives at 0.04% prevalence.
- **Augmentation:** aggressive — hue rotation and desaturation especially, to pre-empt the
  青綠 → 水墨 gap.

**Go/no-go:** does it beat the trivial pale-ridge filter that already failed? Measured by
buffer-F1 at 10px on the held-out west end. If a frozen backbone plus 24 tiles cannot beat
a hand-crafted filter, more labels of the same kind will not save it, and Phase 2 becomes
mandatory rather than optional.

### Phase 2 — Bootstrap on bridges (a week)

Train a bridge detector on SegCLP's 709 paintings, where labels already exist. Bridges are
the visible, unambiguous, style-invariant core of a road network.

Then use bridge predictions on new paintings as **anchors**: a bridge implies a road at each
end, aimed along the deck. This turns road tracing into a *linking* problem between confident
anchors, which is far better posed than "find the road" from scratch — and it degrades
gracefully, since a bridge with no road found is still a useful annotation.

### Phase 3 — The active-loop, which is the actual product (ongoing)

This is where `trace.html` stops being a tool and becomes the engine.

```
model proposes paths on a new painting
      ↓
they load in trace.html?review as dashed blue proposals
      ↓
human accepts / drags / deletes  ← the workflow we have already run five times
      ↓
corrections become labels; retrain; move to the next painting
```

We have already validated this loop end to end, with me as the model: I proposed paths
901–905, you reviewed them in the tool, three needed no change, and my worst error (a trace
following a hillside crease instead of the walkway) was caught by rendering the proposal
back over the scan at 10× — which is exactly the check the review view performs.

**Correction is perhaps 5–10× faster than tracing from scratch.** That ratio, not model
accuracy, decides whether this project reaches 100 paintings.

**Target:** 50–200 annotated paintings. At 10–20 minutes each unassisted that is 15–60
hours of your time; with a working proposal model it is plausibly 5–15. That is the real
cost of the dataset, stated honestly up front.

### Phase 4 — Cross-style generalisation

Only meaningful once Phase 3 has produced a corpus. Hold out entire styles (青綠 vs 水墨),
periods, and formats (handscroll vs hanging scroll vs album leaf). Report per-stratum, since
an average will hide total failure on ink monochrome.

---

## 5. Metrics

**Do not use IoU.** At 0.04% prevalence, predicting nothing scores 99.96% pixel accuracy,
and IoU punishes a perfectly-routed line that is two pixels off far more than it punishes a
blob in the right neighbourhood.

Use instead:

- **Buffer precision/recall** at 5/10/20px — the road-extraction standard. Is the predicted
  centerline within *k* px of a true one, and vice versa.
- **clDice** — skeleton overlap; rewards connectivity.
- **APLS** (Average Path Length Similarity) — compares shortest paths through the predicted
  graph against the true one. The only metric that notices that a road broken in the middle
  is *useless* rather than 95% correct.
- Report **visible** and **inferred** segments separately. Scoring them together hides the
  fact that the interesting 15% is being failed.

---

## 6. What would kill this

Listed so we notice early rather than late.

1. **Human self-agreement is low** (Phase 0). The label is opinion, not fact. → Repurpose as
   an annotation aid; drop the claim of prediction.
2. **The corpus is too stylistically diverse** for a few hundred paintings to cover.
   → Narrow scope to 青綠 handscrolls, where our painting is representative rather than exotic.
3. **Labelling stays slow** because proposals are bad enough that correcting is no faster
   than drawing. → The loop never reaches escape velocity. This is the most likely failure
   and the one Phase 1's go/no-go is designed to expose cheaply.
4. **Image sources fall through** on licensing or resolution. Mitigated below.

---

## 7. Sourcing paintings

Needed: high resolution (roads are a few pixels wide), and clear licensing.

- **Smithsonian National Museum of Asian Art (Freer|Sackler)** — 13,000+ Chinese objects,
  CC0 under Smithsonian Open Access, with an API. Best first stop.
  ([open access](https://asia-archive.si.edu/collections/smithsonian-open-access/))
- **The Met** — Open Access CC0 + API.
- **Cleveland Museum of Art** — Open Access CC0 + API, strong Chinese holdings.
- **Harvard Art Museums, Princeton University Art Museum** — APIs, mixed licensing.
- **National Palace Museum, Taipei** — the deepest collection; open-data programme exists
  but terms vary per work and need reading.
- **Palace Museum, Beijing (dpm.org.cn)** — source of our own master scan. Superb imaging,
  restrictive terms. **Check the terms of service before any bulk access**, consistent with
  how we have handled sources on the poetry side.

Practical note: most museum images are one-tenth the resolution of our tiled master. Road
width in a 2,000px reproduction may be under a pixel. **Filter the corpus by resolution
first** — it may cut the usable set by an order of magnitude, and better to know that in
week one.

---

## 8. If we start, start here

In order, cheapest first:

1. **Phase 0's blind re-trace.** Half a day, no dependencies, and it determines whether the
   rest is meaningful.
2. **Pull the SegCLP dataset** and look at the bridge masks. Free labels, and it tells us
   what image quality the field considers workable.
3. **Survey Smithsonian + Cleveland for Chinese landscape paintings above ~8,000px.** Count
   them. That number decides whether Phase 4 is possible at all.
4. Only then, Phase 1.

Nothing before step 4 needs a GPU, and steps 1–3 are the ones that can kill the project
cheaply — which is the point of doing them first.

---

## Appendix: label statistics as of 2026-08-02

```
painting        41783 x 1673  = 69.9 Mpx
traced length   4581 px across 10 paths, 380 points
  path 1     945 px   x 40976..40092     hand-traced
  path 3     643 px   x 40596..40095     hand-traced
  path 4    1063 px   x 39435..38439     hand-traced (the eastern trestle bridge)
  path 6      70 px   x 38464..38428     hand-traced
  path 7      57 px   x 38469..38432     hand-traced
  path 8     976 px   x 29652..30622     proposed 901, approved — the great trestle bridge
  path 9     309 px   x 28571..28879     proposed 902, approved — footbridge + bank path
  path 10    219 px   x  2478..2685      proposed 903, approved — arched trestle, boat beneath
  path 11    194 px   x 16532..16718     proposed 904, approved — stilted walkway
  path 12    105 px   x 32372..32471     proposed 905, approved — stone arch over a gorge

visible (solid)   3911 px   85.4%
inferred (dotted)  670 px   14.6%
road pixels @6px wide: 0.039% of the painting
256px tiles containing road: 24
1000px columns touched: 9 of 42 (21%)
```

Source of truth: `assets/data/roads.js`. Tool: `trace.html`, review mode `trace.html?review`.
