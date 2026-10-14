// RB2B paid identity lookup for one anonymous visitor IP. At most 5 credits:
// ip_to_company (1) + ip_to_hem (1), then for the top hashed email
// hem_to_best_linkedin (1) + hem_to_business_profile (2). The raw IP is never stored.
const RB2B = 'https://api.rb2b.com/api/v1';
const md5 = /^[a-f0-9]{32}$/i;

export function isPublicIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return !(a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127));
  }
  return ip.includes(':') && !/^(::1$|fc|fd|fe80)/i.test(ip);
}

// ip_to_hem returns a ranked list; take the first MD5 found in document order.
export function topMd5(value: unknown): string | null {
  if (typeof value === 'string') return md5.test(value) ? value.toLowerCase() : null;
  if (Array.isArray(value)) { for (const x of value) { const m = topMd5(x); if (m) return m; } return null; }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const k of ['md5', 'hem', 'md5s', 'hems', 'results', 'data']) { const m = topMd5(o[k]); if (m) return m; }
    for (const x of Object.values(o)) { const m = topMd5(x); if (m) return m; }
  }
  return null;
}

type Call = { status: number; body: unknown };

export async function identify(ip: string, apiKey: string, fetcher: typeof fetch = fetch) {
  let credits = 0;
  const call = async (path: string, body: Record<string, string>, cost: number): Promise<Call> => {
    const r = await fetcher(RB2B + path, { method: 'POST', headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await r.text();
    if (r.status === 401 || r.status === 402 || r.status === 429 || r.status >= 500) throw new Error(`rb2b ${path} ${r.status}: ${text.slice(0, 200)}`);
    if (r.ok) credits += cost;
    let parsed: unknown = null; try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
    return { status: r.status, body: r.ok ? parsed : null };
  };
  const [company, hems] = await Promise.all([call('/ip_to_company', { ip_address: ip }, 1), call('/ip_to_hem', { ip_address: ip }, 1)]);
  const top = topMd5(hems.body);
  const [linkedin, profile] = top
    ? await Promise.all([call('/hem_to_best_linkedin', { md5: top }, 1), call('/hem_to_business_profile', { md5: top }, 2)])
    : [null, null];
  return { company: company.body, hems: hems.body, top_md5: top, linkedin: linkedin?.body ?? null, business_profile: profile?.body ?? null, credits_used: credits };
}
