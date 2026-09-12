# 題跋. Writing after the painting, and on it

A colophon is one person's writing about one painting, signed and dated. It
sits on the mounting silk after the last mountain, where 蔡京 and 溥光 wrote
after 千里江山图, or at a spot on the painting itself. This page says how it
works, what to tell a friend, and what the owner does.

## What a visitor sees

Every visitor can write, anywhere. Turn on 題 in the panel. A tap on the
painting places a colophon at that point and a drag frames one round
something, at any zoom and on a phone. Unroll past the end of the painting and
the scroll keeps going onto blank silk. Tap the silk and an editor opens, with
or without 題. The 題跋 row holds the list, the invite, and the file.

Writing has three statuses and one record.

| status | where it lives | who sees it |
|---|---|---|
| private | this browser only | the writer |
| shared | the circle's endpoint | anyone holding the invite |
| mounted | a committed file, `assets/data/tiba-<slug>.js` | everyone |

A private colophon is a pale sheet with a dashed edge, laid beside the scroll.
A shared one is pasted on. A mounted one is on the silk itself and the editor
will not change it. The editor's first line always says which of the three it
is, before anyone types.

The id is minted in the writer's browser and is the same string in all three
places. Mounting changes the status and nothing else.

## What to tell a friend

Send them one link. It is the painting's address with the invite on the end:

```
https://classicalchinesepainting.com/?p=qianli#tiba=<pass>
```

Then say this.

1. Open the link once. The invite is remembered on that device and taken off
   the address bar, so copying the address later does not pass it on.
2. Turn on 題 and tap the painting where the remark belongs, or drag a box
   round it. Or unroll to the end of the painting and tap the blank silk to
   write after it.
3. Sign when asked. The name is typed, not proved. It is a signature, not a
   login.
4. Press 送呈 to send it to the circle. Until then it is private to that
   browser. After that anyone with the invite can read it.
5. 存檔 saves everything you wrote, on every painting, as one file. That file
   is how writing survives a cleared browser, and how the owner can mount it
   without an endpoint.

Without the invite a visitor does everything except send.

## What the owner does

Once, ever. Deploy the worker and open the stream.

```
npx wrangler login                      # a browser tab asks you to allow Wrangler
npx wrangler secret put OWNER_KEY       # paste a long random string; keep it
npx wrangler deploy                     # prints the worker URL
python3 tools/tiba.py open --api https://ccp-tiba.<sub>.workers.dev --owner-key <OWNER_KEY>
```

`open` prints the invite fragment and one line to paste into
`assets/data/paintings.js` (`window.TIBA_API = '...'`). Commit that line and
run `tools/stamp_build.py`. The KV namespace is already bound in
`wrangler.toml`.

Thereafter, the moderation queue is a terminal.

```
python3 tools/tiba.py list --api <url> --pass <pass>
python3 tools/tiba.py take --api <url> --pass <pass> --owner-key <key> <id> [<id> ...]
python3 tools/tiba.py take --from tiba-2026-09-12.json <id> [<id> ...]
```

`take` appends the records to `assets/data/tiba-<slug>.js`, ids carried and
dates kept, refuses an unsigned one, and withdraws the mounted ids from the
stream. It never runs git. Read the diff, then commit.

To rotate the invite, run `open` again and send the new link. Old links stop
working. Nothing stored moves.

## What is deliberately not here

No accounts, no email, no replies, no votes, no notifications, no editing after
mounting, no rich text, no public writing. Strangers read what is mounted. The
invited write. Publishing the pass would open writing to everyone with no
migration, and rotating it closes it again.

## The shape

```
Colophon = { id, slug, at, by, text, spot? }
  id    22 base64url chars from 16 random bytes, minted in the writer's browser
  slug  painting slug from the register
  at    ISO 8601, set once
  by    signature, 1 to 40 chars
  text  1 to 480 chars
  spot  {x, y, w?, h?} in source pixels, centre and extent. Absent means the tail.
```

`status` exists only in the browser's own record (`localStorage`
`ccp_tiba_v1`). The endpoint implies shared and the file implies mounted, so
the wire and the file carry no status field and nothing can drift. The read
join advances a status and never rewinds it.

Where a tail colophon sits is derived from the list, oldest nearest the
painting, so mounting moves nothing and two browsers agree. The tail is real
pan domain. `clamp()` reaches below `x0=0` on a handscroll and past `PH` on a
hanging one. The whole tail and every box or dot on the painting are drawn on one canvas,
`#silk`, so a hundred colophons cost a hundred `fillText` calls and no DOM.

## Endpoint

`tools/tiba-worker.js`, one Cloudflare Worker, one KV binding `TIBA`.

```
GET  /t/<pass>?p=<slug>            {seq, items}           403 without a real pass
POST /t/<pass>  {op:'write', item}  201 new, 200 replaced, 403 not yours, 400 sign it
POST /t/<pass>  {op:'withdraw', id, by}
POST /t/<pass>  {op:'open'}         Authorization: Bearer <OWNER_KEY>
```

Per-IP rate limit of 60 a minute, 8 KB body cap, fields whitelisted on the way
in. `tests/test_tiba_worker.mjs` runs the routes against an in-memory KV.
