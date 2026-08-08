# A second opinion on the objects

*qwen3-vl-235b, 2026-08-08. Data: `assets/data/things_qwen.js`. Not loaded by the site.*

`things.js` (548 objects) came from eight vision agents over eleven large crops. This is an
independent pass by a different model over a different grid — 144 crops of 1000×560 at
stride 800, **$0.09** — asked not just *what* but *what kind*.

## Tally

| kind | qwen | agents |
|---|---|---|
| built | 74 | **286** |
| figure | **79** | 103 |
| boat | 45 | **102** |
| fence | 1 | **31** |
| bridge | 5 | 11 |
| animal | 0 | 10 |
| jetty | 2 | 4 |
| **total** | **207** | **548** |

**Agreement:** 79% of qwen's objects have a same-kind agent object within 45px. Only **35%**
of the agent objects have a qwen counterpart. So qwen is *precise but under-counts* — it
finds about a third of what the agents found and is mostly right about those.

Where it collapses is repetition: **1 fence against 31**, and **0 animals against 10**. Asked
for "at most 30 objects" per crop it reports the *interesting* ones, not all of them. A row of
fence posts is one glance, not thirty entries. Counting and describing are different jobs and
this prompt asked for both.

## What it adds: categories the agent census does not have

202 of 207 carry a specific reading, 72 a roof material, 45 a bay count.

**Architecture — the roofs split cleanly:**

| roof | n |
|---|---|
| tile | 54 |
| thatch | 16 |
| hip-and-gable / gabled | 2 |

A **3.4 : 1 tile-to-thatch ratio**. Tile means resources; thatch means a farmhouse. That is a
social reading of the valley available from a $0.09 pass, and it is the kind of claim the
positional census could not make at all.

**Bay counts** (columns between posts, the traditional measure of a hall's size):

| bays | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| n | 9 | 20 | 15 | 1 |

Two- and three-bay buildings dominate; one four-bay hall stands out as the largest domestic
structure counted.

**Buildings:** 52 tile-roofed houses, 16 thatched cottages, 1 stilt house.
**Boats:** 24 moored punts, 10 fishing skiffs, 7 cargo junks, 4 ferries — a working river,
not a decorative one.
**Figures — what people are *doing*:** 33 boatmen poling, 25 walking travellers,
17 seated scholars, 2 porters with loads.

That last line is the most interesting result here. Roughly **two in five identified figures
are on the water**, which is a claim about how this landscape is inhabited, and it comes from
the same sweep that failed to count fence posts.

## Reading the two together

They fail in opposite directions, so neither replaces the other:

- **Agent census** — better recall, positions only. Use it for *where* and *how many*.
- **Qwen census** — worse recall, rich attributes. Use it for *what kind*.

The honest combination is to keep `things.js` as the count and treat `things_qwen.js` as an
attribute layer joined by position — 79% of it lands within 45px of an existing object, so
most of its readings can be attached to entries that already exist.

**Not verified by eye.** Unlike the roads, nothing here has been checked against the painting
at magnification. Given that three road proposals I called "verified" turned out to be tracing
the wrong feature, these numbers should be treated as a hypothesis, not a finding. The
cheapest next step is to spot-check the 21 objects with no agent counterpart at all
(11 figures, 9 buildings, 1 bridge) — those are either genuine finds or the clearest errors.
