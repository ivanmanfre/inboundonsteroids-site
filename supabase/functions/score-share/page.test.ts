import { firstName, renderNotFound, renderShare } from './page.ts';

const TOKEN = 'abcdefghijklmnopqrstuv_-ABC';
const has = (html: string, s: string) => { if (!html.includes(s)) throw Error(`missing ${s}\n${html}`); };
const lacks = (html: string, s: string) => { if (html.includes(s)) throw Error(`unexpected ${s}\n${html}`); };

Deno.test('share page carries the og tags, the image, the redirect and a visible link', () => {
  const html = renderShare(TOKEN, { status: 'complete', scores: { overall: 62 }, report: { subject: { name: 'Ivan Manfredi' } } });
  has(html, `<meta property="og:title" content="Ivan&#39;s Revenue Line Score: 62/100">`);
  has(html, '<meta property="og:description" content="');
  has(html, `<meta property="og:image" content="https://bjbvqvzbzczjbatgmccb.supabase.co/storage/v1/object/public/score/og/${TOKEN}.png">`);
  has(html, `<meta property="og:url" content="https://bjbvqvzbzczjbatgmccb.supabase.co/functions/v1/score-share/${TOKEN}">`);
  has(html, '<meta name="twitter:card" content="summary_large_image">');
  has(html, `<meta http-equiv="refresh" content="0; url=https://inboundonsteroids.com/score/r/?t=${TOKEN}">`);
  has(html, `<a href="https://inboundonsteroids.com/score/r/?t=${TOKEN}">`);
});

Deno.test('title falls back when there is no name; no score means no number', () => {
  has(renderShare(TOKEN, { scores: { overall: 40 }, report: {} }), 'content="Revenue Line Score: 40/100"');
  has(renderShare(TOKEN, { scores: { overall: 40 }, report: null }), 'content="Revenue Line Score: 40/100"');
  const none = renderShare(TOKEN, { status: 'queued', scores: null, report: null });
  has(none, 'content="Revenue Line Score"'); lacks(none, '/100');
});

Deno.test('first name: first word of the full name, escaped everywhere', () => {
  if (firstName('  Iván  Manfredi ') !== 'Iván') throw Error('first name');
  const html = renderShare(TOKEN, { scores: { overall: 7 }, report: { subject: { name: '"><script>alert(1)</script> Smith' } } });
  lacks(html, '<script>'); has(html, '&lt;script&gt;');
  lacks(html, 'content=""><');
});

Deno.test('non-numeric or out-of-range scores are not printed', () => {
  for (const overall of ['62', null, NaN, 140, -3]) lacks(renderShare(TOKEN, { scores: { overall }, report: {} }), '/100');
  has(renderShare(TOKEN, { scores: { overall: 61.6 }, report: {} }), ': 62/100');
});

Deno.test('not-found page links to /score/ and has no og image', () => {
  const html = renderNotFound();
  has(html, '<a href="https://inboundonsteroids.com/score/">'); lacks(html, 'og:image');
});
