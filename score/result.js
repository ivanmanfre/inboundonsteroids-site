/* Revenue Line Score result page (/score/r/?t=<token>).
   Polls score-status every 2 s (10 s after 3 min), streams progress lines as the live reveal, renders the report at
   status tier1 and keeps filling it in (narrative, Tier 2) until complete. A run that failed after Tier 1 still shows
   its report. ?print=1 is the PDF renderer mode: everything visible without interaction, data-ready="1" on <html> once
   the report has rendered.
   The person who submitted (sessionStorage rls:<token>) watches the read on a stage and can guess their score; a shared
   link sees the plain log. The simulator projects the score with the rubric mirrored in score.js (RLS.project). */
(() => {
  const R = window.RLS;
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = R.esc;
  const q = new URLSearchParams(location.search);
  const token = q.get('t') || '';
  const PRINT = q.get('print') === '1';
  const QUOTED = new Set(['buyers_named', 'peer_benchmark']);
  const OWN = new Set(['buyer_share', 'competitor_buyers']);
  // inputs a person cannot move by acting this month (other people's behaviour, slow outcomes): never a toggle
  const NOT_ACTIONABLE = new Set(['followers', 'competitor_buyers', 'buyer_share', 'median_engagement_original']);
  // profile_audit.AREAS -> the scored input that area's fix moves
  const AREA_INPUT = { headline: 'headline_clear', banner: 'banner_states_offer', about: 'about_opens_on_buyer', proof: 'proof_visible', featured: 'featured_count', booking: 'booking_path' };
  const FACT_AREA = { headline_clear: 'headline', banner_states_offer: 'banner', banner_set: 'banner', about_opens_on_buyer: 'about', featured_count: 'featured', booking_path: 'booking' };
  const AREA_ORDER = ['banner', 'headline', 'booking', 'about', 'featured'];
  const AREA_LABEL = { banner: 'Banner', headline: 'Headline', booking: 'How a buyer books', about: 'About', featured: 'Featured' };
  const TOKEN_RX = /^[A-Za-z0-9_-]{22,40}$/;
  const start = Date.now();

  let local = {}, mine = false;
  try { const raw = sessionStorage.getItem('rls:' + token); mine = raw != null; local = JSON.parse(raw) || {}; } catch (_) { local = {}; }
  const THEATRE = mine && !PRINT;
  const GUESS_KEY = 'rls:guess:' + token;
  const readGuess = () => { try { const g = sessionStorage.getItem(GUESS_KEY); return g != null && /^\d{1,3}$/.test(g) && +g <= 100 ? +g : null; } catch (_) { return null; } };

  const cache = {};
  const rings = {};
  let shownResult = false, done = false, failures = 0, last = null;
  const sim = { on: new Set(), rows: [], scores: null };

  /* ---------- small helpers ---------- */
  const plain = (x) => (R.num(x) ? (Math.round(x * 10) / 10).toString() : '');
  const pct = (x) => (R.num(x) ? Math.floor(x * 100 + 0.5) + '%' : '');
  const day = (iso, year = true) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', year ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const firstNum = (s) => { const m = /^\s*([\d.,]+)/.exec(String(s || '')); return m ? m[1].replace(/,$/, '') : ''; };
  const bookHref = () => {
    const u = new URL(R.BOOK);
    u.searchParams.set('utm_source', 'score');
    if (TOKEN_RX.test(token)) u.searchParams.set('utm_content', token);
    if (local.email) u.searchParams.set('email', local.email);
    return u.href;
  };
  const resultUrl = () => 'https://inboundonsteroids.com/score/r/?t=' + encodeURIComponent(token);
  const SEEN = '.rv, .bar, .share-bar, .scale, .gap, .dots-grid, .mix, .pbars';

  function put(id, markup) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !markup;
    if (cache[id] === markup) return;
    const rebuilt = !!cache[id];
    cache[id] = markup;
    el.innerHTML = markup || '';
    // a section the visitor has already seen is rebuilt in place (narrative landed, Tier 2 arrived): no replayed entries
    if (rebuilt) el.querySelectorAll(SEEN).forEach((x) => x.classList.add('on'));
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
  const ring = (key, value, cls = '', sub = '', proj = '') => R.ringHTML(value, cls, sub)
    .replace('<div class="ring', `<div data-key="${key}"${proj ? ` data-proj="${proj}"` : ''} class="ring`);

  /* ---------- reaching score-status keeps failing: say so, keep retrying ---------- */
  const TROUBLE = 'Having trouble reaching your result. Retrying...';
  function trouble(on) {
    let note = $('#trouble');
    if (on && !note) {
      note = document.createElement('p');
      note.id = 'trouble'; note.className = 'trouble no-print'; note.setAttribute('role', 'status');
      note.textContent = TROUBLE;
      document.body.appendChild(note);
    }
    if (note) note.hidden = !on || !last;
    // nothing on screen yet: the note is the page, never a blank room
    if (!last) put('state', on ? `<div class="wrap"><h1 class="disp rv">One moment.</h1><p class="body rv" style="--d:.1s">${esc(TROUBLE)}</p></div>` : '');
  }

  /* ---------- states ---------- */
  function state(kind) {
    done = true;
    const note = $('#trouble'); if (note) note.hidden = true;
    $('#reveal').hidden = true; $('#result').hidden = true;
    const book = `<a class="btn big" href="${esc(bookHref())}">Book a call anyway <i>↗</i></a>`;
    // score_public carries no fail_reason: the profile line in progress means the profile was read, so a later
    // failure is ours, never a private profile
    const markup = kind === 'unreadable'
      ? `<div class="wrap"><h1 class="disp rv">We couldn't read that profile.</h1>
         <p class="body rv" style="--d:.1s">It may be private, or the link may point somewhere else. Check the link and try again, or talk it through with me on a call.</p>
         <div class="ctas rv" style="--d:.16s">${book}<a class="link" href="/score/">Try another link</a></div></div>`
      : kind === 'unfinished'
      ? `<div class="wrap"><h1 class="disp rv">We couldn't finish this one.</h1>
         <p class="body rv" style="--d:.1s">Book a call and I'll go through it with you.</p>
         <div class="ctas rv" style="--d:.16s"><a class="btn big" href="${esc(bookHref())}">Book a call <i>↗</i></a><a class="link" href="/score/">Start a new score</a></div></div>`
      : `<div class="wrap"><h1 class="disp rv">We can't find this result.</h1>
         <p class="body rv" style="--d:.1s">The link may be cut short. Check that you copied all of it, or start a new score.</p>
         <div class="ctas rv" style="--d:.16s"><a class="btn big" href="/score/">Start a new score <i>→</i></a></div></div>`;
    put('state', markup);
  }

  /* ---------- the live log ---------- */
  const log = $('#log');
  const seen = new Set();
  function clockText(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  const progressLines = (data) => (Array.isArray(data.progress) ? data.progress.filter((p) => p && p.text) : []);
  function drawLog(data) {
    const t0 = Date.parse(data.created_at) || start;
    const lines = progressLines(data);
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

  /* ---------- the stage: the profile being read, each real line ticked as it lands (theatre only) ---------- */
  // pending steps carry no numbers: only the real lines from progress[] say what was found
  const PENDING = [['profile', 'Finding your profile'], ['posts', 'Reading your posts from the past 90 days'], ['business', 'Finding your business'],
    ['buyers', 'Working out who buys from you'], ['booking', 'Checking how a buyer books'], ['scores', 'Scoring your profile, posts and pipeline']];
  const stageSeen = new Set();
  function drawStage(data) {
    let stage = $('#stage');
    if (!stage) {
      stage = document.createElement('figure');
      stage.id = 'stage';
      stage.className = 'stage sheet rv sheetin';
      stage.style.setProperty('--d', '.12s');
      const slug = typeof local.slug === 'string' ? local.slug : '';
      stage.innerHTML = `<div class="chrome"><i></i><i></i><i></i><span>${esc(slug ? 'linkedin.com/in/' + slug : 'linkedin.com')}</span></div>` +
        '<div class="sp" aria-hidden="true"><div class="sp-banner"></div><div class="sp-av"><span></span></div>' +
        '<div class="sp-id"><b class="sp-name"><i class="sk w1"></i></b><i class="sk w2"></i><i class="sk w3"></i></div><i class="scanl"></i></div>' +
        '<ol class="ticks" aria-live="polite"></ol>';
      $('#log-live').appendChild(stage);
      R.observe($('#log-live'));
    }
    const lines = progressLines(data);
    const prof = lines.find((p) => p.key === 'profile');
    const name = prof ? (/^Found (.+?):\s/.exec(prof.text) || [])[1] : '';
    if (name && !stage.dataset.named) {
      stage.dataset.named = '1';
      $('.sp-name', stage).textContent = name;
      $('.sp-av span', stage).textContent = R.initials(name);
      stage.classList.add('named');
    }
    const list = $('.ticks', stage);
    list.querySelectorAll('.pend').forEach((li) => li.remove());
    let n = 0;
    lines.forEach((p) => {
      const id = (p.key || '') + '|' + (p.at || '') + '|' + p.text;
      if (stageSeen.has(id)) return;
      stageSeen.add(id);
      const li = document.createElement('li');
      li.className = 'got';
      li.innerHTML = `<i aria-hidden="true"></i><span>${esc(p.text)}</span>`;
      list.appendChild(li);
      if (R.still()) li.classList.add('on'); else setTimeout(() => li.classList.add('on'), 60 + n++ * 180);
    });
    const have = new Set(lines.map((p) => p.key));
    const pending = PENDING.filter(([k]) => !have.has(k));
    pending.forEach(([, text], i) => {
      const li = document.createElement('li');
      li.className = 'pend on' + (i === 0 ? ' next' : '');
      li.innerHTML = `<i aria-hidden="true"></i><span>${esc(text)}</span>`;
      list.appendChild(li);
    });
    stage.classList.toggle('reading', data.status !== 'queued' || lines.length > 0);
  }

  /* ---------- guess your score (theatre only; kept in sessionStorage, so a shared link never sees it) ---------- */
  function drawGuess() {
    const box = $('#guess');
    if (!box || box.dataset.drawn) return;
    box.dataset.drawn = '1';
    box.hidden = false;
    const g = readGuess();
    const tierName = (v) => R.TIERS[R.tierOf(v)];
    const locked = (v) => `<div class="guess sheet dark rv on"><p class="g-locked">You guessed <b>${v}</b>, ${esc(tierName(v))}.</p>` +
      '<p class="g-sub">Your real score shows here when the read is done.</p><button type="button" class="glink" id="g-change">Change my guess</button></div>';
    const open = (v) => `<div class="guess sheet dark rv${box.dataset.shown ? ' on' : ''}" style="--d:.24s"><h2>Guess your score.</h2>` +
      '<p class="g-sub">While we read, where do you think your LinkedIn lands? Lock in a number and see how close you get.</p>' +
      `<div class="g-out" aria-hidden="true"><output id="g-val">${v}</output><span id="g-tier">${esc(tierName(v))}</span></div>` +
      `<input type="range" id="g-in" min="0" max="100" step="1" value="${v}" aria-label="Your guess, 0 to 100" aria-valuetext="${v}, ${esc(tierName(v))}" style="--g:${v}">` +
      `<div class="g-scale" aria-hidden="true"><span style="--c:${R.FLOORS.side}">Hobby</span><span style="--c:${R.FLOORS.revenue - R.FLOORS.side}">Side channel</span><span style="--c:${100 - R.FLOORS.revenue}">Revenue line</span></div>` +
      '<div class="g-act"><button type="button" class="btn" id="g-lock">Lock it in <i>→</i></button></div></div>';
    const wire = () => {
      const inp = $('#g-in', box);
      if (inp) {
        inp.addEventListener('input', () => {
          const v = +inp.value;
          $('#g-val', box).textContent = v;
          $('#g-tier', box).textContent = tierName(v);
          inp.style.setProperty('--g', v);
          inp.setAttribute('aria-valuetext', `${v}, ${tierName(v)}`);
        });
        $('#g-lock', box).addEventListener('click', () => {
          try { sessionStorage.setItem(GUESS_KEY, String(+inp.value)); } catch (_) { /* memory only */ }
          box.innerHTML = locked(+inp.value);
          wire();
          $('#g-change', box).focus();
        });
      }
      const ch = $('#g-change', box);
      if (ch) ch.addEventListener('click', () => {
        const v = readGuess();
        try { sessionStorage.removeItem(GUESS_KEY); } catch (_) { /* fine */ }
        box.innerHTML = open(v == null ? 50 : v);
        wire();
        $('#g-in', box).focus();
      });
    };
    box.innerHTML = g == null ? open(50) : locked(g);
    box.dataset.shown = '1';
    wire();
    R.observe(box);
  }

  /* ---------- reading the scores ---------- */
  function normOf(scores) {
    const out = {};
    Object.values((scores && scores.pillars) || {}).forEach((p) => {
      Object.entries((p && p.normalised) || {}).forEach(([id, v]) => { if (R.num(v)) out[id] = v; });
    });
    return out;
  }
  const pillarsOf = (scores, ids) => R.PILLARS.filter((p) => {
    const n = (((scores || {}).pillars || {})[p.id] || {}).normalised || {};
    return ids.some((i) => i in n);
  }).map((p) => p.name);

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

  /* ---------- the simulator: every fix that moves a scored input, with the points it is worth ---------- */
  function simRows(ctx) {
    const { scores, narrative, report } = ctx;
    if (!R.num(scores.overall)) return [];
    // only project when the mirrored rubric reproduces the report's own score: never a number the report would not give
    const base = R.project(scores);
    if (base.overall !== scores.overall) return [];
    const norm = ctx.norm;
    const ok = (id) => id in norm && norm[id] < 1 && !NOT_ACTIONABLE.has(id);
    const rows = new Map();
    const add = (fix, ids) => {
      const ins = [...new Set((ids || []).filter(ok))].sort();
      if (!fix || !ins.length) return;
      const key = ins.join('+');
      if (rows.has(key)) return;
      const pts = R.project(scores, ins).overall - base.overall;
      if (pts > 0) rows.set(key, { key, ins, fix, pts, where: pillarsOf(scores, ins).join(' and ') });
    };
    R.PILLARS.forEach((p) => ((narrative && narrative.pillars && Array.isArray(narrative.pillars[p.id])) ? narrative.pillars[p.id] : [])
      .forEach((it) => it && add(it.fix, it.fact_ids)));
    (report.audit || []).forEach((a) => a && add(a.fix, [AREA_INPUT[a.area]]));
    return [...rows.values()].sort((a, b) => b.pts - a.pts || a.key.localeCompare(b.key));
  }
  const rowFor = (ids) => {
    const key = [...new Set((ids || []).filter((i) => sim.rows.some((r) => r.ins.includes(i))))].sort().join('+');
    return sim.rows.find((r) => r.key === key) || null;
  };
  const ptsButton = (ids) => {
    const r = rowFor(ids);
    return r && !PRINT ? `<button type="button" class="pts no-print" data-try="${esc(r.key)}">+${r.pts} to your score <span>Try it</span></button>` : '';
  };

  function simMarkup(ctx) {
    if (PRINT || !sim.rows.length) return '';
    const rows = sim.rows.map((r, i) => `<li class="rv" style="--d:${0.04 * i}s"><button type="button" class="tog" role="switch" aria-checked="${sim.on.has(r.key)}" data-tog="${esc(r.key)}">` +
      `<span class="sw" aria-hidden="true"><i></i></span><span class="tx"><b>${esc(r.fix)}</b><small>${esc(r.where)}</small></span><em>+${r.pts}</em></button></li>`).join('');
    return `<div class="sim sheet rv sheetin" style="--d:.24s"><div class="sim-h"><h2>Pick what you'll fix.</h2>` +
      '<p>Each fix shows what it adds to your score. Turn them on and watch your score move.</p></div>' +
      `<ul class="sim-rows">${rows}</ul>` +
      '<div class="sim-f"><p class="proj" id="sim-live" aria-live="polite"></p><p class="note">Projected with the same scoring as your report.</p>' +
      `<div class="sim-cta"><span>Want these done for you?</span><a class="btn" href="${esc(bookHref())}">Book a call with Ivan <i>↗</i></a></div></div></div>`;
  }

  function applySim() {
    const scores = sim.scores;
    if (!scores || !R.num(scores.overall)) return;
    const on = sim.rows.filter((r) => sim.on.has(r.key));
    const p = R.project(scores, on.flatMap((r) => r.ins));
    const moved = on.length > 0 && p.overall !== scores.overall;
    const target = { overall: moved ? p.overall : scores.overall };
    R.PILLARS.forEach(({ id }) => { const s = ((scores.pillars || {})[id] || {}).score; target[id] = on.length && R.num(p.pillars[id]) ? p.pillars[id] : s; });
    document.querySelectorAll('[data-proj]').forEach((el) => {
      const v = target[el.dataset.proj];
      if (!R.num(v) || String(v) === el.dataset.ring) return;
      const real = el.dataset.proj === 'overall' ? scores.overall : ((scores.pillars || {})[el.dataset.proj] || {}).score;
      R.ringTo(el, v, v === real ? `${v} out of 100` : `Projected ${v} out of 100`);
    });
    document.querySelectorAll('[data-projn]').forEach((el) => { const v = target[el.dataset.projn]; if (R.num(v)) el.textContent = v; });
    const hero = $('#hero-score');
    if (hero) {
      hero.classList.toggle('projected', moved);
      const small = $('.ring.big .rn small', hero);
      if (small) small.textContent = moved ? 'projected' : 'out of 100';
      const pin = $('.scale .ptrack', hero);
      if (pin) pin.style.setProperty('--px', Math.max(0.5, Math.min(99.5, target.overall)));
      const tierEl = $('.htier', hero);
      if (tierEl) tierEl.textContent = moved ? `Projected: ${R.TIERS[p.tier]}` : '';
    }
    const mb = $('#mbar');
    if (mb) mb.classList.toggle('projected', moved);
    document.querySelectorAll('[data-tog]').forEach((b) => b.setAttribute('aria-checked', String(sim.on.has(b.dataset.tog))));
    const live = $('#sim-live');
    if (live) {
      const order = ['hobby', 'side', 'revenue'];
      const up = moved && order.indexOf(p.tier) > order.indexOf(scores.tier);
      live.textContent = !on.length ? `Your score now: ${scores.overall}. Turn on a fix to see where you would land.`
        : `Projected: ${p.overall} out of 100, up ${p.overall - scores.overall}.` + (up ? ` That moves you into ${R.TIERS[p.tier]}.` : '');
      live.classList.toggle('up', moved);
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tog]');
    if (t) {
      const k = t.dataset.tog;
      if (sim.on.has(k)) sim.on.delete(k); else sim.on.add(k);
      applySim();
      return;
    }
    const tryIt = e.target.closest('[data-try]');
    if (tryIt) {
      sim.on.add(tryIt.dataset.try);
      applySim();
      const target = document.querySelector(`[data-tog="${CSS.escape(tryIt.dataset.try)}"]`);
      if (target) { target.scrollIntoView({ behavior: R.still() ? 'instant' : 'smooth', block: 'center' }); target.focus({ preventScroll: true }); }
    }
  });

  /* ---------- charts drawn from a fact's own display: counts are never invented ---------- */
  function viz(f, hot, opts = {}) {
    if (!f) return '';
    if (!f.readable) return opts.unread === false ? '' : '<figure class="viz unread"><b>We couldn\'t read this</b><figcaption>It is left out of your score.</figcaption></figure>';
    const d = String(f.display || '');
    const scope = f.scope && opts.scope !== false ? `<p class="vs">From ${esc(f.scope)}</p>` : '';
    const label = opts.label ? `<p class="vl">${esc(f.label)}</p>` : '';
    const h = hot ? ' hot' : '';
    // "N of M ..." with a small M: a dot per item, the N lit
    const ratio = /^(\d+) of (\d+)\b/.exec(d);
    if (ratio && +ratio[2] > 0 && +ratio[2] <= 60 && +ratio[1] <= +ratio[2]) {
      const n = +ratio[1], m = +ratio[2];
      const dots = Array.from({ length: m }, (_, i) => `<i${i < n ? ' class="l"' : ''} style="--i:${i}"></i>`).join('');
      const cols = m <= 10 ? m : Math.ceil(m / Math.ceil(m / 12));
      return `<figure class="viz ratio${h}">${label}<div class="dots-grid" style="--cols:${cols}" role="img" aria-label="${esc(d)}">${dots}</div>` +
        `<figcaption><b>${n} of ${m}</b> ${esc(d.slice(ratio[0].length).trim())}</figcaption>${scope}</figure>`;
    }
    // "26 image, 12 text, 3 document": one stacked bar
    if (/^\d+ [a-z]+(?:, \d+ [a-z]+)+$/i.test(d)) {
      const parts = [...d.matchAll(/(\d+) ([a-z]+)/gi)].map((m) => [m[2], +m[1]]);
      const total = parts.reduce((a, [, v]) => a + v, 0);
      if (total > 0) {
        return `<figure class="viz mixv${h}">${label}<div class="mix" role="img" aria-label="${esc(d)}">${parts.map(([, v], i) => `<i style="--g:${v};--k:${i}"></i>`).join('')}</div>` +
          `<figcaption class="leg">${parts.map(([k, v], i) => `<span style="--k:${i}"><b>${v}</b> ${esc(k)}</span>`).join('')}</figcaption>${scope}</figure>`;
      }
    }
    // a count or a rate: the number big, the rest of the line under it
    const lead = /^(\d[\d.,]*%?)\s+(.+)$/.exec(d);
    if (lead) return `<figure class="viz num${h}">${label}<div class="bn"><b>${esc(lead[1])}</b> <span>${esc(lead[2])}</span></div>${scope}</figure>`;
    if (opts.say === false) return '';
    return `<figure class="viz say${h}">${label}<p>${esc(d)}</p>${scope}</figure>`;
  }
  // in place (the rubric's WEAK_BELOW, 0.9) gets a tick; a gap shows how much of that input scores, as a small pie
  const meter = (v) => (R.num(v) ? (v >= 0.9 ? '<span class="mk ok" role="img" aria-label="In place"></span>'
    : `<span class="mk no" style="--v:${Math.max(0, Math.min(1, v))}" role="img" aria-label="To fix"></span>`) : '');
  const fixLine = (fix) => (fix ? `<p class="fix"><i aria-hidden="true">→</i><span><b>${esc(fix)}</b></span></p>` : '');

  /* ---------- hero ---------- */
  function heroParts(data, ctx) {
    const { scores, by, narrative, subject } = ctx;
    const overall = R.num(scores.overall) ? scores.overall : null;
    const tier = R.TIERS[scores.tier] || '';
    const photo = R.safeUrl(subject.photo_url);
    const av = photo ? `<img class="av" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="av" aria-hidden="true">${esc(R.initials(subject.name))}</span>`;
    const subj = `<div class="subj rv">${av}<div><b>${esc(subject.name || 'This profile')}</b>${subject.headline ? `<span>${esc(subject.headline)}</span>` : ''}</div></div>`;

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
    const partial = data.status === 'failed'
      ? '<p class="partial rv">The deeper read did not finish this time. Everything below is what we could read.</p>' : '';
    const guess = THEATRE || mine ? readGuess() : null;
    const guessed = guess != null && overall != null ? `<p class="guessed rv" style="--d:.2s">You guessed ${guess}. You scored ${overall}.</p>` : '';
    const pdf = R.safeUrl(data.pdf_url);
    const actions = `<div class="r-actions no-print rv" style="--d:.2s"><a class="btn" href="${esc(bookHref())}">Talk it through with Ivan <i>↗</i></a>` +
      (pdf ? `<a class="link" href="${esc(pdf)}" target="_blank" rel="noopener">Download the PDF</a>` : '') +
      `<a class="link" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resultUrl())}" target="_blank" rel="noopener">Share on LinkedIn</a></div>`;
    const copy = `<h1 class="disp rv" style="--d:.08s">${overall == null ? 'Not enough to score yet.' : esc(tier) + '.'}</h1>` + guessed +
      (gap ? `<p class="gap rv" style="--d:.16s">${esc(gap)}</p>` : '') + moved + partial + actions;

    const x = overall == null ? null : Math.max(0.5, Math.min(99.5, overall));
    const here = scores.tier;
    const segs = [['hobby', 0, R.FLOORS.side], ['side', R.FLOORS.side, R.FLOORS.revenue], ['revenue', R.FLOORS.revenue, 100]];
    const cols = segs.map(([, a, b]) => `${b - a}fr`);
    const scale = overall == null ? '' : `<div class="scale" style="--c1:${cols[0]};--c2:${cols[1]};--c3:${cols[2]};--x:${x}%;--px:${x}">` +
      `<div class="segs">${segs.map(([k]) => `<div class="seg${k === here ? ' here' : ''}"></div>`).join('')}</div>` +
      '<i class="pin" aria-hidden="true"></i><i class="ptrack" aria-hidden="true"><i></i></i>' +
      `<div class="names">${segs.map(([k, a, b]) => `<span class="${k === here ? 'here' : ''}">${R.TIERS[k]}<em>${a}${k === 'revenue' ? '+' : ' to ' + (b - 1)}</em></span>`).join('')}</div></div>`;
    const minis = R.PILLARS.map((p) => {
      const s = ((scores.pillars || {})[p.id] || {}).score;
      return `<a class="mini" href="#p-${p.id}">${ring('h-' + p.id, R.num(s) ? s : null, 'sm', '', p.id)}<span>${p.name}</span></a>`;
    }).join('');
    const score = `${ring('overall', overall, 'big', 'out of 100', 'overall')}<p class="htier" aria-hidden="true"></p>${scale}<div class="minis rv" style="--d:.1s">${minis}</div>`;
    return { subj, copy, score };
  }

  /* ---------- the profile: one annotated mock of their LinkedIn, numbered pins, the findings beside it ---------- */
  function profileMarkup(ctx, pending) {
    const { scores, by, narrative, report, subject, date } = ctx;
    const audit = (report.audit || []).filter((a) => a && a.area && a.fix && AREA_LABEL[a.area]);
    const byArea = {};
    audit.forEach((a) => { if (!byArea[a.area]) byArea[a.area] = a; });
    const pinned = AREA_ORDER.filter((a) => byArea[a]);
    const num = {};
    pinned.forEach((a, i) => { num[a] = i + 1; });
    const items = narrative && narrative.pillars && Array.isArray(narrative.pillars.profile) ? narrative.pillars.profile.filter(Boolean) : [];
    const groups = {};
    pinned.forEach((a) => { groups[a] = { items: [], facts: [] }; });
    const loose = [];
    const cited = ctx.cited;
    items.forEach((it) => {
      const area = (it.fact_ids || []).map((id) => FACT_AREA[id]).find((a) => num[a]);
      (area ? groups[area].items : loose).push(it);
    });
    const facts = (report.facts || []).filter((f) => f.pillar === 'profile' && !QUOTED.has(f.id) && !OWN.has(f.id) && !cited.has(f.id));
    const rest = [];
    const inMock = new Set(['followers', ...(byArea.booking ? ['booking_path'] : []), ...(byArea.featured || by.featured_count ? ['featured_count'] : [])]);
    facts.forEach((f) => { const a = FACT_AREA[f.id]; if (a && num[a]) groups[a].facts.push(f); else if (!inMock.has(f.id) || !f.readable) rest.push(f); });

    // the mock, built only from what we read
    const slug = (() => { try { return decodeURIComponent(new URL(subject.linkedin_url).pathname.replace(/\/$/, '')); } catch (_) { return ''; } })();
    const photo = R.safeUrl(subject.photo_url);
    const pin = (a) => (num[a] ? `<a class="pn-pin" href="#pf-${a}" aria-label="Finding ${num[a]}: ${esc(AREA_LABEL[a])}">${num[a]}</a>` : '');
    const ban = byArea.banner;
    const bannerText = ban ? (ban.quote ? `<span class="bq">${esc(ban.quote)}</span>` : `<span class="bt">${esc(ban.today || '')}</span>`) : '';
    const fol = by.followers && by.followers.readable ? `<p class="lm-meta">${esc(by.followers.display)}</p>` : '';
    const bk = byArea.booking;
    const bookRow = bk ? `<p class="lm-link">${bk.quote ? `<span class="lk">${esc(bk.quote)}</span>` : `<span class="lt">${esc((by.booking_path && by.booking_path.readable && by.booking_path.display) || bk.today || '')}</span>`}${pin('booking')}</p>` : '';
    const ab = byArea.about;
    const about = ab ? `<section class="lm-box"><h5>About</h5><p class="${ab.quote ? 'clip' : 'lt'}">${esc(ab.quote || ab.today || '')}</p>${pin('about')}</section>` : '';
    const fc = by.featured_count;
    const fn = fc && fc.readable ? Math.min(4, parseInt(firstNum(fc.display), 10) || 0) : 0;
    const feat = byArea.featured || fc ? `<section class="lm-box"><h5>Featured</h5>` +
      (fc && !fc.readable ? '<p class="lt">We couldn\'t read this</p>' : fn ? `<div class="lm-feat">${'<i></i>'.repeat(fn)}</div>` : `<p class="lt">${esc((byArea.featured && byArea.featured.today) || (fc && fc.display) || '')}</p>`) +
      `${pin('featured')}</section>` : '';
    const mock = `<figure class="li-mock sheet rv sheetin" aria-label="Your LinkedIn profile as we read it">` +
      `<div class="chrome"><i></i><i></i><i></i><span>linkedin.com${esc(slug)}</span><time>${esc(date ? 'captured ' + date : '')}</time></div>` +
      `<div class="lm-banner">${bannerText}${pin('banner')}</div>` +
      `<div class="lm-id">${photo ? `<img class="lm-av" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="lm-av">${esc(R.initials(subject.name))}</span>`}` +
      `<h4>${esc(subject.name || '')}</h4><p class="lm-hl">${esc((byArea.headline && byArea.headline.quote) || subject.headline || '')}${pin('headline')}</p>${fol}${bookRow}</div>` +
      about + feat + '</figure>';

    const factLine = (f) => `<p class="fl">${meter(ctx.norm[f.id])}<span>${esc(f.readable ? f.display : f.label + ": we couldn't read this")}</span></p>`;
    const findings = pinned.map((a) => {
      const g = groups[a], au = byArea[a];
      const ids = [AREA_INPUT[a], ...g.items.flatMap((it) => it.fact_ids || [])];
      const text = g.items.map((it) => `<p class="ft">${esc(it.text)}</p>`).join('');
      // what the audit saw, when the mock could not quote it and no written finding says it already
      const today = !au.quote && au.today && !g.items.length ? `<p class="today">${esc(au.today)}</p>` : '';
      const fixes = g.items.map((it) => fixLine(it.fix)).join('') + fixLine(au.fix);
      return `<li class="pf-f rv" id="pf-${a}"><span class="pn" aria-hidden="true">${num[a]}</span><div><h3>${esc(au.label || AREA_LABEL[a])}</h3>` +
        `${text}${g.facts.map(factLine).join('')}${today}${fixes}${ptsButton(ids)}</div></li>`;
    }).join('');
    const looseHTML = loose.map((it) => `<li class="pf-f loose rv"><span class="pn" aria-hidden="true"></span><div><h3>${esc(((it.fact_ids || []).map((id) => by[id]).find(Boolean) || {}).label || 'Also')}</h3>` +
      `<p class="ft">${esc(it.text)}</p>${fixLine(it.fix)}${ptsButton(it.fact_ids)}</div></li>`).join('');
    const writing = pending && !items.length ? writingLine() : '';
    const more = rest.length ? `<div class="also rv"><p class="also-h">Also measured</p><div class="also-g">${rest.map((f) => alsoTile(f, ctx)).join('')}</div></div>` : '';
    return `<section class="pillar pf" id="p-profile"><div class="wrap">${pillarHead(R.PILLARS[0], ctx)}` +
      `<div class="pf-grid"><div class="pf-art">${mock}</div><div class="pf-list">${writing}<ol>${findings}${looseHTML}</ol>${more}</div></div></div></section>`;
  }
  const writingLine = () => (PRINT ? '' : '<p class="writing pending">Writing what this means for you, with one fix for each finding<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></p>');
  function alsoTile(f, ctx) {
    const v = viz(f, ctx.hot.has(f.id), { label: true, say: false, scope: false, unread: false });
    if (v) return `<div class="at">${v}</div>`;
    return `<div class="at say"><p class="vl">${esc(f.label)}</p><p class="fl">${f.readable ? meter(ctx.norm[f.id]) : ''}<span>${esc(f.readable ? f.display : "We couldn't read this")}</span></p></div>`;
  }

  function pillarHead(p, ctx) {
    const ps = (ctx.scores.pillars || {})[p.id] || {};
    const score = R.num(ps.score) ? ps.score : null;
    const unread = (ps.missing || []).map((id) => ctx.by[id]).filter((f) => f && !f.readable).map((f) => f.label.toLowerCase());
    const miss = score == null
      ? '<p class="miss">We could read too little here to score this part.</p>'
      : unread.length ? `<p class="miss">We couldn't read: ${esc(unread.join(', '))}. ${unread.length === 1 ? 'It is' : 'They are'} left out of this score.</p>` : '';
    return `<div class="head"><div><h2 class="disp rv">${p.name}</h2><p class="rv" style="--d:.06s">${esc(p.q)}</p>${miss}</div>${ring('p-' + p.id, score, 'rv', score == null ? '' : 'of 100', p.id)}</div>`;
  }

  /* ---------- posts: the charts lead, one card per finding ---------- */
  function vizIds(ctx, ids) {
    return (ids || []).filter((id) => ctx.by[id] && ctx.by[id].readable && !QUOTED.has(id)).slice(0, 2);
  }
  function postsMarkup(ctx, pending) {
    const p = R.PILLARS[1];
    const items = ctx.narrative && ctx.narrative.pillars && Array.isArray(ctx.narrative.pillars.posts) ? ctx.narrative.pillars.posts.filter(Boolean) : [];
    const cited = ctx.cited;
    let cards = items.map((it, i) => {
      const vs = vizIds(ctx, it.fact_ids).map((id) => viz(ctx.by[id], ctx.hot.has(id), { say: false })).filter(Boolean);
      return `<article class="pc rv" style="--d:${i * 0.06}s">${vs.length ? `<div class="pc-viz${vs.length > 1 ? ' two' : ''}">${vs.join('')}</div>` : ''}` +
        `<div class="pc-tx"><p class="ft"><span>${esc(it.text)}</span></p>${fixLine(it.fix)}${ptsButton(it.fact_ids)}</div></article>`;
    }).join('');
    const facts = (ctx.report.facts || []).filter((f) => f.pillar === 'posts' && !QUOTED.has(f.id) && !OWN.has(f.id) && !cited.has(f.id));
    let more = '';
    if (!items.length) {
      // no written findings (yet): every measured fact gets its own chart card
      cards = facts.map((f, i) => `<article class="pc bare rv" style="--d:${i * 0.05}s">${viz(f, ctx.hot.has(f.id), { label: true })}</article>`).join('');
    } else if (facts.length) {
      more = `<div class="also rv"><p class="also-h">Also measured</p><div class="also-g">${facts.map((f) => alsoTile(f, ctx)).join('')}</div></div>`;
    }
    const writing = pending && !items.length ? writingLine() : '';
    const lead = !items.length && cards ? '<p class="measured-h rv">What we measured for this part.</p>' : '';
    return `<section class="pillar pp" id="p-posts"><div class="wrap">${pillarHead(p, ctx)}${writing}${lead}<div class="pcards">${cards}</div>${more}</div></section>`;
  }

  /* ---------- pipeline: a row per finding, the evidence on the left ---------- */
  function pipelineMarkup(ctx, pending) {
    const p = R.PILLARS[2];
    const items = ctx.narrative && ctx.narrative.pillars && Array.isArray(ctx.narrative.pillars.pipeline) ? ctx.narrative.pillars.pipeline.filter(Boolean) : [];
    const cited = ctx.cited;
    const withViz = [], plain = [];
    items.forEach((it) => {
      const id = vizIds(ctx, it.fact_ids)[0];
      const v = id ? viz(ctx.by[id], ctx.hot.has(id), { say: false }) : '';
      const tx = `<p class="ft"><span>${esc(it.text)}</span></p>${fixLine(it.fix)}${ptsButton(it.fact_ids)}`;
      if (v) withViz.push(`<div class="pl rv"><div class="pl-viz">${v}</div><div class="pl-tx">${tx}</div></div>`);
      else plain.push(`<div class="plc rv">${tx}</div>`);
    });
    let rows = withViz.join('') + (plain.length ? `<div class="plgrid">${plain.join('')}</div>` : '');
    const facts = (ctx.report.facts || []).filter((f) => f.pillar === 'pipeline' && !QUOTED.has(f.id) && !OWN.has(f.id) && !cited.has(f.id));
    let more = '';
    if (!items.length) {
      rows = facts.map((f) => {
        const v = viz(f, ctx.hot.has(f.id), { say: false, unread: false });
        return `<div class="pl rv${v ? '' : ' nov'}">${v ? `<div class="pl-viz">${v}</div>` : ''}<div class="pl-tx"><p class="vl">${esc(f.label)}</p>` +
          `<p class="ft">${f.readable ? meter(ctx.norm[f.id]) : ''}<span>${esc(f.readable ? f.display : "We couldn't read this. It is left out of your score.")}</span></p>${f.readable && f.scope ? `<p class="vs">From ${esc(f.scope)}</p>` : ''}</div></div>`;
      }).join('');
    } else if (facts.length) {
      more = `<div class="also rv"><p class="also-h">Also measured</p><div class="also-g">${facts.map((f) => alsoTile(f, ctx)).join('')}</div></div>`;
    }
    const writing = pending && !items.length ? writingLine() : '';
    return `<section class="pillar pl-sec" id="p-pipeline"><div class="wrap">${pillarHead(p, ctx)}${writing}<div class="plrows">${rows}</div>${more}</div></section>`;
  }

  const stillReading = (title) => (PRINT ? '' : `<div class="wrap"><h2 class="disp rv">${title}</h2><p class="still">Still reading<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> This part fills in here on its own in a few minutes.</p></div>`);
  const personLink = (name, url) => {
    const u = R.safeUrl(url);
    return u ? `<a class="nm" href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(name)}</a>` : `<b class="nm">${esc(name)}</b>`;
  };

  function engagersMarkup(ctx, running) {
    const f = ctx.by.buyer_share;
    const title = 'Who engages with you.';
    const named = Array.isArray(ctx.research.buyers_named) ? ctx.research.buyers_named.filter((p) => p && p.name) : [];
    if (!f || (!f.readable && !named.length)) return running ? stillReading(title) : '';
    const people = named.slice(0, 3).map((p, i) => `<div class="person sheet rv sheetin" style="--d:${i * 0.06}s"><span class="ini" aria-hidden="true">${esc(R.initials(p.name))}</span>${personLink(p.name, p.url)}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}</div>`).join('');
    if (!f.readable) {
      // too few engagers to measure a share: say so, still show who we found
      const why = f.scope ? `<p class="scope rv">From ${esc(f.scope)}.</p>` : '';
      return `<div class="wrap"><div class="top few"><div><h2 class="disp rv">${title}</h2><p class="lede rv" style="--d:.06s">${esc(f.display.replace(/^./, (c) => c.toUpperCase()))}.</p>${why}</div>` +
        (people ? `<div><p class="people-h rv">${named.length === 1 ? 'The buyer we found' : 'Buyers we found'}</p><div class="people stackp">${people}</div></div>` : '<div></div>') + '</div></div>';
    }
    const m = /\((\d+)%\)\s*$/.exec(f.display || '');
    const share = m ? +m[1] : null;
    const count = /^(\d+)\s+of/.exec(f.display || '');
    const lede = f.display.replace(/\s*\(\d+%\)\s*$/, '') + (count && count[1] === '1' ? ' looks like a buyer.' : ' look like buyers.');
    return `<div class="wrap"><div class="top"><div><h2 class="disp rv">${title}</h2><p class="lede rv" style="--d:.06s">${esc(lede)}</p><p class="scope rv">From ${esc(f.scope)}.</p></div>` +
      `<div class="rv">${share != null ? `<div class="big-n">${share}%</div><div class="share-bar${ctx.hot.has('buyer_share') ? ' hot' : ''}" role="img" aria-label="${share}% look like buyers"><i style="--w:${share / 100}"></i></div>` : ''}</div></div>` +
      (people ? `<div class="people">${people}</div>` : '') + `</div>`;
  }

  function competitorsMarkup(ctx, running) {
    const f = ctx.by.competitor_buyers, sec = ctx.research.competitor_engagers;
    const title = 'Buyers reading your competitors.';
    if (!f || !f.readable) return running ? stillReading(title) : '';
    const list = sec && Array.isArray(sec.people) ? sec.people.filter((p) => p && p.name) : [];
    const people = list.slice(0, 3).map((p, i) => {
      const how = p.engaged === 'commented' ? 'Commented on' : 'Reacted to';
      const when = p.posted_at ? ` from ${day(p.posted_at, false)}` : '';
      return `<div class="person sheet rv sheetin" style="--d:${i * 0.06}s"><span class="ini" aria-hidden="true">${esc(R.initials(p.name))}</span>${personLink(p.name, p.profile_url)}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}` +
        (p.reason ? `<p class="why"><b>Why they fit:</b> ${esc(p.reason)}</p>` : '') +
        (p.competitor ? `<p class="src">${how} a post by ${esc(p.competitor)}${when}${p.post_excerpt ? `: <q>${esc(p.post_excerpt)}</q>` : ''}</p>` : '') + `</div>`;
    }).join('');
    const notes = (sec && Array.isArray(sec.notes) ? sec.notes : []).slice(0, 2).map((n) => `<figure class="dmn sheet rv sheetin"><div class="bar2"><span class="in">in</span><b>To ${esc(n.to)}</b></div><div class="msgw"><p class="msg">${esc(n.note)}</p></div><p class="sm">A first note you could send, written as you. Edit it before you send it.</p></figure>`).join('');
    const total = sec && R.num(sec.count) ? sec.count : null;
    const shown = Math.min(3, list.length);
    const more = total != null && total > shown
      ? `<p class="more rv">We found ${total} in total. I'll go through the full list with you on a call. <a class="link no-print" href="${esc(bookHref())}">Book it ↗</a></p>` : '';
    const n = firstNum(f.display);
    // the people we can name, then one disc for the rest of the count
    const rest = total != null ? total - shown : 0;
    const stack = shown ? `<div class="avs" aria-hidden="true">${list.slice(0, 3).map((p) => `<span>${esc(R.initials(p.name))}</span>`).join('')}${rest > 0 ? `<span class="more-n">+${rest}</span>` : ''}</div>` : '';
    return `<div class="wrap"><div class="top cb"><div class="rv cb-n">${n ? `<div class="big-n">${esc(n)}</div><p class="big-l">${n === '1' ? 'buyer' : 'buyers'} you could reach this week</p>` : ''}${stack}</div>` +
      `<div><h2 class="disp rv">${title}</h2><p class="lede rv" style="--d:.06s">${esc(f.display)}.</p><p class="scope rv">From ${esc(f.scope)}.</p></div></div>` +
      (people ? `<div class="people">${people}</div>` : '') + (notes ? `<div class="notes">${notes}</div>` : '') + more + `</div>`;
  }

  function peersMarkup(ctx, running) {
    const f = ctx.by.peer_benchmark, rows = Array.isArray(ctx.research.peers) ? ctx.research.peers.filter(Boolean).slice(0, 3) : [];
    const title = 'You next to your niche.';
    if (!f || !rows.length) return running ? stillReading(title) : '';
    const you = (id) => { const x = ctx.by[id]; const n = x && x.readable ? parseFloat(String(firstNum(x.display)).replace(/,/g, '')) : NaN; return Number.isFinite(n) ? n : null; };
    const metrics = [
      { id: 'posts_per_week_90d', name: 'Posts a week', you: you('posts_per_week_90d'), peer: (p) => (R.num(p.posts_per_week_90d) ? p.posts_per_week_90d : null), fmt: plain },
      { id: 'original_share_90d', name: 'Original', you: you('original_share_90d'), peer: (p) => (R.num(p.original_share_90d) ? p.original_share_90d * 100 : null), fmt: (v) => pct(v / 100) },
      { id: 'median_engagement_original', name: 'Engagement per original post', sub: 'median reactions, comments and reposts', you: you('median_engagement_original'), peer: (p) => (R.num(p.median_engagement_original) ? p.median_engagement_original : null), fmt: plain },
    ];
    const charts = metrics.map((m, k) => {
      const vals = [['You', m.you, true], ...rows.map((p) => [p.name, m.peer(p), false])];
      const max = Math.max(0, ...vals.map(([, v]) => (R.num(v) ? v : 0)));
      const bars = vals.map(([name, v, me]) => `<li class="${me ? 'you' : ''}"><span class="nm">${esc(name)}</span><span class="tr"><i style="--w:${R.num(v) && max > 0 ? (v / max).toFixed(4) : 0}"></i></span><em>${R.num(v) ? esc(m.fmt(v)) : 'n/a'}</em></li>`).join('');
      return `<figure class="pchart rv" style="--d:${k * 0.08}s"><figcaption><b>${m.name}</b>${m.sub ? `<span>${m.sub}</span>` : ''}</figcaption><ul class="pbars">${bars}</ul></figure>`;
    }).join('');
    const who = rows.map((p) => `<li>${personLink(p.name, p.url)}${p.headline ? `<q>${esc(p.headline)}</q>` : ''}</li>`).join('');
    return `<div class="wrap"><div class="top one"><div><h2 class="disp rv">${title}</h2><p class="scope rv">From ${esc(f.scope)}.</p></div></div>` +
      `<div class="pcharts">${charts}</div><ul class="pwho rv">${who}</ul></div>`;
  }

  function planMarkup(ctx) {
    const steps = ctx.narrative && Array.isArray(ctx.narrative.plan_90d) ? ctx.narrative.plan_90d.filter(Boolean) : [];
    if (!steps.length) return '';
    return `<div class="band-in"><div class="wrap"><h2 class="disp rv">Your next 90 days.</h2><ol class="plan90">${steps.map((s, i) => `<li class="rv" style="--d:${i * 0.08}s"><span class="pnum" aria-hidden="true">${i + 1}</span><span class="vh">Step ${i + 1} of ${steps.length}: </span><p>${esc(s)}</p></li>`).join('')}</ol></div></div>`;
  }

  function bookMarkup(data, ctx) {
    let low = null;
    R.PILLARS.forEach((p) => { const s = ((ctx.scores.pillars || {})[p.id] || {}).score; if (R.num(s) && (!low || s < low.s)) low = { s, name: p.name.toLowerCase() }; });
    const pdf = R.safeUrl(data.pdf_url);
    const startWith = low ? `, starting with your ${low.name}` : '';
    return `<div class="wrap grid"><div><h2 class="disp rv">Let's go through it together.</h2>` +
      `<p class="body rv" style="--d:.06s">Book a call and we'll walk through this report${startWith}. If it makes sense, I'll show you how we would run it for you.</p>` +
      `<div class="ctas rv" style="--d:.12s"><a class="btn big" href="${esc(bookHref())}" data-print="calendly.com/im-ivanmanfredi/30min">Book a call with Ivan <i>↗</i></a>` +
      (pdf ? `<a class="link no-print" href="${esc(pdf)}" target="_blank" rel="noopener">Download the PDF</a>` : '') + `</div></div>` +
      `<figure class="sheet rv sheetin"><img src="/ivan-portrait-400.webp" alt="Ivan Manfredi" width="400" height="536"><figcaption><b>Ivan Manfredi</b><span>I make LinkedIn a revenue line for agency founders.</span></figcaption></figure></div>`;
  }

  /* ---------- the section nav (desktop) and the score bar (phone) ---------- */
  function navMarkup(ctx) {
    if (PRINT || !R.num(ctx.scores.overall)) return '';
    const links = R.PILLARS.map((p) => {
      const s = ((ctx.scores.pillars || {})[p.id] || {}).score;
      return `<a href="#p-${p.id}" data-sec="p-${p.id}">${ring('n-' + p.id, R.num(s) ? s : null, 'xs', '', p.id)}<span>${p.name}</span><b data-projn="${p.id}">${R.num(s) ? s : '?'}</b></a>`;
    }).join('');
    return links + (sim.rows.length ? '<a href="#sim" data-sec="sim" class="simlink"><span>Simulator</span></a>' : '');
  }
  function mbarMarkup(ctx) {
    if (PRINT) return '';
    const o = ctx.scores.overall;
    return `<div class="mb-s">${ring('m-overall', R.num(o) ? o : null, 'xs', '', 'overall')}<b data-projn="overall">${R.num(o) ? o : '?'}</b><span>${esc(R.TIERS[ctx.scores.tier] || 'Not scored')}</span></div>` +
      `<a class="btn" href="${esc(bookHref())}">Book a call <i>↗</i></a>`;
  }
  let spyOn = false;
  function spy() {
    if (spyOn || PRINT || !('IntersectionObserver' in window)) return;
    spyOn = true;
    const nav = $('#secnav'), bar = $('#mbar');
    // both appear once the hero score has scrolled away
    new IntersectionObserver(([e]) => {
      const away = !e.isIntersecting && e.boundingClientRect.top < 0;
      document.body.classList.toggle('scrolled-past', away);
    }, { threshold: 0 }).observe($('#hero-score'));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        nav.querySelectorAll('a').forEach((a) => a.classList.toggle('cur', a.dataset.sec === e.target.id));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    const watch = () => ['sim', 'p-profile', 'p-posts', 'p-pipeline'].forEach((id) => { const el = document.getElementById(id); if (el && !el.dataset.spied) { el.dataset.spied = '1'; io.observe(el); } });
    watch();
    spy.watch = watch;
    if (bar) bar.hidden = false;
  }

  /* ---------- one render pass ---------- */
  function render(data) {
    if (!last && cache.state) put('state', '');
    last = data;
    const status = data.status;
    const report = data.report && typeof data.report === 'object' ? data.report : null;
    const scores = (report && report.scores) || data.scores;
    // a run that failed after Tier 1 was written keeps its report: shown, with a note in the hero
    const hasReport = ['tier1', 'complete', 'failed'].includes(status) && report && scores && scores.pillars;
    if (status === 'failed' && !hasReport) {
      const read = (data.progress || []).some((p) => p && p.key === 'profile');
      if (!PRINT) state(read ? 'unfinished' : 'unreadable'); else done = true;
      return;
    }

    if (!hasReport) {
      if (PRINT) return;
      const reveal = $('#reveal');
      reveal.hidden = false;
      reveal.classList.toggle('theatre', THEATRE);
      if (THEATRE) {
        drawStage(data);
        drawGuess();
      } else {
        if (log.parentElement.id !== 'log-live') $('#log-live').appendChild(log);
        log.hidden = false;
      }
      R.observe(reveal);
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
    // evidence is dated by when the profile was read (a cached subject can be up to 7 days old), else the run
    const ctx = { report, scores, by, narrative, subject, research, date: day(subject.captured_at) || day(data.created_at), norm: normOf(scores) };
    ctx.cited = new Set(R.PILLARS.flatMap((p) => (narrative && narrative.pillars && Array.isArray(narrative.pillars[p.id]) ? narrative.pillars[p.id] : []).flatMap((it) => (it && it.fact_ids) || [])));
    ctx.weak = weakest(scores, by);
    ctx.hot = new Set(narrative && Array.isArray(narrative.headline_fact_ids) && narrative.headline ? narrative.headline_fact_ids : (ctx.weak ? [ctx.weak] : []));
    if (subject.name) document.title = `${subject.name}: Revenue Line Score`;
    sim.scores = scores;
    sim.rows = simRows(ctx);
    sim.on = new Set([...sim.on].filter((k) => sim.rows.some((r) => r.key === k)));

    if (!shownResult) {
      shownResult = true;
      const reveal = $('#reveal');
      const beat = THEATRE && !reveal.hidden && !R.still();
      const show = () => {
        reveal.hidden = true; reveal.classList.remove('out', 'collapse');
        $('#result').hidden = false;
        $('#log-det').appendChild(log);
        if (PRINT) $('#log-det').open = true;
        log.hidden = false;
        if (!PRINT) scrollTo({ top: 0 });
      };
      if (beat) {
        // the one choreographed moment: the stage folds away, the ring counts up, then the tier word sets
        reveal.classList.add('collapse');
        R.ringDur = 1500;
        $('#result').classList.add('beat');
        setTimeout(() => { R.ringDur = 600; $('#result').classList.remove('beat'); }, 3200);
        setTimeout(show, 420);
      } else if (!reveal.hidden && !R.still()) { reveal.classList.add('out'); setTimeout(show, 300); } else show();
    }
    const running = !['complete', 'failed'].includes(status);
    const pending = running && !narrative && !narrated;
    const hero = heroParts(data, ctx);
    put('hero-subj', hero.subj);
    put('hero-score', hero.score);
    put('hero-copy', hero.copy);
    put('sim', simMarkup(ctx));
    put('stood', narrative && narrative.about_them && narrative.about_them.text ? `<div class="wrap"><p class="flow rv">${esc(narrative.about_them.text)}</p></div>` : '');
    put('pillars', profileMarkup(ctx, pending) + postsMarkup(ctx, pending) + pipelineMarkup(ctx, pending));
    put('engagers', engagersMarkup(ctx, running));
    put('competitors', competitorsMarkup(ctx, running));
    put('peers', peersMarkup(ctx, running));
    put('plan', planMarkup(ctx));
    put('book', bookMarkup(data, ctx));
    put('secnav', navMarkup(ctx));
    put('mbar', mbarMarkup(ctx));
    drawLog(data);
    $('#nav-book').href = bookHref();
    applySim();
    if (!PRINT) { spy(); if (spy.watch) spy.watch(); }
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
    if (res && (res.status === 404 || res.status === 400)) { if (!PRINT) state('missing'); return; }
    let data = null;
    if (res && res.ok) { try { data = await res.json(); } catch (_) { data = null; } }
    if (data && typeof data === 'object') {
      if (failures >= 3) trouble(false);
      failures = 0;
      try { render(data); } catch (e) { console.warn('score render', e); }
      if (['complete', 'failed'].includes(data.status)) done = true;
    } else {
      failures++;
      if (failures >= 3 && !PRINT && !done) trouble(true);
    }
    if (done) return;
    const wait = PRINT ? 1000 : Date.now() - start > 180000 ? 10000 : 2000;
    setTimeout(poll, failures ? Math.min(wait * (1 + failures * 0.5), 15000) : wait);
  }

  // elapsed clock in the reveal
  setInterval(() => {
    if (!last || $('#reveal').hidden) return;
    const ms = Date.now() - (Date.parse(last.created_at) || start);
    // an old link opened later: the clock would read hours, which says nothing useful
    $('#clock').hidden = ms > 30 * 60000;
    $('#clock').textContent = clockText(ms);
  }, 1000);

  if (!TOKEN_RX.test(token)) { if (!PRINT) state('missing'); }
  else poll();
})();
