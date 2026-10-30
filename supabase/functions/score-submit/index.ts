import { validateSubmission } from './validation.ts';
import { readCapped } from './body.ts';

const origins = new Set(['https://inboundonsteroids.com', 'https://www.inboundonsteroids.com']);

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin)) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'method' });
  try {
    const bytes = await readCapped(req, 4096);
    if (!bytes) return reply(413, { error: 'size' });
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { return reply(400, { error: 'payload' }); }
    const checked = validateSubmission(input);
    if ('error' in checked) return reply(400, { error: checked.error });
    const s = checked.value;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const hashKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', hashKey, new TextEncoder().encode(ip)))).map(b => b.toString(16).padStart(2, '0')).join('');
    const result = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/score_submit', {
      method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_linkedin_slug: s.slug, p_linkedin_url: s.url, p_email: s.email, p_website: s.website, p_answers: s.answers, p_consent: s.consent, p_session: s.session, p_rate_key: rateKey }),
    });
    if (!result.ok) { console.error('score-submit rpc failed', result.status); return reply(503, { error: 'storage' }); }
    const out = await result.json();
    if (out?.error === 'rate') return reply(429, { error: 'rate' });
    if (out?.error) return reply(400, { error: String(out.error) });
    if (typeof out?.token !== 'string' || typeof out?.status !== 'string') { console.error('score-submit unexpected rpc reply'); return reply(503, { error: 'storage' }); }
    return reply(200, { token: out.token, status: out.status, over_cap: out.over_cap === true, reused: out.reused === true });
  } catch (e) { console.error('score-submit failed', String(e)); return reply(503, { error: 'storage' }); }
});
