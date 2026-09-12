/* What the worker owes the writer, checked without Cloudflare.

   node tests/test_tiba_worker.mjs

   The KV stub is a Map: get(key, 'json') and put(key, value) is the whole
   surface the worker uses. Everything asserted here is a literal from the
   contract, so a drift in a status code or an error string fails loudly. */
import assert from 'node:assert/strict';
import worker from '../tools/tiba-worker.js';

const OWNER_KEY = 'owner-key-for-the-test';
const PASS = 'AAAAAAAAAAAAAAAAAAAAAA';
const OTHER = 'BBBBBBBBBBBBBBBBBBBBBB';
const ID1 = 'CCCCCCCCCCCCCCCCCCCCCC';
const ID2 = 'DDDDDDDDDDDDDDDDDDDDDD';

function makeEnv() {
  const m = new Map();
  return {
    OWNER_KEY,
    TIBA: {
      async get(k, type) {
        const v = m.get(k);
        if (v === undefined) return null;
        return type === 'json' ? JSON.parse(v) : v;
      },
      async put(k, v) { m.set(k, v); },
      _map: m,
    },
  };
}

const env = makeEnv();
let passed = 0;

async function call(method, path, { body, owner } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (owner) headers.Authorization = 'Bearer ' + owner;
  const req = new Request('https://ccp-tiba.workers.dev' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await worker.fetch(req, env);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, res };
}

function check(name, got, want) {
  assert.deepEqual(got, want, name);
  passed++;
  console.log('  ok  ' + name);
}

const item = (over = {}) => ({ id: ID1, slug: 'qianli', by: '樂然', text: '一片江山', ...over });

// open
let r = await call('POST', '/t/' + PASS, { body: { op: 'open' } });
check('open without owner key -> 403', [r.status, r.body], [403, { error: 'not yours' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'open' }, owner: 'wrong-key' });
check('open with wrong owner key -> 403', [r.status, r.body], [403, { error: 'not yours' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'open' }, owner: OWNER_KEY });
check('open with owner key -> 201', [r.status, r.body], [201, { ok: true }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'open' }, owner: OWNER_KEY });
check('open again -> 200 and no overwrite', [r.status, r.body], [200, { ok: true }]);

// unknown pass
r = await call('GET', '/t/' + OTHER);
check('GET unknown pass -> 403', [r.status, r.body], [403, { error: 'not invited' }]);

r = await call('GET', '/t/' + PASS);
check('GET a fresh stream -> empty', [r.status, r.body], [200, { seq: 0, items: [] }]);

// write
r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ by: '  ' }) } });
check('write without by -> 400', [r.status, r.body], [400, { error: 'sign it' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ text: 'x'.repeat(481) }) } });
check('text of 481 chars -> 400', [r.status, r.body], [400, { error: 'too long' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ text: '' }) } });
check('write with no text -> 400', [r.status, r.body], [400, { error: 'too long' }]);

r = await call('POST', '/t/' + PASS, {
  body: {
    op: 'write',
    item: item({ spot: { x: 100.4, y: 20.6 }, status: 'shared', seq: 99, at: '1999-01-01T00:00:00Z', junk: 1 }),
  },
});
const first = r.body.item;
check('write -> 201', [r.status, r.body.ok, r.body.seq], [201, true, 1]);
check('unknown fields stripped', Object.keys(first).sort(),
  ['at', 'by', 'id', 'seq', 'slug', 'spot', 'text'].sort());
check('spot rounded', first.spot, { x: 100, y: 21 });
check('client at ignored', first.at === '1999-01-01T00:00:00Z', false);
check('seq assigned by the worker', first.seq, 1);

r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ text: '再題一句' }) } });
check('write same id same by -> 200', [r.status, r.body.item.text], [200, '再題一句']);
check('at unchanged', r.body.item.at, first.at);
check('new seq on every write', r.body.seq, 2);

r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ by: '別人' }) } });
check('write same id different by -> 403', [r.status, r.body], [403, { error: 'not yours' }]);

// a second painting, to check the filter
r = await call('POST', '/t/' + PASS, {
  body: { op: 'write', item: item({ id: ID2, slug: 'houchibi', by: '別人', text: '赤壁' }) },
});
check('write a second colophon -> 201', [r.status, r.body.seq], [201, 3]);

r = await call('GET', '/t/' + PASS);
check('GET returns both', r.body.items.map(i => i.id), [ID1, ID2]);

r = await call('GET', '/t/' + PASS + '?p=houchibi');
check('GET ?p=slug filters', r.body.items.map(i => i.id), [ID2]);

r = await call('GET', '/t/' + PASS + '?p=qianli');
check('GET ?p=qianli filters', r.body.items.map(i => i.id), [ID1]);

// withdraw
r = await call('POST', '/t/' + PASS, { body: { op: 'withdraw', id: ID1, by: '別人' } });
check('withdraw by other -> 403', [r.status, r.body], [403, { error: 'not yours' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'withdraw', id: 'ZZZZZZZZZZZZZZZZZZZZZZ', by: '樂然' } });
check('withdraw unknown id -> 404', [r.status, r.body], [404, { error: 'no such colophon' }]);

r = await call('POST', '/t/' + PASS, { body: { op: 'withdraw', id: ID1 }, owner: OWNER_KEY });
check('withdraw with owner key -> 200', [r.status, r.body], [200, { ok: true, seq: 4 }]);

r = await call('GET', '/t/' + PASS);
check('withdrawn colophon is gone', r.body.items.map(i => i.id), [ID2]);

// the edges
r = await call('OPTIONS', '/t/' + PASS);
check('OPTIONS -> 204 with CORS',
  [r.status, r.res.headers.get('Access-Control-Allow-Origin')], [204, '*']);
const g = await call('GET', '/t/' + PASS);
check('GET is no-store', g.res.headers.get('Cache-Control'), 'no-store');

r = await call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ id: ID2, slug: 'NOPE', by: '別人' }) } });
check('a slug outside the register -> 400', [r.status, r.body], [400, { error: 'no painting' }]);

r = await call('GET', '/r/' + PASS);
check('no /r/ routes', [r.status, r.body], [404, { error: 'not a stream' }]);

const big = { op: 'write', item: item({ text: 'x'.repeat(9000) }) };
r = await call('POST', '/t/' + PASS, { body: big });
check('body over 8 KB -> 413', [r.status, r.body], [413, { error: 'too big' }]);

// a box is a spot with extent; both sides or neither
{
  const w = spot => call('POST', '/t/' + PASS, { body: { op: 'write', item: item({ id: 'BOXBOXBOXBOXBOXBOXBOXB', spot }) } });
  const r1 = await w({ x: 10, y: 20, w: 30.4, h: 0 });
  check('box needs both sides', r1.body.item.spot, { x: 10, y: 20 });
  const r2 = await w({ x: 10, y: 20, w: 30.4, h: 12 });
check('box kept', r2.body.item.spot, { x: 10, y: 20, w: 30, h: 12 });
  await call('POST', '/t/' + PASS, { body: { op: 'withdraw', id: 'BOXBOXBOXBOXBOXBOXBOXB' }, owner: true });
}

console.log('\n' + passed + ' checks passed.');
