// Input validation for the Revenue Line Score submit endpoint.
// normalizeLinkedinUrl is a TS port of score_sources.normalize_linkedin_url (Python); keep them in step.

const HOST_RX = /^(?:www\.|[a-z]{1,3}\.)?linkedin\.com$/i;
const SLUG_RX = /^[^\s/?#]+$/;
const UUID_RX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const EMAIL_RX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MAX_URL = 300;

// Python urllib.parse.unquote: %XX runs are decoded as UTF-8 with U+FFFD for bad bytes, never an exception.
function unquote(s: string): string {
  const enc = new TextEncoder();
  const out: number[] = [];
  for (let i = 0; i < s.length;) {
    if (s[i] === '%' && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 1, i + 3))) { out.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 3; continue; }
    const cp = s.codePointAt(i)!;
    out.push(...enc.encode(String.fromCodePoint(cp)));
    i += cp > 0xffff ? 2 : 1;
  }
  return new TextDecoder().decode(new Uint8Array(out));
}

// Python urllib.parse.quote (safe='/'): leaves letters, digits and _.-~ ; everything else percent-encoded as UTF-8.
function quote(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function normalizeLinkedinUrl(raw: unknown): [string, string] | null {
  let text = String(raw ?? '').trim();
  if (!text || text.length > MAX_URL) return null;
  text = text.replace(/[\t\r\n]/g, '');
  if (!text.includes('://')) text = 'https://' + text;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/.exec(text);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') return null;
  const hostPort = m[2].slice(m[2].lastIndexOf('@') + 1);
  const host = hostPort.replace(/:\d*$/, '').toLowerCase();
  if (!HOST_RX.test(host)) return null;
  const parts = m[3].split('/').filter(p => p);
  if (parts.length < 2 || parts[0].toLowerCase() !== 'in') return null;
  const slug = unquote(parts[1]).normalize('NFC').trim().toLowerCase();
  if (!slug || !SLUG_RX.test(slug)) return null;
  return [slug, `https://www.linkedin.com/in/${quote(slug)}/`];
}

const ENUMS = {
  revenue: ['under_10k', '10k_30k', '30k_100k', 'over_100k'],
  team: ['solo', '2_5', '6_20', 'over_20'],
  source: ['referrals', 'outbound', 'content', 'ads', 'mixed'],
  goal: ['more_calls', 'steadier_pipeline', 'less_founder_time', 'grow_team'],
} as const;

export type Submission = {
  slug: string; url: string; email: string; website: string | null;
  answers: Record<keyof typeof ENUMS, string>; consent: boolean; session: string | null;
};
export type Validated = { value: Submission } | { error: 'linkedin_url' | 'email' | 'answers' | 'website' };

export function validateSubmission(input: unknown): Validated {
  const v = (input && typeof input === 'object' && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const li = typeof v.linkedin_url === 'string' ? normalizeLinkedinUrl(v.linkedin_url) : null;
  if (!li) return { error: 'linkedin_url' };
  const email = typeof v.email === 'string' ? v.email.trim() : '';
  if (!email || email.length > 254 || !EMAIL_RX.test(email)) return { error: 'email' };
  const a = (v.answers && typeof v.answers === 'object' && !Array.isArray(v.answers) ? v.answers : {}) as Record<string, unknown>;
  const answers = {} as Record<keyof typeof ENUMS, string>;
  for (const k of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
    const x = a[k];
    if (typeof x !== 'string' || !(ENUMS[k] as readonly string[]).includes(x)) return { error: 'answers' };
    answers[k] = x;
  }
  let website: string | null = null;
  if (v.website !== undefined && v.website !== null) {
    if (typeof v.website !== 'string') return { error: 'website' };
    const w = v.website.trim();
    if (w) {
      let ok = w.length <= 200;
      if (ok) { try { const u = new URL(w); ok = (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname; } catch (_) { ok = false; } }
      if (!ok) return { error: 'website' };
      website = w;
    }
  }
  const session = typeof v.session_id === 'string' && UUID_RX.test(v.session_id) ? v.session_id : null;
  return { value: { slug: li[0], url: li[1], email, website, answers, consent: v.consent_nurture === true, session } };
}
