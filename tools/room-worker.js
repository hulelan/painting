/* room-worker.js — the one endpoint a static site cannot provide.

   A room is a shared notebook across ALL the paintings, not one per scroll:
   the trip is the unit, not the artwork. Every note carries the slug of the
   painting it sits on, so one room holds the whole visit and a reader can ask
   for everything or for one scroll.

   Deploy (once, ~5 minutes):
     1. dash.cloudflare.com -> Workers & Pages -> Create -> Worker -> paste this
     2. Settings -> Bindings -> add KV namespace, variable name ROOMS
     3. Deploy, copy the worker URL
     4. Open the site with #room=<id>&api=<worker url> once; both are remembered

   Routes
     GET  /r/<id>            -> {seq, notes:[...], log:[...]}
     GET  /r/<id>?since=<n>  -> only what changed after seq n
     POST /r/<id>            -> {op:'add'|'edit'|'del', note:{...}, by:'name'}

   There is no account. The room id IS the credential: 128 bits from
   getRandomValues, carried in the URL fragment so it never reaches a log.
   Anyone holding it can read and write; anyone without it cannot find it.
   That is the right trade for six friends and the wrong one for the public. */

const CAP = {
  body: 8 * 1024,      // one request
  title: 90,
  text: 1200,
  name: 40,
  notes: 500,          // per room
  log: 400,            // events kept
  perMin: 60,          // requests per IP per minute
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v) : 0);

// A note is only ever rebuilt from known fields. Whatever else a client sends
// is dropped here rather than trusted later -- the store should not hold a
// shape the reader does not expect.
function clean(n, by, seq) {
  return {
    id: str(n.id, 40) || (seq + '-' + Math.random().toString(36).slice(2, 8)),
    slug: str(n.slug, 30) || 'qianli',
    x: num(n.x), y: num(n.y), w: num(n.w), h: num(n.h),
    title: str(n.title, CAP.title),
    text: str(n.text, CAP.text),
    by: str(by, CAP.name) || 'anon',
    at: new Date().toISOString(),
  };
}

async function rateOk(env, ip) {
  const k = 'rate:' + ip + ':' + Math.floor(Date.now() / 60000);
  const n = parseInt((await env.ROOMS.get(k)) || '0', 10) + 1;
  await env.ROOMS.put(k, String(n), { expirationTtl: 120 });
  return n <= CAP.perMin;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const m = /^\/r\/([A-Za-z0-9_-]{8,64})$/.exec(url.pathname);
    if (!m) return json({ error: 'not a room' }, 404);
    const key = 'room:' + m[1];

    if (!env.ROOMS) return json({ error: 'no KV binding named ROOMS' }, 500);

    const ip = req.headers.get('CF-Connecting-IP') || '0';
    if (!(await rateOk(env, ip))) return json({ error: 'slow down' }, 429);

    const room = (await env.ROOMS.get(key, 'json')) || { seq: 0, notes: [], log: [] };

    if (req.method === 'GET') {
      const since = parseInt(url.searchParams.get('since') || '-1', 10);
      if (since >= 0) {
        return json({
          seq: room.seq,
          notes: room.notes.filter(n => (n.seq || 0) > since),
          log: room.log.filter(e => e.seq > since),
          partial: true,
        });
      }
      return json({ seq: room.seq, notes: room.notes, log: room.log });
    }

    if (req.method !== 'POST') return json({ error: 'GET or POST' }, 405);

    const raw = await req.text();
    if (raw.length > CAP.body) return json({ error: 'too big' }, 413);

    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: 'bad json' }, 400); }

    const seq = room.seq + 1;
    const op = body.op === 'edit' || body.op === 'del' ? body.op : 'add';
    const by = str(body.by, CAP.name) || 'anon';
    let note = null;

    if (op === 'del') {
      const id = str(body.id, 40);
      const was = room.notes.find(n => n.id === id);
      // Only the writer may remove their own. Not a security boundary -- the
      // name is typed, not proved -- but it stops the ordinary accident.
      if (!was) return json({ error: 'no such note' }, 404);
      if (was.by !== by) return json({ error: 'not yours' }, 403);
      room.notes = room.notes.filter(n => n.id !== id);
      note = { id, slug: was.slug, title: was.title };
    } else {
      if (!body.note) return json({ error: 'no note' }, 400);
      note = clean(body.note, by, seq);
      note.seq = seq;
      const i = room.notes.findIndex(n => n.id === note.id);
      if (i >= 0) {
        if (room.notes[i].by !== by) return json({ error: 'not yours' }, 403);
        note.at = room.notes[i].at;         // keep the original date
        note.editedAt = new Date().toISOString();
        room.notes[i] = note;
      } else {
        if (room.notes.length >= CAP.notes) return json({ error: 'room is full' }, 409);
        room.notes.push(note);
      }
    }

    room.seq = seq;
    room.log.push({ seq, op, by, at: new Date().toISOString(),
                    slug: note.slug, title: note.title, id: note.id });
    if (room.log.length > CAP.log) room.log = room.log.slice(-CAP.log);

    await env.ROOMS.put(key, JSON.stringify(room));
    return json({ ok: true, seq, note });
  },
};
