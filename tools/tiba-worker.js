/* tiba-worker.js -- the one endpoint a static site cannot provide.

   A 題跋 is a colophon: someone's hand added to the scroll, signed, in the
   margin or on the tail. The committed files under assets/data are the mounted
   ones, and mounting is a decision the owner makes with a diff in front of
   them. This worker holds the tier in between: written, shared with whoever
   holds the pass, not yet part of the site. A pass is a stream. Every painting
   shares one, because a visit is the unit, not the artwork.

   There is no account. The pass IS the credential: 128 bits minted by the
   owner, carried to a guest in a link fragment. Anyone holding it reads and
   writes; anyone without it cannot find the stream. `by` is typed, not proved,
   so it stops the ordinary accident and nothing more. OWNER_KEY is the one
   real secret here, and it only buys `open` and an unrestricted `withdraw`.

   Deploy:
     npx wrangler secret put OWNER_KEY
     npx wrangler deploy

   Routes
     GET  /t/<pass>          -> {seq, items:[...]}   ?p=<slug> filters
     POST /t/<pass>          -> {op:'write'|'withdraw'|'open', ...}
*/

const CAP = {
  body: 8 * 1024,      // one request
  text: 480,
  by: 40,
  items: 300,          // per stream
  perMin: 60,          // requests per IP per minute
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const fin = v => typeof v === 'number' && isFinite(v);

const ID = /^[A-Za-z0-9_-]{22}$/;
const SLUG = /^[a-z0-9-]{1,32}$/;

function mintId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Timing is free for an attacker to measure, and a bearer key is guessed one
// byte at a time if the compare stops early.
function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const e = new TextEncoder();
  const x = e.encode(a), y = e.encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

function isOwner(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return false;
  if (!env.OWNER_KEY) return false;
  return sameKey(h.slice(7), env.OWNER_KEY);
}

// A colophon is only ever rebuilt from known fields. Whatever else a client
// sends is dropped here rather than trusted later -- the store should not hold
// a shape the reader does not expect.
function clean(it) {
  const out = {
    id: ID.test(it.id) ? it.id : mintId(),
    slug: str(it.slug, 32),
    at: new Date().toISOString(),
    by: str(it.by, CAP.by).trim(),
    text: str(it.text, CAP.text),
  };
  const s = it.spot;
  if (s && fin(s.x) && fin(s.y)) out.spot = { x: Math.round(s.x), y: Math.round(s.y) };
  return out;
}

async function rateOk(env, ip) {
  const k = 'rate:' + ip + ':' + Math.floor(Date.now() / 60000);
  const n = parseInt((await env.TIBA.get(k)) || '0', 10) + 1;
  await env.TIBA.put(k, String(n), { expirationTtl: 120 });
  return n <= CAP.perMin;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    const m = /^\/t\/([A-Za-z0-9_-]{22,64})$/.exec(url.pathname);
    if (!m) return json({ error: 'not a stream' }, 404);
    const key = 't:' + m[1];

    if (!env.TIBA) return json({ error: 'no KV binding named TIBA' }, 500);

    const ip = req.headers.get('CF-Connecting-IP') || '0';
    if (!(await rateOk(env, ip))) return json({ error: 'slow down' }, 429);

    const stream = await env.TIBA.get(key, 'json');

    if (req.method === 'GET') {
      if (!stream) return json({ error: 'not invited' }, 403);
      const p = url.searchParams.get('p');
      const items = p ? stream.items.filter(i => i.slug === p) : stream.items;
      return json({ seq: stream.seq, items });
    }

    if (req.method !== 'POST') return json({ error: 'GET or POST' }, 405);

    const raw = await req.text();
    if (raw.length > CAP.body) return json({ error: 'too big' }, 413);

    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: 'bad json' }, 400); }

    if (body.op === 'open') {
      if (!isOwner(req, env)) return json({ error: 'not yours' }, 403);
      if (stream) return json({ ok: true }, 200);
      await env.TIBA.put(key, JSON.stringify({ v: 1, seq: 0, items: [] }));
      return json({ ok: true }, 201);
    }

    if (!stream) return json({ error: 'not invited' }, 403);
    const seq = (stream.seq || 0) + 1;

    if (body.op === 'withdraw') {
      const id = str(body.id, 64);
      const was = stream.items.find(i => i.id === id);
      if (!was) return json({ error: 'no such colophon' }, 404);
      if (!isOwner(req, env) && was.by !== str(body.by, CAP.by).trim()) {
        return json({ error: 'not yours' }, 403);
      }
      stream.items = stream.items.filter(i => i.id !== id);
      stream.seq = seq;
      await env.TIBA.put(key, JSON.stringify(stream));
      return json({ ok: true, seq });
    }

    if (body.op !== 'write') return json({ error: 'no such op' }, 400);
    if (!body.item || typeof body.item !== 'object') return json({ error: 'no colophon' }, 400);

    const item = clean(body.item);
    if (!item.by) return json({ error: 'sign it' }, 400);
    if (!item.text) return json({ error: 'too long' }, 400);
    if (typeof body.item.text === 'string' && body.item.text.length > CAP.text) {
      return json({ error: 'too long' }, 400);
    }
    if (!SLUG.test(item.slug)) return json({ error: 'no painting' }, 400);

    item.seq = seq;
    const i = stream.items.findIndex(n => n.id === item.id);
    let status = 201;
    if (i >= 0) {
      if (stream.items[i].by !== item.by) return json({ error: 'not yours' }, 403);
      item.at = stream.items[i].at;        // the date a colophon was written, once
      stream.items[i] = item;
      status = 200;
    } else {
      if (stream.items.length >= CAP.items) return json({ error: 'full' }, 409);
      stream.items.push(item);
    }

    stream.seq = seq;
    await env.TIBA.put(key, JSON.stringify(stream));
    return json({ ok: true, seq, item }, status);
  },
};
