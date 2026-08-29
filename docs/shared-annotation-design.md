# Sharing annotations — how it could work

*The concrete question: you and friends are going to see the Song show, and you
want to write on the paintings and read each other's writing. Not the internet's
writing. Theirs.*

## The distinction that decides everything

**Identity is not the same as access, and you only need the one you actually
have a use for.**

- **Access** — may this person write here at all?
- **Identity** — whose writing is this?

A comment board for six friends needs *access control* (keep strangers out) and
*attribution* (know who said what). It does **not** need accounts in the sense of
stored credentials, password resets, or a user table. Attribution can be a name
someone types once; access can be a secret they hold.

Accounts are what you reach for when the two must be enforced against people who
have an incentive to lie. For a group who are about to share a car to Kansas
City, that incentive does not exist.

## Four designs, cheapest first

### 1. A shared room, entered by link

One secret in the URL: `…/?p=houchibi#room=cxk7f2m9tq`. Anyone with the link
reads and writes that room; nobody without it can find it. Each writer types a
display name once, kept in their browser, attached to what they post.

- **Server:** one worker, one KV store, ~80 lines. `GET /room/<id>` returns the
  notes, `POST /room/<id>` appends one.
- **Security:** the room id is the credential — 128 bits of randomness, in the
  URL *fragment*, so it is never sent to the server or written to any log.
  Unguessable, unlisted, and not indexed.
- **Fails at:** revocation. Someone who leaves the trip still has the link.
  Fixing that means rotating the id, which means sending everyone a new one.
- **Effort:** an afternoon. **Cost:** free tier, comfortably.

### 2. A room with a passphrase

Same, but the room is named (`#room=song-trip`) and writing requires a phrase
you tell people. Reading can stay open or not.

- **Better than 1 at:** a link that survives being pasted in a group chat and
  screenshotted.
- **Worse at:** everyone shares one secret, so one leak reopens everything and
  the phrase has to change for all.

### 3. Sign in with Google

Real accounts, none of them yours to keep. Google says who someone is; you keep
a list of which email addresses may write.

- **Server:** the same worker plus token verification — fetch Google's public
  keys, check the JWT signature, `aud`, `iss`, `exp`. About 40 more lines, no
  library needed.
- **Security:** the strongest of the four, and the only one with real
  revocation: remove an address from the allow-list and that person is out,
  immediately, with no effect on anyone else.
- **The real cost is not code.** You would be holding a list of your friends'
  email addresses on a server, which is personal data you are then responsible
  for. It also means anyone who wants to write must have a Google account and be
  willing to hand you their identity, which for a painting is a lot to ask.
- **Effort:** a day, including the OAuth app.

### 4. Magic links by email

You email a signed link; clicking it proves the address.

- **Requires** an email sender (Resend, Postmark) and their pricing, plus
  deliverability trouble the day someone's institution eats the mail.
- **Buys you** what option 3 buys, with more moving parts and worse reliability.
- **Not recommended.** Email is a worse Google.

## What I would build for the trip

**Option 1, with the shape of 3 left open.**

Six people, one scroll, a week. The room link goes in the group chat, everyone
types their name once, and the notes appear under each other's names within a
second or two. Nobody makes an account to look at a painting. If it turns out
you want it permanent and public later, the storage does not change — only how
a writer proves who they are, which is the last thing to bolt on rather than
the first.

**Concretely, three layers, in the order they should exist:**

| | what it is | who can see it |
|---|---|---|
| **your notes** | localStorage + `Save file` | you, this browser | **built** |
| **a room** | worker + KV, link is the key | whoever has the link | *~80 lines* |
| **the scroll** | a commit to `notes-<slug>.js` | everyone | **built** |

Publishing stays a deliberate crossing: a note is yours, then the room's, then —
if you decide — the painting's. The room is where a trip's conversation lives;
the scroll is where the durable inscriptions go.

## The security bits that actually matter

Small, and worth stating plainly rather than gesturing at "it's secure":

- **The room id is a credential.** Generate it with `crypto.getRandomValues`,
  never a timestamp or a counter. Keep it in the URL fragment, never the path or
  query, so it is not in server logs, referrer headers, or analytics.
- **Cap everything.** Note length, notes per room, requests per minute per IP.
  An open POST endpoint without caps is a free database for someone else.
- **Escape on the way out.** Notes are other people's text rendered in your page;
  set them with `textContent`, never `innerHTML`. This is the one bug in this
  design that could actually hurt a reader.
- **Names are claims, not proofs.** In options 1 and 2 anyone in the room can
  type any name. Fine among friends, and worth being honest that it is not
  authentication.
- **A room is not private from its members.** Anyone in it can copy the link.
  There is no technical fix; it is a social object.
- **Keep a way out.** Rooms expire, or you can delete one. Something that stores
  other people's writing forever with no delete is a liability, not a feature.

## What I would not do

- Store passwords. Ever.
- Ask for an email address to look at a painting.
- Make writing anonymous and public in the same step — that is the combination
  that turns a comment board into a moderation job.
