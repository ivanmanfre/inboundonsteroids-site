const SITE = 'https://inboundonsteroids.com';
const FN = 'https://bjbvqvzbzczjbatgmccb.supabase.co/functions/v1/score-share';
const OG = 'https://bjbvqvzbzczjbatgmccb.supabase.co/storage/v1/object/public/score/og';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function firstName(name: unknown): string {
  return typeof name === 'string' ? (name.trim().split(/\s+/)[0] || '') : '';
}

type Row = { status?: unknown; scores?: { overall?: unknown } | null; report?: { subject?: { name?: unknown } } | null } | null;

const shell = (head: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head>` +
  `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;

export function renderShare(token: string, row: Row): string {
  const raw = row?.scores?.overall;
  const n = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 100 ? Math.round(raw) : null;
  const first = firstName(row?.report?.subject?.name);
  const base = first ? `${first}'s Revenue Line Score` : 'Revenue Line Score';
  const title = n === null ? base : `${base}: ${n}/100`;
  const desc = n === null
    ? 'A free check of how a LinkedIn profile turns attention into sales calls, with the evidence behind it.'
    : 'A free check of how this LinkedIn profile turns attention into sales calls, scored with the evidence behind it.';
  const dest = `${SITE}/score/r/?t=${encodeURIComponent(token)}`;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(`${OG}/${token}.png`)}">`,
    `<meta property="og:url" content="${esc(`${FN}/${token}`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(`${OG}/${token}.png`)}">`,
    `<meta http-equiv="refresh" content="0; url=${esc(dest)}">`,
  ].join('');
  return shell(head, `<h1>${esc(title)}</h1><p>${esc(desc)}</p><p><a href="${esc(dest)}">See the full result</a></p>`);
}

export function renderNotFound(): string {
  return shell('<title>Revenue Line Score</title><meta name="robots" content="noindex">',
    `<h1>We could not find that score</h1><p>The link may be incomplete.</p><p><a href="${SITE}/score/">Get your own Revenue Line Score</a></p>`);
}
