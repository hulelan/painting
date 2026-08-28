# 題跋 — letting people write on the painting

*A proposal, not a build. The last section is the one decision I can't make for you.*

## The precedent is the point

The framing isn't social media, and it isn't comments. It's **題跋** (tíbá) —
colophons. On the actual 千里江山图 there are inscriptions by 蔡京 and by 溥光,
added decades apart, and the Qianlong emperor wrote on it too. **The scroll as it
exists today is the painting plus its responses**, mounted on the same silk. A
later viewer reads both. Nobody calls that a comment section.

Two things follow that a comment box would get wrong:

- **A colophon is placed.** It sits at a particular point on the roll — usually
  after the painting, sometimes in the margin beside what it responds to. Your
  notes already have this: a box round a thing, not a reply to a thread.
- **A colophon is signed and dated, and it is permanent.** It is not a reaction.
  This argues for making it slightly *harder* to write than a comment, not easier.

The three tiers you named map onto this cleanly:

| tier | 題跋 equivalent | where it lives |
|---|---|---|
| private snippet | a note in your own hand, unmounted | this browser only |
| private comment | a draft colophon, written but not mounted | your file, or your account |
| public | mounted on the scroll for later viewers | the server, after review |

## What already works

- **Placement, drawing, writing** — `trace.html` Objects mode.
- **Persistence for one person** — `Save file` writes a JSON you keep; `Import…`
  merges it back, and refuses a file traced on a different image.
- **Publication** — a commit to `notes.js`, which the viewer renders as *Noticed*.

So tier 1 and tier 2 exist today, and tier 3 exists with me as the mount.

## What's missing, and what it costs

Everything hard is in tier 3, and none of it is the writing.

**A static site cannot accept a write.** GitHub Pages serves files. Any public
tier needs one endpoint that accepts a POST. That is the whole architectural
question; the rest follows from it.

Three ways, honestly costed:

**A. No accounts. A worker, a queue, and you.**
A Cloudflare Worker (~60 lines) accepts a colophon, stores it in KV as *pending*,
and the viewer reads only *approved*. You approve from a page only you can open.
Identity is whatever name the writer types.
*Cost:* a free Cloudflare account, one deploy, and your attention per submission.
*Risk:* an open write endpoint gets junk eventually. Rate limit, size cap, and
the fact that nothing is visible until you approve it, contain that.
*This is the one I'd build.*

**B. Accounts, via someone else's.** Sign in with GitHub. Identity solved, spam
mostly solved, no password storage. But it asks a visitor to have a GitHub
account to write on a painting, which selects for programmers — the wrong crowd
for this.

**C. Accounts you run.** Email, passwords, resets, sessions, a database, and a
duty of care over other people's data. For a site about a scroll, no.

**On "some way for it to persist":** persistence and accounts are separable, and
that's the useful insight. A file you save is persistence without identity. An
account is identity, which you only need when *other people* must see your name
attached to something. Tier 1 and 2 need no account at all. Only tier 3 does, and
option A gets even that with a typed name.

## What I'd build, in order

1. **Colophon mode in the viewer** — write where you're looking, without going to
   `trace.html`. Saves to this browser. *No backend.*
2. **A signed export** — extend the save file to hold colophons. *No backend.*
3. **The worker** — submit → pending → you approve → public. One deploy.
4. **A reading view** — colophons in scroll order, so the responses can be read
   as a sequence, the way you'd unroll to the end and read what people wrote.

Steps 1 and 2 are worth doing whether or not 3 ever happens.

## Where you've landed: accounts and a public square

Later steer, recorded before it gets lost:

> people can have accounts and they can have their own way. There might be a
> public version of the painting and people can comment on it... There is a
> private version so it might be something like accounts in a public square.

That is a different shape from the tiers above, and a clearer one. Not three
grades of visibility on one artefact — **two artefacts**:

- **your painting** — a copy that is yours, that you write on freely, that
  nobody else sees and nobody moderates;
- **the public square** — one shared scroll, where what you post is mounted for
  everyone, and where the rules of a shared place apply.

Publishing is then a deliberate crossing from one to the other, not a visibility
flag. That is easier to explain to a visitor and easier to reason about in code:
private is a document, public is a place.

It does need accounts, because "your painting" has to be yours on a second
device and after clearing the browser. Option B (sign in with someone else's
identity) becomes the reasonable one — the objection I raised, that GitHub
selects for programmers, is answered by using something ordinary instead.

**Not building this yet.** Recorded so the next session starts here rather than
from the tier model.

## The decision I can't make

**Does a stranger's writing appear on your painting, and who decides?**

Everything above assumes: you approve, publicly-visible writing carries a name,
and nothing is anonymous once mounted. If instead you want it open and
unmoderated, that's a different system — and a different set of things to worry
about, most of them not technical.
