/* One endpoint so the tracer can sync between devices.
 *
 * Cloudflare Worker + KV. Free tier is far more than this needs.
 * Deploy:
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker → paste this
 *   2. Settings → Variables → KV Namespace Bindings → add binding named TRACES
 *   3. Settings → Variables → add a secret named KEY (any long random string)
 *   4. Copy the worker URL, e.g. https://ccp-sync.<you>.workers.dev
 *
 * Then in the tracer press Sync once and paste the URL and the key.
 * Reads are open; writes need the key, so a stranger who finds the URL can
 * look but cannot overwrite your trace.
 */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Key',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const name = (url.pathname.replace(/^\/+/, '') || 'live')
      .replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'live';

    if (req.method === 'GET') {
      const v = await env.TRACES.get('t:' + name);
      return new Response(v || JSON.stringify({ empty: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      if (req.headers.get('X-Key') !== env.KEY)
        return new Response('bad key', { status: 403, headers: cors });
      const body = await req.text();
      if (body.length > 2_000_000)
        return new Response('too big', { status: 413, headers: cors });
      let parsed;
      try { parsed = JSON.parse(body); }
      catch { return new Response('not json', { status: 400, headers: cors }); }
      parsed.savedAt = new Date().toISOString();
      await env.TRACES.put('t:' + name, JSON.stringify(parsed));
      return new Response(JSON.stringify({ ok: true, savedAt: parsed.savedAt }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response('method not allowed', { status: 405, headers: cors });
  },
};
