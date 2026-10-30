// Smoke test for /score/ and /score/r/. Run from the repo root:
//   node --test tests/score-pages.spec.mjs
// Needs the `playwright` package; set PLAYWRIGHT_DIR to its node_modules folder if it is not the default below.
// SCORE_SHOTS=<dir> also saves screenshots of the landing fold and the result pages at 1440 and 390.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES, TOKENS } from './score-fixtures.mjs';

const require = createRequire(import.meta.url);
const PW_DIR = process.env.PLAYWRIGHT_DIR || `${process.env.HOME}/.claude/skills/playwright-driver/node_modules`;
const { chromium } = require(join(PW_DIR, 'playwright'));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = process.env.SCORE_SHOTS || '';
const WIDTHS = [390, 768, 1440];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml' };

let server, base, browser;
before(async () => {
  server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, path);
    try {
      if ((await stat(file)).isDirectory()) { res.writeHead(301, { Location: path + '/' }); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch (_) { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  if (SHOTS) await mkdir(SHOTS, { recursive: true });
});
after(async () => { await browser?.close(); server?.close(); });

const AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9A27E"/><stop offset="1" stop-color="#6E4B35"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="82" r="38" fill="#F1DCC6"/><ellipse cx="100" cy="190" rx="70" ry="60" fill="#2B2724"/></svg>`;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

async function open(path, { width = 1440, height = 900, fixtures = FIXTURES, submit, reducedMotion = 'no-preference', storage, status } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const calls = { status: 0 };
  await page.route('**/functions/v1/score-status*', (route) => {
    calls.status++;
    const t = new URL(route.request().url()).searchParams.get('t');
    if (status) { const r = status(t, calls.status); if (r) return route.fulfill({ headers: CORS, contentType: 'application/json', ...r }); }
    const body = fixtures[t];
    route.fulfill(body ? { status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) }
      : { status: 404, headers: CORS, contentType: 'application/json', body: '{"error":"not_found"}' });
  });
  await page.route('**/functions/v1/score-submit', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const reply = submit ? await submit(JSON.parse(route.request().postData())) : { status: 200, body: { token: TOKENS.running, status: 'queued', over_cap: false, reused: false } };
    return route.fulfill({ status: reply.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(reply.body) });
  });
  await page.route('**/functions/v1/site-events', (route) => route.fulfill({ status: 204, headers: CORS }));
  await page.route('https://media.licdn.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: AVATAR }));
  if (storage) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  await page.goto(base + path, { waitUntil: 'load' });
  return { page, errors, context, calls };
}
const settle = (page, ms = 1400) => page.waitForTimeout(ms);
async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function revealAll(page) {
  // scroll through so every entry fires, then back to the top
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.7)) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await settle(page, 900);
}

test('landing: link and form validation, then a submit carries the exact contract', async () => {
  let sent;
  const { page, errors, context } = await open('/score/', {
    storage: { ios_tracking_v1: JSON.stringify({ session_id: '3f1c2b4a-1111-4222-8333-944455566677', visitor_id: 'v', first_touch: { referrer_host: 'direct' }, last_touch: {}, expires: Date.now() + 1e9, active_at: Date.now() }) },
    submit: (b) => { sent = b; return { status: 200, body: { token: TOKENS.running, status: 'queued', over_cap: false, reused: false } }; },
  });
  const err = page.locator('#li-err');
  await page.click('#step1 button[type=submit]');
  assert.match(await err.textContent(), /Paste the link to your LinkedIn profile/);
  await page.fill('#li', 'https://www.linkedin.com/company/fernhill-studio/');
  await page.click('#step1 button[type=submit]');
  assert.match(await err.textContent(), /company page/);
  await page.fill('#li', 'https://lnkd.in/abc123');
  await page.click('#step1 button[type=submit]');
  assert.match(await err.textContent(), /Short links/);
  await page.fill('#li', 'https://example.com/in/maya');
  await page.click('#step1 button[type=submit]');
  assert.match(await err.textContent(), /not a LinkedIn link/);
  await page.fill('#li', 'linkedin.com/in/Maya-Okafor?utm_source=share');
  await page.click('#step1 button[type=submit]');
  await page.waitForSelector('#step2:not([hidden])');
  assert.equal(await page.textContent('#li-show'), 'linkedin.com/in/maya-okafor');

  await page.click('#go');
  assert.match(await page.textContent('#email-err'), /Check your email/);
  assert.match(await page.textContent('#q-err'), /each question/);
  await page.fill('#email', 'maya@fernhill');
  await page.click('#go');
  assert.match(await page.textContent('#email-err'), /Check your email/);
  await page.fill('#email', 'maya@fernhillstudio.com');
  await page.fill('#website', 'fernhillstudio.com');
  for (const id of ['rv3', 'tm2', 'sc1', 'gl1']) await page.click(`label[for=${id}]`);
  assert.equal(await page.isChecked('#consent'), false, 'the nurture box starts unticked');
  await Promise.all([page.waitForURL(/\/score\/r\/\?t=/), page.click('#go')]);
  assert.deepEqual(sent, {
    linkedin_url: 'https://www.linkedin.com/in/maya-okafor/', email: 'maya@fernhillstudio.com', website: 'https://fernhillstudio.com',
    answers: { revenue: '30k_100k', team: '2_5', source: 'referrals', goal: 'more_calls' }, consent_nurture: false,
    session_id: '3f1c2b4a-1111-4222-8333-944455566677',
  });
  assert.ok(page.url().endsWith('/score/r/?t=' + TOKENS.running));
  await page.waitForSelector('#log li:not(.wait)');
  assert.deepEqual(errors, []);
  await context.close();
});

test('landing: server refusals show plain messages', async () => {
  const { page, context } = await open('/score/', { submit: () => ({ status: 429, body: { error: 'rate' } }) });
  await page.fill('#li', 'https://www.linkedin.com/in/maya-okafor/');
  await page.press('#li', 'Enter');
  await page.waitForSelector('#step2:not([hidden])');
  await page.fill('#email', 'maya@fernhillstudio.com');
  for (const id of ['rv1', 'tm1', 'sc5', 'gl4']) await page.click(`label[for=${id}]`);
  await page.click('#go');
  await page.waitForFunction(() => document.querySelector('#send-err').textContent.length > 0);
  assert.match(await page.textContent('#send-err'), /last hour/);
  await context.close();
});

test('landing: a real example run fills the card when one is published', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/functions/v1/site-events', (route) => route.fulfill({ status: 204, headers: CORS }));
  await page.route('https://media.licdn.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: AVATAR }));
  await page.route(/\/score\/$/, async (route) => {
    const html = await readFile(join(ROOT, 'score/index.html'), 'utf8');
    const example = { name: 'Maya Okafor', headline: 'Founder at Fernhill Studio', photo: 'https://media.licdn.com/x.jpg', overall: 47, tier: 'side', pillars: { profile: 58, posts: 52, pipeline: 31 } };
    route.fulfill({ status: 200, contentType: 'text/html', body: html.replace(/<script type="application\/json" id="example-run">[\s\S]*?<\/script>/, `<script type="application/json" id="example-run">${JSON.stringify(example)}</script>`) });
  });
  await page.goto(base + '/score/');
  await page.waitForFunction(() => document.querySelector('#preview .rn span')?.textContent === '47');
  assert.match(await page.textContent('#preview'), /Maya Okafor.*Side channel/s);
  assert.equal(await page.locator('#preview li em').allTextContents().then((t) => t.join(',')), '58,52,31');
  assert.deepEqual(errors, []);
  await context.close();
});

test('reveal: progress lines stream in while the run is reading', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.running);
  await page.waitForFunction(() => document.querySelectorAll('#log li.on:not(.wait)').length === 4);
  assert.equal(await page.isVisible('#reveal'), true);
  assert.match(await page.textContent('#log'), /Found Maya Okafor: 3,412 followers/);
  assert.match(await page.textContent('#log li.wait'), /Reading/);
  assert.equal(await page.isVisible('#result'), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tier1: rings, tier, three pillars with evidence, Tier 2 still reading', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.tier1);
  await page.waitForSelector('#result:not([hidden]) #p-pipeline');
  for (const p of ['profile', 'posts', 'pipeline']) assert.equal(await page.locator(`#p-${p}`).count(), 1);
  assert.equal((await page.textContent('#hero h1')).trim(), 'Side channel.');
  await page.waitForFunction(() => document.querySelector('#hero .rn span').textContent === '49');
  assert.match(await page.textContent('#hero .gap'), /Biggest gap so far/);
  assert.match(await page.textContent('#p-posts'), /1\.1 posts a week/);
  assert.match(await page.textContent('#p-profile'), /captured 29 Oct 2026/i);
  assert.match(await page.textContent('#p-profile'), /We couldn't read: items in featured/);
  assert.match(await page.textContent('#engagers'), /Still reading/);
  assert.match(await page.textContent('#p-posts'), /Writing what this means for you/);
  const href = await page.getAttribute('#book .btn', 'href');
  assert.match(href, /^https:\/\/calendly\.com\/im-ivanmanfredi\/30min\?utm_source=score&utm_content=tierOneTierOne/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('complete: narrative, Tier 2 sections as attributed quotes, plan, PDF and share', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.complete);
  await page.waitForSelector('#result:not([hidden]) #competitors .person');
  assert.match(await page.textContent('#hero .gap'), /^Only 1 of 9 original posts ask the reader to act/);
  assert.match(await page.textContent('#hero .moved'), /from 49 to 47/);
  assert.match(await page.textContent('#engagers'), /19 of 214 people look like buyers/);
  assert.equal(await page.locator('#engagers .person').count(), 3);
  assert.equal(await page.textContent('#engagers .person q >> nth=0'), 'Head of Growth at Lumen Skin | DTC skincare');
  assert.equal(await page.locator('#competitors .dmn').count(), 2);
  assert.match(await page.textContent('#competitors .more'), /We found 11 in total/);
  assert.equal(await page.locator('#peers tbody tr').count(), 4);
  assert.match(await page.textContent('#peers tr.you'), /1\.1\s*64%\s*23/);
  assert.equal(await page.locator('#plan li').count(), 3);
  assert.match(await page.textContent('#stood'), /23 reactions/);
  assert.ok(await page.locator('#hero a', { hasText: 'Download the PDF' }).count());
  const share = await page.getAttribute('#hero a:has-text("Share on LinkedIn")', 'href');
  assert.equal(share, 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://inboundonsteroids.com/score/r/?t=' + TOKENS.complete));
  assert.equal(await page.locator('.still').count(), 0);
  assert.equal(await page.locator('.cap-card.hot').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('complete without narrative or Tier 2: scores and evidence only, a pillar we could not score', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.bare);
  await page.waitForSelector('#result:not([hidden]) #p-pipeline');
  for (const id of ['engagers', 'competitors', 'peers', 'plan', 'stood']) assert.equal(await page.isHidden('#' + id), true, id + ' hidden');
  assert.match(await page.textContent('#p-pipeline'), /could read too little here/);
  assert.equal(await page.textContent('#p-pipeline .rn span'), '?');
  assert.match(await page.textContent('#p-posts'), /What we measured for this part/);
  assert.equal(await page.locator('.writing').count(), 0);
  assert.equal(await page.locator('#hero .subj .av').evaluate((e) => e.tagName), 'SPAN');
  const u = await open('/score/r/?t=' + TOKENS.unscored);
  await u.page.waitForSelector('#result:not([hidden]) #hero h1');
  assert.equal((await u.page.textContent('#hero h1')).trim(), 'Not enough to score yet.');
  assert.deepEqual([...errors, ...u.errors], []);
  await u.context.close();
  await context.close();
});

test('failed and unknown tokens: plain message, never a stuck spinner', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.failed);
  await page.waitForSelector('#state:not([hidden])');
  assert.match(await page.textContent('#state h1'), /couldn't read that profile/);
  assert.match(await page.textContent('#state'), /It may be private/);
  assert.match(await page.getAttribute('#state a:has-text("Book a call anyway")', 'href'), /calendly\.com\/im-ivanmanfredi\/30min/);
  assert.equal(await page.isHidden('#reveal'), true);
  const g = await open('/score/r/?t=nope');
  await g.page.waitForSelector('#state:not([hidden])');
  assert.match(await g.page.textContent('#state h1'), /can't find this result/);
  const n = await open('/score/r/?t=' + 'a'.repeat(30));
  await n.page.waitForSelector('#state:not([hidden])');
  // an unknown token is a real 404 from score-status, which Chrome logs as a failed load; nothing else may log
  const expected404 = (e) => /status of 404/.test(e);
  assert.deepEqual([...errors, ...g.errors, ...n.errors.filter((e) => !expected404(e))], []);
  await Promise.all([g.context.close(), n.context.close(), context.close()]);
});

test('a failure after the profile was read is not blamed on a private profile', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.failedLate);
  await page.waitForSelector('#state:not([hidden])');
  assert.equal((await page.textContent('#state h1')).trim(), "We couldn't finish this one.");
  assert.match(await page.textContent('#state'), /Book a call and I'll go through it with you\./);
  assert.doesNotMatch(await page.textContent('#state'), /private/);
  assert.match(await page.getAttribute('#state a.btn', 'href'), /calendly\.com\/im-ivanmanfredi\/30min\?utm_source=score&utm_content=failedLate/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('failed with a report: the report is shown with a quiet note, never the failure screen', async () => {
  const { page, errors, context, calls } = await open('/score/r/?t=' + TOKENS.failedReport);
  await page.waitForSelector('#result:not([hidden]) #p-pipeline');
  assert.equal(await page.isHidden('#state'), true);
  await page.waitForFunction(() => document.querySelector('#hero .rn span').textContent === '49');
  assert.match(await page.textContent('#hero .partial'), /deeper read did not finish/);
  assert.equal(await page.locator('.still').count(), 0, 'no "still reading" on a run that stopped');
  assert.equal(await page.locator('.writing').count(), 0);
  assert.equal(await page.locator('#log li.wait').count(), 0);
  await page.waitForTimeout(2500);
  assert.equal(calls.status, 1, 'polling stops on failed');
  assert.deepEqual(errors, []);
  await context.close();
});

test('evidence is dated by when the profile was read (cached subject), not when the run was made', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.cached);
  await page.waitForSelector('#result:not([hidden]) #p-profile');
  const text = await page.textContent('#p-profile');
  assert.match(text, /captured 25 Oct 2026/i);
  assert.doesNotMatch(text, /captured 29 Oct 2026/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test('pre-launch: /score/ and /score/r/ are noindex, no canonical, not in the sitemap', async () => {
  const land = await readFile(join(ROOT, 'score/index.html'), 'utf8');
  const result = await readFile(join(ROOT, 'score/r/index.html'), 'utf8');
  const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
  assert.match(land, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(land, /rel="canonical"/);
  assert.doesNotMatch(land, /content="index,follow"/);
  assert.match(result, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(sitemap, /\/score\//);
});

test('hostile text from a profile is shown as text, never run or turned into elements', async () => {
  const { page, errors, context } = await open('/score/r/?t=' + TOKENS.xss);
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; d.dismiss(); });
  await page.waitForSelector('#result:not([hidden]) #competitors .dmn');
  await revealAll(page);
  const found = await page.evaluate(() => ({
    pwned: window.__pwned === 1,
    imgX: document.querySelectorAll('img[src="x"]').length,
    injected: document.querySelectorAll('#injected').length,
    scripts: [...document.scripts].filter((x) => x.textContent.includes('__pwned')).length,
    jsLinks: document.querySelectorAll('a[href^="javascript:"], img[src^="javascript:"]').length,
  }));
  assert.deepEqual(found, { pwned: false, imgX: 0, injected: 0, scripts: 0, jsLinks: 0 });
  assert.match(await page.textContent('#hero .subj b'), /<img src=x onerror=/);
  assert.match(await page.textContent('#hero .gap'), /<script>window.__pwned=1<\/script>/);
  assert.equal(dialogs, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('polling stops once the run is complete', async () => {
  const { page, context, calls } = await open('/score/r/?t=' + TOKENS.complete);
  await page.waitForSelector('#result:not([hidden]) #p-pipeline');
  const after = calls.status;
  await page.waitForTimeout(5000);
  assert.equal(calls.status, after, 'no score-status request after complete');
  assert.equal(after, 1);
  await context.close();
});

test('score-status keeps failing: a plain retrying message, then the run once it answers', async () => {
  let healthy = false;
  const { page, context, calls } = await open('/score/r/?t=' + TOKENS.flaky, {
    status: (t) => (t === TOKENS.flaky ? (healthy ? { status: 200, body: JSON.stringify(FIXTURES[TOKENS.running]) } : { status: 503, body: '{"error":"storage"}' }) : null),
  });
  await page.waitForSelector('#state:not([hidden])', { timeout: 15000 });
  assert.match(await page.textContent('#state'), /Having trouble reaching your result\. Retrying\.\.\./);
  assert.ok(calls.status >= 3);
  assert.equal(await page.isHidden('#log'), true, 'no stray empty log track');
  healthy = true;
  await page.waitForSelector('#reveal:not([hidden]) #log li:not(.wait)', { timeout: 15000 });
  assert.equal(await page.isHidden('#state'), true);
  await context.close();
});

test('a section rebuilt by a later poll keeps its entries shown (no replayed fade)', async () => {
  let n = 0;
  const { page, context } = await open('/score/r/?t=' + TOKENS.tier1, {
    status: (t) => (t === TOKENS.tier1 ? { status: 200, body: JSON.stringify(++n < 3 ? FIXTURES[TOKENS.tier1] : FIXTURES[TOKENS.complete]) } : null),
  });
  await page.waitForSelector('#result:not([hidden]) #hero .gap.on');
  // record, at the moment the rebuilt hero is inserted, whether its entries already carry .on
  await page.evaluate(() => {
    window.__rebuilt = [];
    new MutationObserver(() => {
      const els = [...document.querySelectorAll('#hero .rv, #hero .gap, #hero .scale')];
      window.__rebuilt.push(els.filter((e) => !e.classList.contains('on')).length);
    }).observe(document.querySelector('#hero'), { childList: true });
  });
  await page.waitForFunction(() => /Only 1 of 9/.test(document.querySelector('#hero .gap')?.textContent || ''), null, { timeout: 15000 });
  const offAtInsert = await page.evaluate(() => window.__rebuilt);
  assert.ok(offAtInsert.length >= 1);
  assert.deepEqual(offAtInsert.filter((n) => n > 0), [], 'rebuilt entries start hidden and fade in again');
  await context.close();
});

test('print mode: ready at tier1, everything visible, no placeholders', async () => {
  const { page, errors, context } = await open(`/score/r/?t=${TOKENS.tier1}&print=1`, { width: 1280, height: 1000 });
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
  assert.equal(await page.locator('.still').count(), 0);
  assert.equal(await page.isHidden('#nav'), true);
  assert.equal(await page.textContent('#hero .rn span'), '49');
  const hiddenEntries = await page.evaluate(() => [...document.querySelectorAll('.rv')].filter((e) => getComputedStyle(e).opacity !== '1').length);
  assert.equal(hiddenEntries, 0);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  assert.ok(pdf.length > 20000);
  const c = await open(`/score/r/?t=${TOKENS.complete}&print=1`, { width: 1280, height: 1000 });
  await c.page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
  if (SHOTS) await c.page.pdf({ path: join(SHOTS, 'result-complete.pdf'), format: 'A4', printBackground: true });
  assert.deepEqual([...errors, ...c.errors], []);
  await Promise.all([c.context.close(), context.close()]);
});

test('no share-image mode: ?og=1 is the ordinary result page', async () => {
  const { page, errors, context } = await open(`/score/r/?t=${TOKENS.complete}&og=1`, { width: 1200, height: 627 });
  await page.waitForSelector('#result:not([hidden]) #p-pipeline');
  assert.equal(await page.locator('#og-card').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('og')), false);
  assert.equal(await page.isVisible('main'), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test('reduced motion: final numbers without animation', async () => {
  const { page, context } = await open('/score/r/?t=' + TOKENS.complete, { reducedMotion: 'reduce' });
  await page.waitForSelector('#result:not([hidden]) #hero .ring');
  assert.equal(await page.textContent('#hero .rn span'), '47');
  assert.equal(await page.evaluate(() => document.documentElement.className), 'rm');
  await context.close();
});

for (const width of WIDTHS) {
  test(`layout at ${width}px: no horizontal overflow, no console errors`, async () => {
    for (const [name, path] of [['landing', '/score/'], ['result-tier1', '/score/r/?t=' + TOKENS.tier1], ['result-complete', '/score/r/?t=' + TOKENS.complete],
      ['result-running', '/score/r/?t=' + TOKENS.running], ['result-failed', '/score/r/?t=' + TOKENS.failed]]) {
      const { page, errors, context } = await open(path, { width, height: width < 500 ? 844 : 900 });
      await settle(page);
      if (name === 'landing') {
        if (SHOTS && width !== 768) await page.screenshot({ path: join(SHOTS, `landing-fold-${width}.png`) });
        await page.fill('#li', 'linkedin.com/in/maya-okafor');
        await page.click('#step1 button[type=submit]');
        await settle(page, 700);
        if (SHOTS && width !== 768) await page.screenshot({ path: join(SHOTS, `landing-step2-${width}.png`) });
      }
      await revealAll(page);
      assert.equal(await noOverflow(page), true, `${name} overflows at ${width}`);
      if (SHOTS && width !== 768 && name !== 'result-failed') {
        await page.screenshot({ path: join(SHOTS, `${name}-${width}.png`), fullPage: name !== 'landing' });
        if (name === 'landing') await page.screenshot({ path: join(SHOTS, `landing-full-${width}.png`), fullPage: true });
      }
      assert.deepEqual(errors, [], `${name} console errors at ${width}`);
      await context.close();
    }
  });
}
