const origins = new Set(['https://inboundonsteroids.com', 'https://www.inboundonsteroids.com']);
const TOKEN_RX = /^[A-Za-z0-9_-]{22,40}$/;

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
  if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return origins.has(origin) ? new Response(null, { status: 204, headers }) : new Response('Forbidden', { status: 403 });
  if (req.method !== 'GET') return reply(405, { error: 'method' });
  const token = new URL(req.url).searchParams.get('t') || '';
  if (!TOKEN_RX.test(token)) return reply(400, { error: 'token' });
  try {
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const result = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/score_public', {
      method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    });
    if (!result.ok) { console.error('score-status rpc failed', result.status); return reply(503, { error: 'storage' }); }
    const data = await result.json();
    if (!data) return reply(404, { error: 'not_found' });
    return reply(200, data);
  } catch (e) { console.error('score-status failed', String(e)); return reply(503, { error: 'storage' }); }
});
