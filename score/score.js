/* Revenue Line Score: shared helpers (window.RLS) + the landing page (live demo card, question flow).
   Motion is transform/opacity only; html.rm (prefers-reduced-motion) or print/og modes skip it. */
(() => {
  const html = document.documentElement;
  const FN = 'https://bjbvqvzbzczjbatgmccb.supabase.co/functions/v1/';
  const RLS = window.RLS = {
    SUBMIT: FN + 'score-submit',
    STATUS: FN + 'score-status',
    BOOK: 'https://calendly.com/im-ivanmanfredi/30min',
    // Shared with the report email (score_render.TIER_LABELS). Floors follow score_rubric.TIERS.
    TIERS: { hobby: 'Hobby', side: 'Side channel', revenue: 'Revenue line' },
    FLOORS: { side: 45, revenue: 75 },
    PILLARS: [
      { id: 'profile', name: 'Profile', q: 'When a buyer clicks your name, do they see who you help, proof and a way to book?' },
      { id: 'posts', name: 'Posts', q: 'Do your posts reach the people who buy from you?' },
      { id: 'pipeline', name: 'Pipeline', q: 'Does the attention turn into conversations?' },
    ],
  };
  RLS.still = () => html.classList.contains('rm');

  RLS.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RLS.num = (v) => typeof v === 'number' && Number.isFinite(v);
  RLS.initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'in';
  RLS.safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } };

  /* ---------- the rubric, mirrored from score_rubric.py (the source of truth: WEIGHTS, TIERS, _half_up, score()).
     Keep in step with it. A pillar is the weighted mean of its scored inputs (score.pillars[p].inputs, values from
     .normalised), rounded half up, and needs 2 inputs; overall is the rounded mean of the scored pillars.
     The tests recompute every fixture from its own normalised values, so any drift fails there. ---------- */
  const WEIGHTS = RLS.WEIGHTS = {
    profile: { banner_set: 1.0, featured_count: 1.0, booking_path: 1.0, followers: 1.0,
      headline_clear: 2.0, banner_states_offer: 1.0, about_opens_on_buyer: 1.0, proof_visible: 1.0 },
    posts: { posts_per_week_90d: 1.5, original_share_90d: 1.0, days_since_original: 1.0,
      median_engagement_original: 2.0, format_mix: 1.0, topic_fit: 2.0, buyer_share: 2.0 },
    pipeline: { booking_path: 1.0, lead_magnet_seen: 1.5, cta_share: 1.0, competitor_buyers: 0.75 },
  };
  const halfUp = (x) => Math.floor(x + 0.5);
  RLS.tierOf = (v) => (RLS.num(v) ? (v >= RLS.FLOORS.revenue ? 'revenue' : v >= RLS.FLOORS.side ? 'side' : 'hobby') : null);
  RLS.pillarScore = (pillar, inputs, values) => {
    const w = WEIGHTS[pillar] || {};
    const ins = (Array.isArray(inputs) ? inputs : []).filter((i) => RLS.num(w[i]) && RLS.num(values[i]));
    if (ins.length < 2) return null;
    let total = 0, sum = 0;
    ins.forEach((i) => { total += w[i]; });
    ins.forEach((i) => { sum += w[i] * values[i]; });
    return halfUp(100 * sum / total);
  };
  // scores as written by the worker, with every input in `fixed` set to 1.0: the projection the simulator shows
  RLS.project = (scores, fixed = []) => {
    const set = new Set(fixed), out = { pillars: {} }, scored = [];
    RLS.PILLARS.forEach(({ id }) => {
      const p = ((scores && scores.pillars) || {})[id] || {};
      const values = Object.assign({}, p.normalised || {});
      set.forEach((i) => { if (i in values) values[i] = 1; });
      const s = RLS.pillarScore(id, p.inputs, values);
      out.pillars[id] = s;
      if (s != null) scored.push(s);
    });
    out.overall = scored.length ? halfUp(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
    out.tier = RLS.tierOf(out.overall);
    return out;
  };

  /* ---------- ring: two clipped half arcs; the count-up rotates them (transform only) ---------- */
  RLS.ringHTML = (value, cls = '', sub = '') => {
    const has = RLS.num(value);
    return `<div class="ring ${cls}${has ? '' : ' none'}" data-ring="${has ? value : ''}" role="img" aria-label="${has ? value + ' out of 100' : 'Not scored'}">` +
      '<div class="rt"></div><div class="rh r"><i></i></div><div class="rh l"><i></i></div>' +
      `<b class="rn" aria-hidden="true"><span>${has ? 0 : '?'}</span>${sub ? `<small>${RLS.esc(sub)}</small>` : ''}</b></div>`;
  };
  const setRing = RLS.setRing = (el, v) => {
    const a = Math.max(0, Math.min(100, v)) * 3.6;
    const [r, l] = el.querySelectorAll('.rh i');
    r.style.transform = `rotate(${Math.min(a, 180)}deg)`;
    l.style.transform = `rotate(${Math.max(a - 180, 0)}deg)`;
    // an arc at 0 deg still leaves a hairline on the clip edge: hide it until it has length
    r.style.opacity = a > 0 ? 1 : 0;
    l.style.opacity = a > 180 ? 1 : 0;
    el.querySelector('.rn span').textContent = Math.round(v);
    el._v = v;
  };
  const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  RLS.ringDur = 600;
  RLS.animateRing = (el, from = 0, dur = RLS.ringDur) => {
    const to = parseFloat(el.dataset.ring);
    if (!RLS.num(to)) return;
    const tok = (el._tok || 0) + 1;
    el._tok = tok;
    if (RLS.still() || from === to || !dur) { setRing(el, to); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (el._tok !== tok) return;
      const p = expo((now - t0) / dur);
      setRing(el, from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
    };
    setRing(el, from);
    requestAnimationFrame(step);
  };
  // move a ring that is already on screen to a new value (the simulator, the demo): from wherever it shows now
  RLS.ringTo = (el, to, label, dur) => {
    if (!el || !RLS.num(to)) return;
    const from = RLS.num(el._v) ? el._v : 0;
    el.dataset.ring = to;
    el.dataset.done = '1';
    if (label) el.setAttribute('aria-label', label);
    RLS.animateRing(el, from, dur);
  };

  /* ---------- entries: .rv gets .on when it scrolls in; rings count up once ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      io.unobserve(el);
      el.classList.add('on');
      if (el.matches('[data-ring]') && !el.dataset.done) { el.dataset.done = '1'; RLS.animateRing(el, +(el.dataset.from || 0)); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }) : null;
  RLS.ANIM = '.rv:not(.on), [data-ring]:not([data-done]), .bar:not(.on), .share-bar:not(.on), .scale:not(.on), .gap:not(.on), .dots-grid:not(.on), .mix:not(.on), .pbars:not(.on)';
  RLS.observe = (root = document) => {
    const els = [...root.querySelectorAll(RLS.ANIM)];
    if (root.matches && root.matches('.rv:not(.on)')) els.push(root);
    els.forEach((el) => {
      if (RLS.still() || !io) {
        el.classList.add('on');
        if (el.matches('[data-ring]')) { el.dataset.done = '1'; RLS.animateRing(el); }
      } else io.observe(el);
    });
  };

  /* ---------- LinkedIn link check: same rules as score-submit/validation.ts ---------- */
  RLS.checkLinkedin = (raw) => {
    let text = String(raw || '').trim();
    if (!text) return { error: 'Paste the link to your LinkedIn profile.' };
    if (text.length > 300) return { error: "That link is too long. Copy it again from your profile's address bar." };
    text = text.replace(/[\t\r\n]/g, '');
    if (/(^|\/\/|\.)lnkd\.in\//i.test(text)) return { error: 'Short links do not work here. Open your profile and copy the full address, the one with /in/.' };
    if (!text.includes('://')) text = 'https://' + text;
    const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/.exec(text);
    const host = m ? m[2].slice(m[2].lastIndexOf('@') + 1).replace(/:\d*$/, '').toLowerCase() : '';
    if (!m || !/^https?$/i.test(m[1]) || !/^(?:www\.|[a-z]{1,3}\.)?linkedin\.com$/i.test(host)) {
      return { error: 'That is not a LinkedIn link. It should look like linkedin.com/in/your-name.' };
    }
    let path = m[3];
    const semi = path.indexOf(';', path.lastIndexOf('/') + 1);
    if (semi >= 0) path = path.slice(0, semi);
    const parts = path.split('/').filter(Boolean);
    const kind = (parts[0] || '').toLowerCase();
    if (['company', 'school', 'showcase'].includes(kind)) return { error: 'That is a company page. Paste your personal profile link, the one with /in/.' };
    if (parts.length < 2 || kind !== 'in') return { error: 'That link does not point to a profile. It should look like linkedin.com/in/your-name.' };
    let slug;
    try { slug = decodeURIComponent(parts[1]); } catch (_) { slug = parts[1]; }
    slug = slug.normalize('NFC').trim().toLowerCase();
    if (!slug || /[\s/?#]/.test(slug)) return { error: 'That link does not point to a profile. It should look like linkedin.com/in/your-name.' };
    return { slug, url: `https://www.linkedin.com/in/${encodeURIComponent(slug)}/` };
  };

  const ready = () => {
    RLS.observe();
    const nav = document.getElementById('nav');
    if (nav) {
      const solid = () => nav.classList.toggle('solid', scrollY > 8);
      addEventListener('scroll', solid, { passive: true });
      solid();
    }
    if (document.body.classList.contains('land')) landing();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  /* =============================== LANDING =============================== */

  /* The card next to the form replays Iván's own finished run (the #example-run JSON, his real progress lines and
     scores): lines tick in, the ring fills, the pillar bars fill, a pause, then it starts over. Only his run is ever
     shown here; every other scored profile is a real prospect. Reduced motion, or the visitor on step 2: final state. */
  function demoCard(el, ex) {
    const esc = RLS.esc;
    if (!ex || typeof ex !== 'object' || !ex.pillars || !RLS.num(ex.overall)) { el.hidden = true; return { freeze() {}, play() {} }; }
    const lines = (Array.isArray(ex.progress) ? ex.progress : []).filter((t) => typeof t === 'string' && t);
    const photo = RLS.safeUrl(ex.photo);
    const rows = RLS.PILLARS.map((p, i) => {
      const v = RLS.num(ex.pillars[p.id]) ? ex.pillars[p.id] : null;
      return `<li><b>${p.name}</b><div class="bar" style="--d:${0.15 + i * 0.12}s"><i style="--w:${v == null ? 0 : v / 100}"></i></div><em>${v == null ? '?' : v}</em></li>`;
    }).join('');
    const tier = RLS.TIERS[ex.tier] || '';
    el.setAttribute('aria-label', `A real result: ${ex.name}, ${ex.overall} out of 100, ${tier}`);
    el.innerHTML = `<div class="top">${photo ? `<img class="av" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : '<span class="av" aria-hidden="true"></span>'}` +
      `<div class="nm"><b>${esc(ex.name)}</b><span>${esc(ex.headline || '')}</span></div><span class="live" aria-hidden="true"><i></i>Reading</span></div>` +
      `<div class="feed" aria-hidden="true"><ol>${lines.map((t) => `<li><i></i><span>${esc(t)}</span></li>`).join('')}</ol></div>` +
      `<div class="mid">${RLS.ringHTML(ex.overall, 'ink')}<div class="tier">${esc(tier)}<small>A real result, scored from the profile</small></div></div>` +
      `<ul>${rows}</ul>`;
    const feed = el.querySelector('.feed'), list = feed.querySelector('ol'), items = [...list.children];
    const ring = el.querySelector('.ring'), bars = [...el.querySelectorAll('.bar')];
    ring.dataset.done = '1';
    let timers = [], visible = false, frozen = false, playing = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const stop = () => { timers.forEach(clearTimeout); timers = []; playing = false; };
    const showLines = (n) => {
      items.forEach((li, i) => li.classList.toggle('on', i < n));
      const last = items[n - 1];
      const shift = last ? Math.max(0, last.offsetTop + last.offsetHeight - feed.clientHeight) : 0;
      list.style.transform = `translate3d(0, ${-shift}px, 0)`;
    };
    const final = () => {
      stop();
      el.classList.remove('fade');
      el.classList.add('done');
      showLines(items.length);
      ring.dataset.ring = ex.overall;
      RLS.setRing(ring, ex.overall);
      bars.forEach((b) => b.classList.add('on'));
    };
    const cycle = () => {
      stop();
      playing = true;
      el.classList.remove('done');
      showLines(0);
      RLS.setRing(ring, 0);
      bars.forEach((b) => b.classList.remove('on'));
      requestAnimationFrame(() => el.classList.remove('fade'));
      const step = 720, t = 600 + items.length * step;
      items.forEach((_, i) => later(() => showLines(i + 1), 600 + i * step));
      later(() => { el.classList.add('done'); RLS.ringTo(ring, ex.overall, null, 1300); bars.forEach((b) => b.classList.add('on')); }, t);
      later(() => el.classList.add('fade'), t + 5600);
      later(cycle, t + 6200);
    };
    const maybe = () => {
      if (frozen || RLS.still()) { final(); return; }
      if (visible && !document.hidden) { if (!playing) cycle(); } else if (playing) final();
    };
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; maybe(); }, { threshold: 0.25 }).observe(el);
    else visible = true;
    document.addEventListener('visibilitychange', maybe);
    final();
    return { freeze() { frozen = true; final(); }, play() { frozen = false; maybe(); } };
  }

  function landing() {
    const $ = (s) => document.querySelector(s);
    const step1 = $('#step1'), step2 = $('#step2'), li = $('#li'), liErr = $('#li-err');
    const preview = $('#preview'), hero = $('.s-hero');
    let example = null;
    try { example = JSON.parse($('#example-run').textContent); } catch (_) { example = null; }
    const demo = demoCard(preview, example);
    let picked = null;

    li.addEventListener('input', () => { li.removeAttribute('aria-invalid'); liErr.textContent = ''; });

    const swap = (from, to, focus) => {
      const show = () => {
        hero.classList.toggle('at2', to === step2);
        if (to === step2) demo.freeze(); else demo.play();
        from.hidden = true; from.classList.remove('out');
        to.hidden = false;
        to.classList.add('rv'); to.classList.remove('on');
        if (to === step2) to.classList.add('sheetin');
        requestAnimationFrame(() => requestAnimationFrame(() => to.classList.add('on')));
        if (focus) focus.focus({ preventScroll: true });
        const behavior = RLS.still() ? 'instant' : 'smooth';
        if (innerWidth > 860) scrollTo({ top: 0, behavior });
        // measure the untransformed wrapper: the sheet itself is still mid-entry (translated down)
        else scrollTo({ top: Math.max(0, scrollY + to.parentElement.getBoundingClientRect().top - 84), behavior });
      };
      if (RLS.still()) { show(); return; }
      from.classList.add('out');
      setTimeout(show, 260);
    };

    /* ---------- step 2: one question at a time ---------- */
    const STEPS = [...step2.querySelectorAll('[data-step]')];
    const KEYS = ['revenue', 'team', 'source', 'goal'];
    // true lines only: score_narrative uses the answers to choose what matters most, never to set a number
    const ACK = {
      revenue: 'Thanks. This only helps us choose which fixes matter most for you.',
      team: 'Got it. A team of one and a team of 20 need different first fixes.',
      source: 'Noted. Your score comes only from your profile and posts, never from these answers.',
      goal: 'Last one. We use your goal to pick which fixes to lead with.',
    };
    const pips = [...step2.querySelectorAll('.pips li')], count = $('#qcount'), back = $('#back'), ack = $('#ack'), qErr = $('#q-err');
    let at = 0, arrowNav = false, advance = null;
    const answered = (k) => !!step2.querySelector(`input[name="${k}"]:checked`);
    const focusStep = (el) => {
      const target = el.matches('fieldset') ? el : el.querySelector('input');
      if (target) target.focus({ preventScroll: true });
    };
    function go(n, focus = true) {
      clearTimeout(advance);
      n = Math.max(0, Math.min(STEPS.length - 1, n));
      const dir = n >= at ? 1 : -1;
      STEPS.forEach((s, i) => { s.hidden = i !== n; s.classList.remove('in', 'in-r'); });
      const to = STEPS[n];
      if (!RLS.still()) { to.classList.add(dir > 0 ? 'in' : 'in-r'); requestAnimationFrame(() => requestAnimationFrame(() => to.classList.remove('in', 'in-r'))); }
      at = n;
      pips.forEach((p, i) => { p.classList.toggle('now', i === n); p.classList.toggle('done', i < n || (i < 4 && answered(KEYS[i]))); });
      count.textContent = `${n + 1} of ${STEPS.length}`;
      back.hidden = n === 0;
      if (focus) focusStep(to);
    }
    function onPick(q, next) {
      q.removeAttribute('aria-invalid');
      if (!step2.querySelector('.q[aria-invalid]')) qErr.textContent = '';
      ack.textContent = ACK[q.dataset.q] || '';
      const i = STEPS.indexOf(q);
      if (pips[i]) pips[i].classList.add('done');
      if (!next) return;
      clearTimeout(advance);
      advance = setTimeout(() => { if (STEPS[at] === q) go(at + 1); }, RLS.still() ? 120 : 460);
    }
    step2.addEventListener('keydown', (e) => {
      const cur = STEPS[at];
      if (!cur.matches('fieldset.q') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) {
        const r = cur.querySelectorAll('input[type=radio]')[+e.key - 1];
        if (!r) return;
        e.preventDefault();
        r.checked = true;
        r.focus({ preventScroll: true });
        onPick(cur, true);
      } else if (e.key.startsWith('Arrow')) arrowNav = true;
    });
    step2.addEventListener('change', (e) => {
      const q = e.target.closest('fieldset.q');
      if (!q) return;
      const fromArrow = arrowNav;
      arrowNav = false;
      onPick(q, !fromArrow);
    });
    back.addEventListener('click', () => go(at - 1));
    step2.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('skip')) $('#website').value = '';
      go(at + 1);
    }));

    step1.addEventListener('submit', (e) => {
      e.preventDefault();
      const c = RLS.checkLinkedin(li.value);
      if (c.error) { liErr.textContent = c.error; li.setAttribute('aria-invalid', 'true'); li.focus(); return; }
      picked = c;
      $('#li-show').textContent = `linkedin.com/in/${c.slug}`;
      go(0, false);
      swap(step1, step2, STEPS[0]);
    });
    $('#change').addEventListener('click', () => swap(step2, step1, li));
    $('#to-top').addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: RLS.still() ? 'instant' : 'smooth' });
      setTimeout(() => (step1.hidden ? focusStep(STEPS[at]) : li.focus({ preventScroll: true })), RLS.still() ? 0 : 500);
    });

    const EMAIL_RX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
    $('#email').addEventListener('input', () => { $('#email').removeAttribute('aria-invalid'); $('#email-err').textContent = ''; });

    step2.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Enter before the last step moves on, the way a tap does
      if (at < STEPS.length - 1) {
        const cur = STEPS[at];
        if (!cur.matches('fieldset.q') || cur.querySelector('input:checked')) go(at + 1);
        return;
      }
      const email = $('#email').value.trim();
      const answers = {};
      const missing = [];
      KEYS.forEach((k) => {
        const on = step2.querySelector(`input[name="${k}"]:checked`);
        const q = step2.querySelector(`.q[data-q="${k}"]`);
        if (on) { answers[k] = on.value; q.removeAttribute('aria-invalid'); } else { missing.push(q); q.setAttribute('aria-invalid', 'true'); }
      });
      if (missing.length) {
        qErr.textContent = 'Pick one answer for this question.';
        go(STEPS.indexOf(missing[0]));
        return;
      }
      if (!email || email.length > 254 || !EMAIL_RX.test(email)) {
        $('#email-err').textContent = 'Check your email. We send your result there.';
        $('#email').setAttribute('aria-invalid', 'true');
        $('#email').focus();
        return;
      }

      let website = $('#website').value.trim();
      if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
      let session = null;
      try { session = (JSON.parse(localStorage.getItem('ios_tracking_v1')) || {}).session_id || null; } catch (_) { session = null; }
      const body = { linkedin_url: picked.url, email, answers, consent_nurture: $('#consent').checked };
      if (website) body.website = website;
      if (session) body.session_id = session;

      const goBtn = $('#go'), sendErr = $('#send-err');
      sendErr.textContent = '';
      goBtn.disabled = true; goBtn.firstChild.textContent = 'Starting ';
      let res, out = {};
      try {
        res = await fetch(RLS.SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        out = await res.json().catch(() => ({}));
      } catch (_) { res = null; }
      if (res && res.ok && typeof out.token === 'string') {
        try { sessionStorage.setItem('rls:' + out.token, JSON.stringify({ email, over_cap: !!out.over_cap, slug: picked.slug })); } catch (_) { /* memory only */ }
        location.href = '/score/r/?t=' + encodeURIComponent(out.token);
        return;
      }
      goBtn.disabled = false; goBtn.firstChild.textContent = 'Score my LinkedIn ';
      const code = out && out.error;
      if (code === 'linkedin_url') { swap(step2, step1, li); liErr.textContent = 'We could not use that LinkedIn link. Copy it again from your profile.'; li.setAttribute('aria-invalid', 'true'); }
      else if (code === 'email') { $('#email-err').textContent = 'Check your email. We send your result there.'; $('#email').setAttribute('aria-invalid', 'true'); $('#email').focus(); }
      else if (code === 'answers') { go(0); qErr.textContent = 'Pick one answer for each question.'; }
      else if (res && res.status === 429) sendErr.textContent = 'You have started a few scores in the last hour. Try again a little later.';
      else sendErr.textContent = 'Something went wrong on our side. Try again in a minute.';
    });
  }
})();
