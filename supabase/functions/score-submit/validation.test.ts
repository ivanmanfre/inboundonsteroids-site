import { normalizeLinkedinUrl, validateSubmission } from './validation.ts';

const eq = (a: unknown, b: unknown, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw Error(`${msg} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };

// Same cases as tests/test_score_sources.py (test_normalize_variants / _rejects / unicode slug).
Deno.test('normalizeLinkedinUrl accepts the same variants as score_sources', () => {
  const cases: [string, [string, string]][] = [
    ['linkedin.com/in/ivan-manfredi?utm=x', ['ivan-manfredi', 'https://www.linkedin.com/in/ivan-manfredi/']],
    ['https://www.linkedin.com/in/ivan-manfredi/', ['ivan-manfredi', 'https://www.linkedin.com/in/ivan-manfredi/']],
    ['  https://uk.linkedin.com/in/x/recent-activity/all/  ', ['x', 'https://www.linkedin.com/in/x/']],
    ['https://uk.linkedin.com/in/x/recent-activity/', ['x', 'https://www.linkedin.com/in/x/']],
    ['http://m.linkedin.com/in/Some-Body-1a2b3c#top', ['some-body-1a2b3c', 'https://www.linkedin.com/in/some-body-1a2b3c/']],
    ['https://www.linkedin.com/in/x/?originalSubdomain=pl', ['x', 'https://www.linkedin.com/in/x/']],
  ];
  for (const [raw, want] of cases) eq(normalizeLinkedinUrl(raw), want, raw);
});

Deno.test('normalizeLinkedinUrl rejects the same inputs as score_sources', () => {
  const bad: unknown[] = ['', '   ', null, undefined, 'lnkd.in/abc', 'https://lnkd.in/dAbC12',
    'https://www.linkedin.com/company/acme', 'linkedin.com/showcase/acme/', 'https://www.linkedin.com/school/mit/',
    'https://www.linkedin.com/in/', 'https://www.linkedin.com/feed/', 'https://example.com/in/ivan',
    'https://notlinkedin.com/in/ivan', 'https://linkedin.com.evil.com/in/ivan', 'ivan manfredi'];
  for (const raw of bad) eq(normalizeLinkedinUrl(raw), null, String(raw));
});

Deno.test('normalizeLinkedinUrl: accented slug pasted in every form gives one slug and one percent-encoded URL', () => {
  const slug = 'iván-manfredi-120841202';
  const url = 'https://www.linkedin.com/in/iv%C3%A1n-manfredi-120841202/';
  for (const raw of ['https://www.linkedin.com/in/iv%C3%A1n-manfredi-120841202/', 'linkedin.com/in/iván-manfredi-120841202',
    'https://www.linkedin.com/in/IV%C3%81N-manfredi-120841202?x=1', 'https://www.linkedin.com/in/iva\u0301n-manfredi-120841202/']) // last one is decomposed (a + combining acute)
    eq(normalizeLinkedinUrl(raw), [slug, url], raw);
});

Deno.test('normalizeLinkedinUrl: a ;params suffix on the last path segment is dropped like urlparse', () => {
  eq(normalizeLinkedinUrl('https://www.linkedin.com/in/x;a=b'), ['x', 'https://www.linkedin.com/in/x/']);
  eq(normalizeLinkedinUrl('linkedin.com/in/x;a=b?y=1'), ['x', 'https://www.linkedin.com/in/x/']);
  eq(normalizeLinkedinUrl('https://www.linkedin.com/in/x;a=b/recent'), ['x;a=b', 'https://www.linkedin.com/in/x%3Ba%3Db/']); // not the last segment: kept, as in Python
  eq(normalizeLinkedinUrl('https://www.linkedin.com/in/;a=b'), null);
});

Deno.test('normalizeLinkedinUrl: python quote parity for reserved marks, malformed escapes do not throw', () => {
  eq(normalizeLinkedinUrl('https://www.linkedin.com/in/a(b)!c*d~e_f.g-h/'), ['a(b)!c*d~e_f.g-h', 'https://www.linkedin.com/in/a%28b%29%21c%2Ad~e_f.g-h/']);
  eq(normalizeLinkedinUrl('https://www.linkedin.com/in/a%ZZb/')?.[0], 'a%zzb');
  if (normalizeLinkedinUrl('https://www.linkedin.com/in/a%E0%A4b/') === null) throw Error('bad utf8 should decode with replacement, like python');
});

const good = () => ({ linkedin_url: 'https://www.linkedin.com/in/ivan-manfredi/', email: 'Visitor@Example.com',
  answers: { revenue: '10k_30k', team: 'solo', source: 'referrals', goal: 'more_calls' }, consent_nurture: true });
const err = (v: unknown) => { const r = validateSubmission(v); return 'error' in r ? r.error : null; };

Deno.test('valid submission is normalised', () => {
  const r = validateSubmission(good());
  if ('error' in r) throw Error('rejected ' + r.error);
  eq(r.value, { slug: 'ivan-manfredi', url: 'https://www.linkedin.com/in/ivan-manfredi/', email: 'Visitor@Example.com', website: null,
    answers: { revenue: '10k_30k', team: 'solo', source: 'referrals', goal: 'more_calls' }, consent: true, session: null });
});

Deno.test('consent defaults to false; session uuid optional but validated; website optional', () => {
  const { consent_nurture: _c, ...rest } = good();
  const r = validateSubmission({ ...rest, session_id: crypto.randomUUID(), website: 'https://acme.com/x' });
  if ('error' in r) throw Error('rejected');
  eq(r.value.consent, false); eq(r.value.website, 'https://acme.com/x');
  eq(r.value.session !== null, true);
  const s = validateSubmission({ ...good(), session_id: 'not-a-uuid' });
  eq('error' in s ? s.error : 'ok', 'ok'); // a bad session id is dropped, never a reason to refuse a visitor
  eq((s as { value: { session: unknown } }).value.session, null);
});

Deno.test('linkedin_url errors', () => {
  for (const u of ['', 'lnkd.in/abc', 'https://www.linkedin.com/company/acme', 42, null, undefined, 'https://www.linkedin.com/in/' + 'a'.repeat(400)])
    eq(err({ ...good(), linkedin_url: u }), 'linkedin_url', String(u));
});

Deno.test('email shapes', () => {
  for (const e of ['', 'nope', 'a@b', 'a b@c.com', '@c.com', 'a@@c.com', 'a@c..com', 'a@.com', 'a@c.com.', 7, null, 'a'.repeat(250) + '@x.com', 'a@b.c\nd.com'])
    eq(err({ ...good(), email: e }), 'email', String(e));
  for (const e of ['a@b.co', 'first.last+tag@sub.example.com', 'x_y@e-x.io'])
    eq(err({ ...good(), email: e }), null, e);
});

Deno.test('answers must be exactly the fixed enums, all four required', () => {
  const a = good().answers;
  for (const bad of [undefined, null, 'x', [], {}, { ...a, revenue: 'rich' }, { ...a, team: '2-5' }, { ...a, source: 'seo' },
    { ...a, goal: 'more_money' }, { ...a, revenue: undefined }, { revenue: a.revenue, team: a.team, source: a.source }])
    eq(err({ ...good(), answers: bad }), 'answers', JSON.stringify(bad));
  for (const rev of ['under_10k', '10k_30k', '30k_100k', 'over_100k']) eq(err({ ...good(), answers: { ...a, revenue: rev } }), null);
  for (const t of ['solo', '2_5', '6_20', 'over_20']) eq(err({ ...good(), answers: { ...a, team: t } }), null);
  for (const s of ['referrals', 'outbound', 'content', 'ads', 'mixed']) eq(err({ ...good(), answers: { ...a, source: s } }), null);
  for (const g of ['more_calls', 'steadier_pipeline', 'less_founder_time', 'grow_team']) eq(err({ ...good(), answers: { ...a, goal: g } }), null);
});

Deno.test('extra answer keys are dropped, not stored', () => {
  const r = validateSubmission({ ...good(), answers: { ...good().answers, evil: 'x'.repeat(100) } });
  if ('error' in r) throw Error('rejected');
  eq(Object.keys(r.value.answers).sort(), ['goal', 'revenue', 'source', 'team']);
});

Deno.test('website: optional http(s) url, 200 chars max, otherwise dropped', () => {
  // An unusable optional website is dropped, never a reason to refuse the submission.
  for (const w of ['javascript:alert(1)', 'acme.com', 'ftp://x.com', 'https://' + 'a'.repeat(200) + '.com', 5, 'https://', {}, []]) {
    const r = validateSubmission({ ...good(), website: w });
    if ('error' in r) throw Error('website rejected the submit: ' + String(w));
    eq(r.value.website, null, String(w));
  }
  for (const w of [undefined, null, '', '  ']) eq(err({ ...good(), website: w }), null, String(w));
  eq(err({ ...good(), website: 'http://acme.com' }), null);
});

Deno.test('non-object bodies', () => {
  for (const v of [null, 'x', 5, [], undefined]) eq(err(v), 'linkedin_url');
});
