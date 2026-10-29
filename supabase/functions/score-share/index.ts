import { renderNotFound, renderShare } from './page.ts';

const TOKEN_RX = /^[A-Za-z0-9_-]{22,40}$/;

Deno.serve(async req => {
  const html = (status: number, body: string) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store' } });
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
  let last = '';
  try { last = decodeURIComponent(new URL(req.url).pathname.split('/').filter(Boolean).pop() || ''); } catch (_) { /* malformed escape: treated as an unknown token */ }
  const token = last.trim();
  if (!TOKEN_RX.test(token)) return html(404, renderNotFound());
  try {
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const result = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/score_public', {
      method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    });
    if (!result.ok) { console.error('score-share rpc failed', result.status); return html(503, renderNotFound()); }
    const row = await result.json();
    if (!row) return html(404, renderNotFound());
    return html(200, renderShare(token, row));
  } catch (e) { console.error('score-share failed', String(e)); return html(503, renderNotFound()); }
});
