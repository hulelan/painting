# Asking the model, in Chinese, what the objects mean

*qwen3-vl-235b, 2026-08-08. 46 objects, $0.03. Data: `assets/data/annotations_qwen.js`.
Not loaded by the site. **Not verified.***

The prompt was Chinese, asking for four fields per object: 名稱 (name), 畫中所見 (what is
actually visible), 歷史意義 (historical significance), 把握 (confidence), with an explicit
instruction not to invent names, dates or allusions. Asking in Chinese was the right call —
it returns proper art-historical vocabulary (歇山頂, 干欄式, 水榭, 棧道) that an English
prompt tends to flatten into "pavilion" and "walkway".

Two things went wrong, and they matter more than the content.

---

## Problem 1 — 42% describe a different object

Of 45 gradeable entries, **19 name something inconsistent with what the census recorded at
that exact point.**

| id | census said | annotation said |
|---|---|---|
| 84 | jetty | **水磨坊** water mill |
| 83 | jetty | 水邊木構亭榭 waterside kiosk |
| 187 | fence | 茅草屋 thatched cottage |
| 189 | wall | **水磨坊** water mill |
| 7 | tile-roofed house | 木構棧道 plank walkway |
| 33 | thatched cottage | 木構棧道 plank walkway |
| 186 | figure (rider) | 木構棧道 plank walkway |
| 190 | basket or container | 木構棧道 plank walkway |

Some are benign — a *boatman poling* annotated as 烏篷船 is the model describing the boat the
figure is in, and 6 of the 19 are that. The rest are not: **jetty → water mill** and
**wall → water mill** are two different readings of the same coordinates.

Two independent passes over the same points disagree two-fifths of the time. That is the
number to keep. It puts a ceiling on the object census that no amount of annotation fixes,
and it means **the coordinates cannot yet be trusted to identify a subject** — which is
exactly the assumption a click-to-reveal feature on the site would be built on.

Likely cause: the annotation crop is 340×210 at 3×, a much tighter frame than the census
crop of 1000×560 at 1.6×. Ring a 6px figure in a tight frame and the model describes the
boat, the walkway, the building — whatever dominates the picture.

## Problem 2 — one idea, restated 46 times

| term | entries |
|---|---|
| 隱逸 *reclusion* | **46 / 46 (100%)** |
| 文人 *literati* | 41 (89%) |
| 江南 *Jiangnan* | 22 (48%) |
| 寄情山水 *lodging feeling in landscape* | 18 (39%) |
| 可遊 / 可居 *Guo Xi's dictum* | 26 combined |

Pairwise text similarity is low (median 0.22), so it is not copying itself — it is
**re-deriving the same interpretation from scratch every time**. Every thatched hut, boat,
bridge and gate is read as an emblem of literati reclusion.

**And for this painting that frame is partly wrong.** 千里江山圖 is a *court* work: painted
by 王希孟 around age eighteen under Huizong's personal instruction, presented to the throne,
and later given to 蔡京, whose colophon at the end of the scroll records exactly that. It is
an imperial picture of a well-governed realm. Reading every cottage in it as a symbol of
withdrawal from office imports a frame that fits Yuan literati painting far better than it
fits this scroll. Guo Xi's 可行可望可遊可居 is legitimately Northern Song and fair to cite;
the reclusion reading applied wholesale is not.

The model is fluent and it is confident — 21 of 46 rated their own significance claim
*high*. Fluency is not knowledge of this object.

---

## What is actually worth keeping

The entries that break the frame are the interesting ones. Translated in full:

**#189 — 水磨坊, water mill** *(census called this a wall)*
> Water mills were an important piece of everyday infrastructure in the Northern Song, used
> for grinding grain, reflecting the combination of agriculture with water-power technology.
> Though *A Thousand Li of Rivers and Mountains* is a blue-green landscape, its careful
> depiction of such productive installations shows the painter's observation of real life…
> The Northern Song government did administer water-power installations, for instance a
> **levy on water mills (水磨課稅)**, indicating their economic standing.

**#84 — 水磨坊, water mill** *(census called this a jetty)*
> …placed alongside kiosks, boats and village houses, this shows the painter depicting the
> "smoke of human habitation" within an ideal landscape — displaying nature's grandeur while
> pointing out **the material basis underlying the reclusive life**. The presence of a water
> mill suggests the scene is not a pure immortal realm but an idealised world fusing
> production, daily life and aesthetics.

**#7 — 木構棧道, timber plank walkway**
> …not an official large-scale work but a local or folk installation, connecting settlements,
> fields and viewpoints… Such structures also appear in actual engineering records, for
> instance the types termed **棧道 and 飛梁 mentioned in the 《營造法式》**.

**#75 / #76 — 帆船, sailing vessels**
> In the Northern Song water transport was well developed; the Yangtze, the canals and other
> waterways were arteries for goods and people… Such vessels **contrast with the reclusive
> landscape around them, implying the interpenetration of human activity and natural scenery**,
> and reflect the maturity of Northern Song shipbuilding and its water network.

Those four are worth something: the water-mill entries name a **specific fiscal institution**,
the walkway entry names a **specific text**, and the sailing-vessel entry is the only one that
argues *against* the reclusion reading rather than for it — commerce, not withdrawal.

**Both specific claims need checking before use.** The 《營造法式》 (Li Jie, 1103, contemporary
with this painting) is certainly real; whether it uses those two terms as claimed is not
something this pass establishes. A Song levy on water mills is plausible — water-powered
milling was contested between state and monastic interests — but the exact term 水磨課稅
should be verified against a source, not accepted because a model said it confidently.

## Follow-up: the fix did not work

*2026-08-09.* Recommendations 1 and 2 above were implemented and measured on the same 46
objects: annotate from the **same crop the census used** with the subject ringed, and ask for
**observation only**, no significance. $0.02.

**Recommendation 2 worked.** Zero interpretation leaked — 隱逸, 文人, 象徵 and 理想 appear in
0 of 46 descriptions, against 46 of 46 before. The model hedges properly now
(「看不清」, 「無法辨識」 four times) instead of narrating confidently past what it can see.
The descriptions are usable.

**Recommendation 1 did not.** The disagreement rate with the census is **unchanged: 42%**
(26 agree, 19 disagree — the identical split). The crop framing was not the cause, so that
hypothesis was wrong.

Worse, the two passes do not even disagree about the *same* objects: 19 each, only 15 shared.
On the contested objects **the two independent annotation passes agree with each other just
47% of the time**. Three passes over the same coordinate produce three answers.

| id | census | tight crop | census crop |
|---|---|---|---|
| 84 | jetty | 水磨坊 water mill | 茅屋 thatched hut |
| 83 | jetty | 水邊木構亭榭 kiosk | 茅屋 thatched hut |
| 189 | wall | 水磨坊 water mill | 茅屋 thatched hut |
| 188 | gate | 木構門樓 gatehouse | 茅屋 thatched hut |
| 73 | building | 水邊木構亭閣 | 木構棧道 walkway |

Six of the nineteen are the benign case — a *figure* named as the 烏篷船 he is sitting in, and
both passes agree on those. The rest are genuine three-way confusion.

**The real cause is that a bare coordinate does not identify a subject.** These objects are
5–30px across in a 41,783px painting. A ring drawn at a point covers several of them, and
which one the model names is close to arbitrary. Re-prompting cannot fix that; nor can
re-framing.

**What would fix it: store extent, not a centre.** If the census recorded a bounding box, the
ring would be unambiguous and all three passes would be looking at the same thing. That is a
change to how objects are detected, not to how they are described — and it should happen
before any click-to-reveal feature is built, because such a feature assumes a click maps to a
subject, which is exactly what these numbers say it does not.

## Recommendation

Do not put these on the site as they stand. Two-fifths point at the wrong object, and the
interpretation is a single idea on repeat with a frame that mis-fits an imperial scroll.

What would make them usable, cheapest first:

1. **Fix the targeting.** Annotate from the *same* crop the census used, with the object
   ringed, so both passes see the same picture.
2. **Ask for observation only** — 名稱 and 畫中所見 — and drop 歷史意義 from the model
   entirely. The description of visible form was the reliable part; the interpretation was not.
3. **Write the significance yourself, per class not per object.** There are maybe a dozen
   classes here. Twelve good paragraphs beat 207 generated ones, and the reader who clicks a
   thatched cottage does not need a bespoke essay — they need the one true thing about
   thatched cottages in this scroll.
