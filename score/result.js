/* Revenue Line Score result page (/score/r/?t=<token>).
   Polls score-status every 2 s (10 s after 3 min), streams progress lines as the live reveal, renders the report at
   status tier1 and keeps filling it in (narrative, Tier 2) until complete. ?print=1 and ?og=1 are the renderer modes:
   everything visible without interaction, data-ready="1" on <html> once the report (or #og-card) has rendered. */
(() => {
  const R = window.RLS;
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = R.esc;
  const q = new URLSearchParams(location.search);
  const token = q.get('t') || '';
  const PRINT = q.get('print') === '1', OG = q.get('og') === '1';
  const QUOTED = new Set(['buyers_named', 'peer_benchmark']);
  const OWN = new Set(['buyer_share', 'competitor_buyers']);
  const TOKEN_RX = /^[A-Za-z0-9_-]{22,40}$/;
  const start = Date.now();

  let local = {};
  try { local = JSON.parse(sessionStorage.getItem('rls:' + token)) || {}; } catch (_) { local = {}; }

  const cache = {};
  const rings = {};
  let shownResult = false, done = false, failures = 0, last = null;

  /* ---------- small helpers ---------- */
  const plain = (x) => (R.num(x) ? (Math.round(x * 10) / 10).toString() : '');
  const pct = (x) => (R.num(x) ? Math.floor(x * 100 + 0.5) + '%' : '');
  const day = (iso, year = true) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', year ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const firstNum = (s) => { const m = /^\s*([\d.,]+)/.exec(String(s || '')); return m ? m[1].replace(/,$/, '') : ''; };
  const bookHref = () => {
    const u = new URL(R.BOOK);
    u.searchParams.set('utm_source', 'score');
    if (TOKEN_RX.test(token)) u.searchParams.set('utm_content', token);
    if (local.email) u.searchParams.set('email', local.email);
    return u.href;
  };
  const resultUrl = () => 'https://inboundonsteroids.com/score/r/?t=' + encodeURIComponent(token);

  function put(id, markup) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !markup;
    if (cache[id] === markup) return;
    cache[id] = markup;
    el.innerHTML = markup || '';
    el.querySelectorAll('[data-ring][data-key]').forEach((ring) => {
      const key = ring.dataset.key, v = parseFloat(ring.dataset.ring);
      if (key in rings) {
        if (rings[key] === v || !R.num(v)) { ring.dataset.done = '1'; R.animateRing(ring, v); }
        else ring.dataset.from = R.num(rings[key]) ? rings[key] : 0;
      }
      rings[key] = R.num(v) ? v : null;
    });
    R.observe(el);
  }
  const ring = (key, value, cls = '', sub = '') => R.ringHTML(value, cls, sub).replace('<div class="ring', `<div data-key="${key}" class="ring`);

  /* ---------- states ---------- */
  function state(kind) {
    done = true;
    $('#reveal').hidden = true; $('#result').hidden = true;
    const book = `<a class="btn big" href="${esc(bookHref())}">Book a call anyway <i>↗</i></a>`;
    const markup = kind === 'failed'
      ? `<div class="wrap"><h1 class="disp rv">We couldn't read that profile.</h1>
         <p class="body rv" style="--d:.1s">It may be private, or the link may point somewhere else. Check the link and try again, or talk it through with me on a call.</p>
         <div class="ctas rv" style="--d:.16s">${book}<a class="link" href="/score/">Try another link</a></div></div>`
      : `<div class="wrap"><h1 class="disp rv">We can't find this result.</h1>
         <p class="body rv" style="--d:.1s">The link may be cut short. Check that you copied all of it, or start a new score.</p>
         <div class="ctas rv" style="--d:.16s"><a class="btn big" href="/score/">Start a new score <i>→</i></a></div></div>`;
    put('state', markup);
  }

  /* ---------- the live log ---------- */
  const log = $('#log');
  const seen = new Set();
  function clockText(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function drawLog(data) {
    const t0 = Date.parse(data.created_at) || start;
    const lines = Array.isArray(data.progress) ? data.progress.filter((p) => p && p.text) : [];
    let added = 0;
    lines.forEach((p) => {
      const id = (p.key || '') + '|' + (p.at || '') + '|' + p.text;
      if (seen.has(id)) return;
      seen.add(id);
      const li = document.createElement('li');
      const at = Date.parse(p.at);
      li.innerHTML = `<time>${R.num(at) ? clockText(at - t0) : ''}</time>${esc(p.text)}`;
      log.insertBefore(li, $('li.wait', log));
      const delay = added++ * 160;
      if (R.still()) li.classList.add('on');
      else setTimeout(() => li.classList.add('on'), delay);
    });
    log.querySelectorAll('li').forEach((li) => li.classList.remove('last'));
    const items = log.querySelectorAll('li:not(.wait)');
    if (items.length && !['complete', 'failed'].includes(data.status)) items[items.length - 1].classList.add('last');
    // the waiting line at the end, while something is still being read
    let wait = $('li.wait', log);
    const busy = ['queued', 'running', 'tier1'].includes(data.status) && !PRINT;
    if (busy) {
      const text = data.status === 'queued' ? (lines.length ? 'Back in line, picking up shortly' : 'In line to start')
        : data.status === 'tier1' ? 'Still reading who engages with you, your competitors and your niche'
        : 'Reading';
      if (!wait) { wait = document.createElement('li'); wait.className = 'wait on'; log.appendChild(wait); }
      const markup = `${esc(text)}<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
      if (wait.dataset.t !== text) { wait.dataset.t = text; wait.innerHTML = markup; }
    } else if (wait) wait.remove();
    log.style.setProperty('--p', Math.min(1, items.length / 9).toFixed(3));
  }

  /* ---------- report pieces ---------- */
  function factCard(f, date, hot) {
    if (!f) return '';
    if (!f.readable) {
      return `<figure class="cap-card sheet unread"><header><b>${esc(f.label)}</b></header><div class="v">We couldn't read this</div>` +
        `<figcaption>It is left out of your score.</figcaption></figure>`;
    }
    return `<figure class="cap-card sheet${hot ? ' hot' : ''}"><header><b>${esc(f.label)}</b><time>${esc(date ? 'captured ' + date : '')}</time></header>` +
      `<div class="v"><span>${esc(f.display)}</span></div>${f.scope ? `<figcaption>From ${esc(f.scope)}</figcaption>` : ''}</figure>`;
  }
  function quoteCard(a, subject, date) {
    if (!a.quote) return '';
    const slug = (() => { try { return new URL(subject.linkedin_url).pathname.replace(/\/$/, ''); } catch (_) { return ''; } })();
    const photo = R.safeUrl(subject.photo_url);
    const who = a.area === 'headline'
      ? `<div class="who">${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : '<span class="ph"></span>'}<h4>${esc(subject.name || '')}</h4></div>`
      : `<h4>${esc(a.label)}</h4>`;
    return `<figure class="li-cap sheet"><div class="chrome"><i></i><i></i><i></i><span>linkedin.com${esc(slug)}</span><time>${esc(date ? 'captured ' + date : '')}</time></div>` +
      `<div class="body">${who}<blockquote class="${a.area === 'about' ? 'clip' : ''}">${esc(a.quote)}</blockquote></div></figure>`;
  }
  const fixLine = (fix) => (fix ? `<p class="fix"><i aria-hidden="true">→</i><span><b>${esc(fix)}</b></span></p>` : '');

  function weakest(scores, by) {
    let best = null;
    Object.values((scores && scores.pillars) || {}).forEach((p) => {
      Object.entries((p && p.normalised) || {}).forEach(([id, v]) => {
        if (!R.num(v) || v >= 0.9 || !by[id] || !by[id].readable || QUOTED.has(id)) return;
        if (!best || v < best.v) best = { id, v };
      });
    });
    return best && best.id;
  }

  function heroMarkup(data, ctx) {
    const { report, scores, by, narrative, subject } = ctx;
    const overall = R.num(scores.overall) ? scores.overall : null;
    const tier = R.TIERS[scores.tier] || '';
    const photo = R.safeUrl(subject.photo_url);
    const av = photo ? `<img class="av" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="av" aria-hidden="true">${esc(R.initials(subject.name))}</span>`;
    let gap = '';
    if (overall == null) gap = 'We could not read enough of this profile to score it fairly. Everything we could read is below.';
    else if (narrative && narrative.headline) gap = narrative.headline;
    else if (ctx.weak) {
      const w = by[ctx.weak];
      // a count reads with its label ("posting rate: 1.1 posts a week"); a sentence reads on its own
      gap = 'Biggest gap so far: ' + (/^\d/.test(w.display) ? `${w.label.toLowerCase()}, ${w.display}.` : w.display.replace(/^./, (c) => c.toLowerCase()) + '.');
    }
    const before = scores.tier1_overall;
    const moved = R.num(before) && overall != null && before !== overall
      ? `<p class="moved rv">After reading who engages with you, the score went from ${before} to ${overall}.</p>` : '';
    const x = overall == null ? null : Math.max(0.5, Math.min(99.5, overall));
    const here = scores.tier;
    const segs = [['hobby', 0, R.FLOORS.side], ['side', R.FLOORS.side, R.FLOORS.revenue], ['revenue', R.FLOORS.revenue, 100]];
    const cols = segs.map(([, a, b]) => `${b - a}fr`);
    const scale = `<div class="scale" style="--c1:${cols[0]};--c2:${cols[1]};--c3:${cols[2]};${x != null ? `--x:${x}%` : ''}">` +
      `<div class="segs">${segs.map(([k]) => `<div class="seg${k === here ? ' here' : ''}"></div>`).join('')}</div>` +
      (x != null ? '<i class="pin" aria-hidden="true"></i>' : '') +
      `<div class="names">${segs.map(([k, a, b]) => `<span class="${k === here ? 'here' : ''}">${R.TIERS[k]}<em>${a}${k === 'revenue' ? '+' : ' to ' + (b - 1)}</em></span>`).join('')}</div></div>`;
    const pdf = R.safeUrl(data.pdf_url);
    const actions = `<div class="r-actions no-print rv" style="--d:.2s"><a class="btn" href="${esc(bookHref())}">Talk it through with Ivan <i>↗</i></a>` +
      (pdf ? `<a class="link" href="${esc(pdf)}" target="_blank" rel="noopener">Download the PDF</a>` : '') +
      `<a class="link" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resultUrl())}" target="_blank" rel="noopener">Share on LinkedIn</a></div>`;
    return `<div class="wrap">` +
      `<div class="subj rv">${av}<div><b>${esc(subject.name || 'This profile')}</b>${subject.headline ? `<span>${esc(subject.headline)}</span>` : ''}</div></div>` +
      `<div class="grid">${ring('overall', overall, '', 'out of 100')}<div>` +
      `<h1 class="disp rv" style="--d:.08s">${overall == null ? 'Not enough to score yet.' : esc(tier) + '.'}</h1>` +
      (gap ? `<p class="gap rv" style="--d:.16s">${esc(gap)}</p>` : '') + moved + `</div></div>` +
      (overall != null ? scale : '') + actions + `</div>`;
  }

  function pillarMarkup(p, ctx, pending) {
    const { scores, by, narrative, report, subject, date, hot } = ctx;
    const ps = (scores.pillars || {})[p.id] || {};
    const score = R.num(ps.score) ? ps.score : null;
    const unread = (ps.missing || []).map((id) => by[id]).filter((f) => f && !f.readable).map((f) => f.label.toLowerCase());
    const miss = score == null
      ? '<p class="miss">We could read too little here to score this part.</p>'
      : unread.length ? `<p class="miss">We couldn't read: ${esc(unread.join(', '))}. ${unread.length === 1 ? 'It is' : 'They are'} left out of this score.</p>` : '';
    const head = `<div class="head"><div><h2 class="disp rv">${p.name}</h2><p class="rv" style="--d:.06s">${esc(p.q)}</p>${miss}</div>${ring('p-' + p.id, score, 'rv', score == null ? '' : 'of 100')}</div>`;
    let body = '';
    const items = narrative && narrative.pillars && Array.isArray(narrative.pillars[p.id]) ? narrative.pillars[p.id] : [];
    const used = new Set();
    items.forEach((it) => {
      const ids = (it.fact_ids || []).filter((id) => by[id] && !QUOTED.has(id) && !used.has(id)).slice(0, 2);
      ids.forEach((id) => used.add(id));
      const cards = ids.map((id) => factCard(by[id], date, hot.has(id))).join('');
      body += `<div class="finding"><div class="txt rv"><p>${esc(it.text)}</p>${fixLine(it.fix)}</div><div class="evid${ids.length > 1 ? ' two' : ''} rv" style="--d:.08s">${cards}</div></div>`;
    });
    if (p.id === 'profile') {
      (report.audit || []).forEach((a) => {
        if (!a || !a.fix) return;
        const card = quoteCard(a, subject, date);
        body += card ? `<div class="finding"><div class="txt rv"><p>${esc(a.today || a.label)}</p>${fixLine(a.fix)}</div><div class="evid rv" style="--d:.08s">${card}</div></div>`
          : `<div class="finding solo"><div class="txt rv"><p>${esc(a.today || a.label)}</p>${fixLine(a.fix)}</div></div>`;
      });
    }
    if (!items.length) {
      if (pending) body = `<p class="writing pending">Writing what this means for you, with one fix for each finding<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></p>` + body;
      const facts = (report.facts || []).filter((f) => f.pillar === p.id && !QUOTED.has(f.id) && !OWN.has(f.id) && !used.has(f.id));
      if (facts.length) body += `<div class="measured"><p class="rv">What we measured for this part.</p><div class="evid three rv" style="--d:.08s">${facts.map((f) => factCard(f, date, hot.has(f.id))).join('')}</div></div>`;
    }
    return `<section class="pillar" id="p-${p.id}"><div class="wrap">${head}${body}</div></section>`;
  }

  const stillReading = (title) => (PRINT ? '' : `<div class="wrap"><h2 class="disp rv">${title}</h2><p class="still">Still reading<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> This part fills in here on its own in a few minutes.</p></div>`);
  const personLink = (name, url) => {
    const u = R.safeUrl(url);
    return u ? `<a class="nm" href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(name)}</a>` : `<b class="nm">${esc(name)}</b>`;
  };

  function engagersMarkup(ctx, running) {
    const f = ctx.by.buyer_share;
    const title = 'Who engages with you.';
    if (!f || !f.readable) return running ? stillReading(title) : '';
    const m = /\((\d+)%\)\s*$/.exec(f.display || '');
    const share = m ? +m[1] : null;
    const count = /^(\d+)\s+of/.exec(f.display || '');
    const lede = f.display.replace(/\s*\(\d+%\)\s*$/, '') + (count && count[1] === '1' ? ' looks like a buyer.' : ' look like buyers.');
    const named = Array.isArray(ctx.research.buyers_named) ? ctx.research.buyers_named : [];
    const people = named.slice(0, 3).map((p, i) => `<div class="person sheet rv sheetin" style="--d:${i * 0.06}s">${personLink(p.name, p.url)}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}</div>`).join('');
    return `<div class="wrap"><div class="top"><div><h2 class="disp rv">${title}</h2><p class="lede rv" style="--d:.06s">${esc(lede)}</p><p class="scope rv">From ${esc(f.scope)}.</p></div>` +
      `<div class="rv">${share != null ? `<div class="big-n">${share}%</div><div class="share-bar" role="img" aria-label="${share}% look like buyers"><i style="--w:${share / 100}"></i></div>` : ''}</div></div>` +
      (people ? `<div class="people">${people}</div>` : '') + `</div>`;
  }

  function competitorsMarkup(ctx, running) {
    const f = ctx.by.competitor_buyers, sec = ctx.research.competitor_engagers;
    const title = "Buyers reading your competitors.";
    if (!f || !f.readable) return running ? stillReading(title) : '';
    const people = (sec && Array.isArray(sec.people) ? sec.people : []).slice(0, 3).map((p, i) => {
      const how = p.engaged === 'commented' ? 'Commented on' : 'Reacted to';
      const when = p.posted_at ? ` from ${day(p.posted_at, false)}` : '';
      return `<div class="person sheet rv sheetin" style="--d:${i * 0.06}s">${personLink(p.name, p.profile_url)}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}` +
        (p.reason ? `<p class="why"><b>Why they fit:</b> ${esc(p.reason)}</p>` : '') +
        (p.competitor ? `<p class="src">${how} a post by ${esc(p.competitor)}${when}${p.post_excerpt ? `: <q>${esc(p.post_excerpt)}</q>` : ''}</p>` : '') + `</div>`;
    }).join('');
    const notes = (sec && Array.isArray(sec.notes) ? sec.notes : []).slice(0, 2).map((n) => `<figure class="dmn sheet rv sheetin"><div class="bar2"><span class="in">in</span><b>To ${esc(n.to)}</b></div><div class="msgw"><p class="msg">${esc(n.note)}</p></div><p class="sm">A first note you could send, written as you. Edit it before you send it.</p></figure>`).join('');
    const total = sec && R.num(sec.count) ? sec.count : null;
    const shown = sec && Array.isArray(sec.people) ? Math.min(3, sec.people.length) : 0;
    const more = total != null && total > shown
      ? `<p class="more rv">We found ${total} in total. I'll go through the full list with you on a call. <a class="link no-print" href="${esc(bookHref())}">Book it ↗</a></p>` : '';
    const n = firstNum(f.display);
    return `<div class="wrap"><div class="top"><div><h2 class="disp rv">${title}</h2><p class="lede rv" style="--d:.06s">${esc(f.display)}.</p><p class="scope rv">From ${esc(f.scope)}.</p></div>` +
      `<div class="rv">${n ? `<div class="big-n">${esc(n)}</div><p class="big-l">${n === '1' ? 'buyer' : 'buyers'} you could reach this week</p>` : ''}</div></div>` +
      (people ? `<div class="people">${people}</div>` : '') + (notes ? `<div class="notes">${notes}</div>` : '') + more + `</div>`;
  }

  function peersMarkup(ctx, running) {
    const f = ctx.by.peer_benchmark, rows = Array.isArray(ctx.research.peers) ? ctx.research.peers : [];
    const title = 'You next to your niche.';
    if (!f || !rows.length) return running ? stillReading(title) : '';
    const you = (id, fmt) => { const x = ctx.by[id]; return x && x.readable ? fmt(firstNum(x.display)) : 'n/a'; };
    const youRow = `<tr class="you"><td><b>You</b></td><td class="n">${esc(you('posts_per_week_90d', (n) => n))}</td><td class="n">${esc(you('original_share_90d', (n) => n + '%'))}</td><td class="n">${esc(you('median_engagement_original', (n) => n))}</td></tr>`;
    const peerRows = rows.slice(0, 3).map((p) => `<tr><td>${personLink(p.name, p.url).replace('class="nm"', '')}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}</td>` +
      `<td class="n">${esc(plain(p.posts_per_week_90d))}</td><td class="n">${esc(pct(p.original_share_90d || 0))}</td><td class="n">${esc(plain(p.median_engagement_original))}</td></tr>`).join('');
    return `<div class="wrap"><div class="top one"><div><h2 class="disp rv">${title}</h2><p class="scope rv">From ${esc(f.scope)}.</p></div></div>` +
      `<div class="peers sheet rv sheetin"><div class="scroll"><table><thead><tr><th>Person</th><th>Posts a week</th><th>Original</th><th>Engagement per original post <span>(median reactions, comments and reposts)</span></th></tr></thead>` +
      `<tbody>${youRow}${peerRows}</tbody></table></div></div></div>`;
  }

  function planMarkup(ctx) {
    const steps = ctx.narrative && Array.isArray(ctx.narrative.plan_90d) ? ctx.narrative.plan_90d.filter(Boolean) : [];
    if (!steps.length) return '';
    return `<div class="wrap"><h2 class="disp rv">Your next 90 days.</h2><ol class="plan90">${steps.map((s, i) => `<li><span>${i + 1} of ${steps.length}</span>${esc(s)}</li>`).join('')}</ol></div>`;
  }

  function bookMarkup(data, ctx) {
    let low = null;
    R.PILLARS.forEach((p) => { const s = ((ctx.scores.pillars || {})[p.id] || {}).score; if (R.num(s) && (!low || s < low.s)) low = { s, name: p.name.toLowerCase() }; });
    const pdf = R.safeUrl(data.pdf_url);
    const start = low ? `, starting with your ${low.name}` : '';
    return `<div class="wrap grid"><div><h2 class="disp rv">Let's go through it together.</h2>` +
      `<p class="body rv" style="--d:.06s">Book a call and we'll walk through this report${start}. If it makes sense, I'll show you how we would run it for you.</p>` +
      `<div class="ctas rv" style="--d:.12s"><a class="btn big" href="${esc(bookHref())}" data-print="calendly.com/im-ivanmanfredi/30min">Book a call with Ivan <i>↗</i></a>` +
      (pdf ? `<a class="link no-print" href="${esc(pdf)}" target="_blank" rel="noopener">Download the PDF</a>` : '') + `</div></div>` +
      `<figure class="sheet rv sheetin"><img src="/ivan-portrait-400.webp" alt="Ivan Manfredi" width="400" height="536"><figcaption><b>Ivan Manfredi</b><span>I make LinkedIn a revenue line for agency founders.</span></figcaption></figure></div>`;
  }

  function ogMarkup(ctx) {
    const { scores, subject } = ctx;
    const overall = R.num(scores.overall) ? scores.overall : null;
    const photo = R.safeUrl(subject.photo_url);
    return ring('og', overall) + `<div><div class="who">${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${esc(R.initials(subject.name))}</span>`}<b>${esc(subject.name || '')}</b></div>` +
      `<div class="t">${overall == null ? 'Not scored yet.' : esc(R.TIERS[scores.tier] || '') + '.'}</div>` +
      `<p class="q">What's your <span>Revenue Line Score</span>?</p><p class="site">inboundonsteroids.com/score</p></div>`;
  }

  /* ---------- one render pass ---------- */
  function render(data) {
    last = data;
    const status = data.status;
    if (status === 'failed') { if (!OG && !PRINT) state('failed'); else done = true; return; }
    const report = data.report && typeof data.report === 'object' ? data.report : null;
    const scores = (report && report.scores) || data.scores;
    const hasReport = ['tier1', 'complete'].includes(status) && report && scores && scores.pillars;

    if (!hasReport) {
      if (OG || PRINT) return;
      $('#reveal').hidden = false;
      if (log.parentElement.id !== 'log-live') $('#log-live').appendChild(log);
      R.observe($('#reveal'));
      drawLog(data);
      const qEl = $('#queue');
      const waited = Date.now() - (Date.parse(data.created_at) || start);
      if (status === 'queued' && (local.over_cap || waited > 45000)) {
        qEl.hidden = false;
        qEl.textContent = local.over_cap
          ? "It's a busy day, so your score is in line and starts as soon as a slot opens. Keep this link: your result appears here, and we'll email it to you too."
          : 'Your score is in line and starts in a moment. Keep this link: your result appears here when it is ready.';
      } else qEl.hidden = true;
      return;
    }

    const by = {};
    (report.facts || []).forEach((f) => { if (f && f.id) by[f.id] = f; });
    const narrative = report.narrative && typeof report.narrative === 'object' ? report.narrative : null;
    const subject = report.subject && typeof report.subject === 'object' ? report.subject : {};
    const research = report.research && typeof report.research === 'object' ? report.research : {};
    const narrated = (data.progress || []).some((p) => p && p.key === 'narrative');
    const ctx = { report, scores, by, narrative, subject, research, date: day(data.created_at) };
    ctx.weak = weakest(scores, by);
    ctx.hot = new Set(narrative && Array.isArray(narrative.headline_fact_ids) && narrative.headline ? narrative.headline_fact_ids : (ctx.weak ? [ctx.weak] : []));
    if (subject.name) document.title = `${subject.name}: Revenue Line Score`;

    if (OG) { put('og-card', ogMarkup(ctx)); $('#og-card').hidden = false; markReady($('#og-card')); return; }

    if (!shownResult) {
      shownResult = true;
      const reveal = $('#reveal');
      const show = () => {
        reveal.hidden = true; reveal.classList.remove('out');
        $('#result').hidden = false;
        $('#log-home .wrap').appendChild(log);
        if (!PRINT) scrollTo({ top: 0 });
      };
      if (!reveal.hidden && !R.still()) { reveal.classList.add('out'); setTimeout(show, 300); } else show();
    }
    const running = status !== 'complete';
    put('hero', heroMarkup(data, ctx));
    put('stood', narrative && narrative.about_them && narrative.about_them.text ? `<div class="wrap"><p class="flow rv">${esc(narrative.about_them.text)}</p></div>` : '');
    put('pillars', R.PILLARS.map((p) => pillarMarkup(p, ctx, running && !narrative && !narrated)).join(''));
    put('engagers', engagersMarkup(ctx, running));
    put('competitors', competitorsMarkup(ctx, running));
    put('peers', peersMarkup(ctx, running));
    put('plan', planMarkup(ctx));
    put('book', bookMarkup(data, ctx));
    drawLog(data);
    $('#nav-book').href = bookHref();
    if (PRINT) markReady($('#result'));
  }

  /* ---------- renderer handshake: fonts + images settled, then data-ready ---------- */
  let readying = false;
  async function markReady(root) {
    if (readying) return;
    readying = true;
    done = true;
    try { await document.fonts.ready; } catch (_) { /* fine */ }
    const imgs = [...root.querySelectorAll('img')].filter((i) => !i.complete);
    await Promise.race([
      Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', () => { i.remove(); r(); }, { once: true }); }))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    requestAnimationFrame(() => requestAnimationFrame(() => { html.dataset.ready = '1'; }));
  }

  /* ---------- polling ---------- */
  async function poll() {
    let res = null;
    try { res = await fetch(R.STATUS + '?t=' + encodeURIComponent(token), { cache: 'no-store' }); } catch (_) { res = null; }
    if (res && (res.status === 404 || res.status === 400)) { if (!OG && !PRINT) state('missing'); return; }
    if (res && res.ok) {
      failures = 0;
      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (data && typeof data === 'object') {
        try { render(data); } catch (e) { console.warn('score render', e); }
        if (['complete', 'failed'].includes(data.status)) done = true;
      }
    } else failures++;
    if (done) return;
    const wait = OG || PRINT ? 1000 : Date.now() - start > 180000 ? 10000 : 2000;
    setTimeout(poll, failures ? Math.min(wait * (failures + 1), 15000) : wait);
  }

  // elapsed clock in the reveal
  setInterval(() => {
    if (!last || $('#reveal').hidden) return;
    const ms = Date.now() - (Date.parse(last.created_at) || start);
    // an old link opened later: the clock would read hours, which says nothing useful
    $('#clock').hidden = ms > 30 * 60000;
    $('#clock').textContent = clockText(ms);
  }, 1000);

  if (!TOKEN_RX.test(token)) { if (!OG && !PRINT) state('missing'); }
  else poll();
})();
