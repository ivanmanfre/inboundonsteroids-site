import { validateEvent } from './validation.ts';
import { identify, isPublicIp } from './identity.ts';
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };
const origins = new Set(['https://inboundonsteroids.com','https://www.inboundonsteroids.com']);
Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':origin, 'Vary':'Origin', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'content-type' };
  const reply = (status:number, body:unknown) => new Response(JSON.stringify(body),{status,headers});
  if (!origins.has(origin)) return new Response('Forbidden',{status:403});
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply(405,{error:'method'});
  if (Number(req.headers.get('content-length')) > 4096) return reply(413,{error:'size'});
  try {
    const reader = req.body?.getReader(); if(!reader) return reply(400,{error:'body'});
    let size = 0; const chunks: Uint8Array[] = [];
    while(true) { const {value,done}=await reader.read(); if(done) break; size+=value.length; if(size>4096){await reader.cancel();return reply(413,{error:'size'});} chunks.push(value); }
    const bytes = new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const event = validateEvent(JSON.parse(new TextDecoder().decode(bytes)));
    if (!event) return reply(400,{error:'event'});
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const hashKey = await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const hash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hashKey,new TextEncoder().encode(ip)))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const bot = /bot|spider|crawler|headless/i.test(req.headers.get('user-agent') || '');
    const result = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/ios_web_ingest_event',{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({p_event:{...event,is_bot:bot},p_rate_key:hash}),
    });
    if (!result.ok) { console.error('site-events write failed',result.status);return reply(503,{error:'storage'}); }
    const accepted = await result.json();
    const rb2bKey = Deno.env.get('RB2B_API_KEY');
    if (accepted && rb2bKey && event.event_type === 'page_view' && !event.is_test && !bot && isPublicIp(ip)) EdgeRuntime.waitUntil(lookup(ip,hash,event,rb2bKey,key));
    return reply(accepted ? 202 : 429,{accepted});
  } catch (_) { return reply(400,{error:'payload'}); }
});

async function lookup(ip:string, ipKey:string, event:Record<string, unknown>, rb2bKey:string, key:string) {
  const rpc = (fn:string, body:unknown) => fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/' + fn,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const claim = await rpc('ios_web_claim_identity',{p_ip_key:ipKey,p_visitor:event.visitor_id,p_session:event.session_id,p_path:event.path});
    if (!claim.ok || !(await claim.json())) return;
    let result: Record<string, unknown>;
    try { result = await identify(ip, rb2bKey); } catch (e) { result = { error: String(e).slice(0, 300) }; }
    await rpc('ios_web_save_identity',{p_ip_key:ipKey,p_result:result});
  } catch (e) { console.error('identity lookup failed', String(e)); }
}
