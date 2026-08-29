# 題跋 — writing on the paintings

*Where the plan stands, rewritten now that the site holds eight scrolls rather
than one. The earlier version is in git history.*

## The frame

Not comments, and not social media: **題跋**. On 千里江山圖 itself there are
inscriptions by 蔡京 and 溥光, added decades apart, and Qianlong wrote on it too.
**The scroll as it exists today is the painting plus its responses**, mounted on
the same silk, and a later viewer reads both.

Two consequences a comment box would get wrong:

- **A colophon is placed.** It sits at a point on the roll, beside what it
  answers. The notes here already work that way — a box round a thing.
- **A colophon is signed, dated, and permanent.** Not a reaction. That argues
  for making it slightly *harder* to write than a comment, not easier.

## Two artefacts, not three visibilities

The steer that settled this:

> people can have accounts and they can have their own way. There might be a
> public version of the painting and people can comment on it… There is a
> private version.

So:

- **your painting** — a copy that is yours, written on freely, seen by nobody,
  moderated by nobody;
- **the public square** — one shared scroll where what you post is mounted for
  everyone, under the rules of a shared place.

Publishing is a deliberate crossing between them, not a visibility flag.
**Private is a document. Public is a place.** That is easier to explain and
easier to build than three grades of one thing.

## What changed: there are eight paintings now

This is the part the earlier plan did not account for, and it moves the first
step. Annotation now has three axes, not two: *whose*, *how public*, and
**which painting**.

A note is a pair of coordinates. The same pair is a waterfall on one scroll and
empty sky on another. Until today the tracer was hard-wired to 千里江山圖 and
kept everything under one key, so the seven new scrolls could not be annotated
at all — and pointing the tracer at one would have written its notes into the
first scroll's box.

**Fixed today** (this is prerequisite, not the discourse feature):

- `trace.html?p=<slug>` traces any scroll in the register, and says which one.
- Storage is per painting: `ccp_roads_<slug>`, `ccp_notes_<slug>`. 千里江山圖
  keeps the original key names, so work already in a browser is where it was.
- The save file records its `slug`; loading refuses a file from another
  painting by name rather than by pixel width.
- The viewer reads `notes-<slug>.js`, so publishing one scroll's notes cannot
  put them on another.

## Where each tier stands

| tier | 題跋 equivalent | mechanism | state |
|---|---|---|---|
| private snippet | a note in your own hand | localStorage, per painting | **works** |
| private, kept | an unmounted colophon | `Save file` → JSON you own | **works** |
| public | mounted on the scroll | a commit to `notes-<slug>.js` | **works, with me as the mount** |

Personal annotation is therefore *done*, across all eight scrolls. What does not
exist is anyone but you being able to write.

## The one architectural fact

**A static site cannot accept a write.** GitHub Pages serves files. Every public
tier needs exactly one endpoint that accepts a POST; everything else follows
from that, and nothing else about the design is hard.

Three ways, costed honestly:

**A. No accounts.** A worker (~60 lines) takes a colophon, stores it *pending*,
and the viewer reads only *approved*. Identity is a typed name.
*Cost:* a free Cloudflare account, one deploy, your attention per submission.
*Risk:* an open write endpoint eventually attracts junk; rate limit, size cap,
and approval-before-visible contain it.

**B. Accounts through someone else's.** Sign in with Google or Apple. Identity
and spam mostly solved, no passwords stored. Needed for "your painting" to
still be yours on a second device and after clearing the browser.
*Cost:* an OAuth app, a session store, and a real privacy question — you would
be holding other people's identities.

**C. Accounts you run.** Email, passwords, resets, a database, a duty of care.
For a site about scrolls, no.

**Persistence and identity are separable, and that is the useful part.** A file
is persistence without identity. An account is identity, which you need only
when other people must see a name attached. Tiers 1 and 2 need no account and
already work. Only the public square does.

## The order I would build it

1. **Colophon mode in the viewer** — write where you are looking, without
   crossing to `trace.html`. Saves to this browser, per painting. *No backend.*
2. **A reading view** — everyone's notes on a scroll in scroll order, read as a
   sequence the way you would unroll to the end and read what was written.
   *No backend; works on your own notes today.*
3. **The endpoint** — submit → pending → approved → public. Option A.
4. **Accounts** — only if "your painting on any device" turns out to matter more
   than "one shared scroll". Option B, and not before.

Steps 1 and 2 are worth doing whether or not 3 ever happens, and 2 is the one
that would most change how the site reads.

## The decision that is not mine

**Does a stranger's writing appear on your painting, and who decides?**

Everything above assumes: you approve, public writing carries a name, nothing
anonymous gets mounted. Open and unmoderated is a different system, and most of
what it needs is not technical.
