/* Revenue Line Score: shared helpers (window.RLS) + the landing page (form, preview card).
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

  /* ---------- ring: two clipped half arcs; the count-up rotates them (transform only) ---------- */
  RLS.ringHTML = (value, cls = '', sub = '') => {
    const has = RLS.num(value);
    return `<div class="ring ${cls}${has ? '' : ' none'}" data-ring="${has ? value : ''}" role="img" aria-label="${has ? value + ' out of 100' : 'Not scored'}">` +
      '<div class="rt"></div><div class="rh r"><i></i></div><div class="rh l"><i></i></div>' +
      `<b class="rn" aria-hidden="true"><span>${has ? 0 : '?'}</span>${sub ? `<small>${RLS.esc(sub)}</small>` : ''}</b></div>`;
  };
  const setRing = (el, v) => {
    const a = Math.max(0, Math.min(100, v)) * 3.6;
    const [r, l] = el.querySelectorAll('.rh i');
    r.style.transform = `rotate(${Math.min(a, 180)}deg)`;
    l.style.transform = `rotate(${Math.max(a - 180, 0)}deg)`;
    // an arc at 0 deg still leaves a hairline on the clip edge: hide it until it has length
    r.style.opacity = a > 0 ? 1 : 0;
    l.style.opacity = a > 180 ? 1 : 0;
    el.querySelector('.rn span').textContent = Math.round(v);
  };
  const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  RLS.animateRing = (el, from = 0) => {
    const to = parseFloat(el.dataset.ring);
    if (!RLS.num(to)) return;
    if (RLS.still() || from === to) { setRing(el, to); return; }
    const t0 = performance.now(), dur = 600;
    const step = (now) => {
      const p = expo((now - t0) / dur);
      setRing(el, from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
    };
    setRing(el, from);
    requestAnimationFrame(step);
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
  RLS.observe = (root = document) => {
    const els = [...root.querySelectorAll('.rv:not(.on), [data-ring]:not([data-done]), .bar:not(.on), .share-bar:not(.on), .scale:not(.on), .plan90:not(.on), .gap:not(.on)')];
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
  function landing() {
    const $ = (s) => document.querySelector(s);
    const step1 = $('#step1'), step2 = $('#step2'), li = $('#li'), liErr = $('#li-err');
    const preview = $('#preview'), hero = $('.s-hero');
    let example = null;
    try { example = JSON.parse($('#example-run').textContent); } catch (_) { example = null; }
    let picked = null;

    /* the card next to the form: a real finished run when we have one, otherwise an empty result card
       that fills in the visitor's own profile link as they type. No invented numbers. */
    function drawPreview(slug) {
      const ex = example && typeof example === 'object' && example.pillars ? example : null;
      const rows = RLS.PILLARS.map((p) => {
        const v = ex && RLS.num(ex.pillars[p.id]) ? ex.pillars[p.id] : null;
        return `<li><b>${p.name}</b><div class="bar"><i style="--w:${v == null ? 0 : v / 100}"></i></div><em>${v == null ? '?' : v}</em></li>`;
      }).join('');
      const photo = ex && RLS.safeUrl(ex.photo) ? `<img class="av" src="${RLS.esc(RLS.safeUrl(ex.photo))}" alt="" referrerpolicy="no-referrer">` : '<span class="av" aria-hidden="true"></span>';
      const who = ex ? RLS.esc(ex.name) : 'Your Revenue Line Score';
      const sub = ex ? RLS.esc(ex.headline || '') : (slug ? `linkedin.com/in/${RLS.esc(slug)}` : 'linkedin.com/in/your-name');
      const tier = ex ? RLS.esc(RLS.TIERS[ex.tier] || '') : 'Hobby, side channel or revenue line?';
      const tierNote = ex ? 'A real result, scored from the profile' : 'Scored from your real profile, posts and engagers';
      preview.innerHTML = `<div class="top">${photo}<div class="nm"><b>${who}</b><span class="${slug ? 'ok' : ''}" id="pv-slug">${sub}</span></div></div>` +
        `<div class="mid">${RLS.ringHTML(ex ? ex.overall : null, 'ink')}<div class="tier">${tier}<small>${tierNote}</small></div></div>` +
        `<ul>${rows}</ul>`;
      if (!ex) preview.querySelectorAll('.bar').forEach((b) => b.classList.add('on'));
      RLS.observe(preview);
    }
    drawPreview('');

    let typing;
    li.addEventListener('input', () => {
      li.removeAttribute('aria-invalid'); liErr.textContent = '';
      clearTimeout(typing);
      typing = setTimeout(() => {
        if (example) return;
        const c = RLS.checkLinkedin(li.value);
        const el = $('#pv-slug');
        if (el) { el.textContent = c.slug ? `linkedin.com/in/${c.slug}` : 'linkedin.com/in/your-name'; el.classList.toggle('ok', !!c.slug); }
      }, 120);
    });

    const swap = (from, to, focus) => {
      const show = () => {
        hero.classList.toggle('at2', to === step2);
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

    step1.addEventListener('submit', (e) => {
      e.preventDefault();
      const c = RLS.checkLinkedin(li.value);
      if (c.error) { liErr.textContent = c.error; li.setAttribute('aria-invalid', 'true'); li.focus(); return; }
      picked = c;
      $('#li-show').textContent = `linkedin.com/in/${c.slug}`;
      swap(step1, step2, $('#email'));
    });
    $('#change').addEventListener('click', () => swap(step2, step1, li));
    $('#to-top').addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: RLS.still() ? 'auto' : 'smooth' });
      setTimeout(() => (step1.hidden ? $('#email') : li).focus({ preventScroll: true }), RLS.still() ? 0 : 500);
    });

    const EMAIL_RX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
    const KEYS = ['revenue', 'team', 'source', 'goal'];
    step2.addEventListener('change', (e) => {
      const q = e.target.closest('.q');
      if (q) { q.removeAttribute('aria-invalid'); if (!step2.querySelector('.q[aria-invalid]')) $('#q-err').textContent = ''; }
    });
    $('#email').addEventListener('input', () => { $('#email').removeAttribute('aria-invalid'); $('#email-err').textContent = ''; });

    step2.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#email').value.trim();
      const answers = {};
      let firstBad = null;
      if (!email || email.length > 254 || !EMAIL_RX.test(email)) {
        $('#email-err').textContent = 'Check your email. We send your result there.';
        $('#email').setAttribute('aria-invalid', 'true');
        firstBad = $('#email');
      }
      const missing = [];
      KEYS.forEach((k) => {
        const on = step2.querySelector(`input[name="${k}"]:checked`);
        const q = step2.querySelector(`.q[data-q="${k}"]`);
        if (on) { answers[k] = on.value; q.removeAttribute('aria-invalid'); } else { missing.push(q); q.setAttribute('aria-invalid', 'true'); }
      });
      $('#q-err').textContent = missing.length ? (missing.length === 1 ? 'Pick one answer for the question in red.' : 'Pick one answer for each question in red.') : '';
      if (!firstBad && missing.length) firstBad = missing[0].querySelector('input');
      if (firstBad) { firstBad.focus(); return; }

      let website = $('#website').value.trim();
      if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
      let session = null;
      try { session = (JSON.parse(localStorage.getItem('ios_tracking_v1')) || {}).session_id || null; } catch (_) { session = null; }
      const body = { linkedin_url: picked.url, email, answers, consent_nurture: $('#consent').checked };
      if (website) body.website = website;
      if (session) body.session_id = session;

      const go = $('#go'), sendErr = $('#send-err');
      sendErr.textContent = '';
      go.disabled = true; go.firstChild.textContent = 'Starting ';
      let res, out = {};
      try {
        res = await fetch(RLS.SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        out = await res.json().catch(() => ({}));
      } catch (_) { res = null; }
      if (res && res.ok && typeof out.token === 'string') {
        try { sessionStorage.setItem('rls:' + out.token, JSON.stringify({ email, over_cap: !!out.over_cap })); } catch (_) { /* memory only */ }
        location.href = '/score/r/?t=' + encodeURIComponent(out.token);
        return;
      }
      go.disabled = false; go.firstChild.textContent = 'Score my LinkedIn ';
      const code = out && out.error;
      if (code === 'linkedin_url') { swap(step2, step1, li); liErr.textContent = 'We could not use that LinkedIn link. Copy it again from your profile.'; li.setAttribute('aria-invalid', 'true'); }
      else if (code === 'email') { $('#email-err').textContent = 'Check your email. We send your result there.'; $('#email').setAttribute('aria-invalid', 'true'); $('#email').focus(); }
      else if (code === 'answers') { $('#q-err').textContent = 'Pick one answer for each question.'; }
      else if (res && res.status === 429) sendErr.textContent = 'You have started a few scores in the last hour. Try again a little later.';
      else sendErr.textContent = 'Something went wrong on our side. Try again in a minute.';
    });
  }
})();
