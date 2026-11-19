/* Analogy scenes for the homepage: rain (#az-rain), shop window (#az-win), shop assistant (#az-shop).
   Each plays once when it scrolls into view and pauses while off screen.
   Reduced motion: the end state renders at once. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const EXPO = 'cubic-bezier(.16,1,.3,1)', BACK = 'cubic-bezier(.34,1.45,.64,1)', INOUT = 'cubic-bezier(.65,0,.35,1)', WALK = 'cubic-bezier(.4,0,.6,1)';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // time only runs while the stage is on screen
  function wait(ms, tok) {
    if (RM) return Promise.resolve().then(() => { if (tok.dead) throw 'stop'; });
    return new Promise((res, rej) => {
      let left = ms, last = performance.now();
      const tick = () => {
        if (tok.dead) return rej('stop');
        const now = performance.now(); if (!tok.st._hidden) left -= now - last; last = now;
        if (left <= 0) res(); else setTimeout(tick, Math.min(40, left));
      };
      tick();
    });
  }
  function A(el, kf, o = {}) {
    const a = el.animate(kf, Object.assign({ fill: 'forwards', easing: EXPO }, o, { duration: RM ? 1 : (o.duration || 400), delay: RM ? 0 : (o.delay || 0) }));
    const st = el.closest('.az-stage'); if (st && st._hidden) a.pause();
    return a.finished.then(() => {}, () => new Promise(() => {}));
  }
  const op = el => +getComputedStyle(el).opacity;
  const fade = (el, to, d = 400, o = {}) => A(el, [{ opacity: op(el) }, { opacity: to }], Object.assign({ duration: d, easing: 'ease' }, o));
  const T = (x, y, s) => `translate(${x}px,${y}px) ${s}`;
  function show(el, from, d = 600, o = {}) { const b = el._x !== undefined ? T(el._x, el._y, el._s) : ''; return A(el, [{ opacity: 0, transform: (b + ' ' + from).trim() }, { opacity: 1, transform: b || 'none' }], Object.assign({ duration: d, easing: BACK }, o)); }
  function rel(st, el) { const R = st.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, l: r.left - R.left, t: r.top - R.top, w: r.width, h: r.height }; }
  function put(el, x, y, suf = 'translate(-50%,-50%)') { el._x = x; el._y = y; el._s = suf; const t = T(x, y, suf); el.style.transform = t; el.animate([{ transform: t }, { transform: t }], { duration: 0, fill: 'forwards' }); }
  function move(el, x, y, d, ease = WALK, suf) { suf = suf || el._s || 'translate(-50%,-50%)'; const f = T(el._x, el._y, suf), t = T(x, y, suf); el._x = x; el._y = y; el._s = suf; return A(el, [{ transform: f }, { transform: t }], { duration: d, easing: ease }); }
  async function walk(el, x, y, speed = .32) { const d = Math.max(250, Math.hypot(x - el._x, y - el._y) / speed); el.classList.add('az-walk'); await move(el, x, y, d, 'cubic-bezier(.3,0,.7,1)'); el.classList.remove('az-walk'); }
  function clearAnims(st) { st.getAnimations({ subtree: true }).forEach(a => { if (typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation) return; if (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) return; a.cancel(); }); }
  function cap(st, t) {
    const c = $('.az-cap', st); if (c.textContent === t) return; if (RM) { c.textContent = t; return; }
    c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(4px)' }], { duration: 160, fill: 'forwards' }).finished.then(() => { c.textContent = t; c.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EXPO, fill: 'forwards' }); }).catch(() => {});
  }
  function el(cls, parent, html = '') { const e = document.createElement('div'); e.className = cls; if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }

  const PERSON = `<svg viewBox="0 0 40 100" aria-hidden="true"><ellipse class="sh" cx="20" cy="97" rx="15" ry="3"/>
<g class="lg l"><rect x="11.5" y="58" width="7.5" height="38" rx="3.75"/></g><g class="lg r"><rect x="21" y="58" width="7.5" height="38" rx="3.75"/></g>
<g class="arm a1"><rect x="2.5" y="27" width="7" height="31" rx="3.5"/></g>
<path class="bd" d="M8 35 Q8 24 20 24 Q32 24 32 35 L32 63 Q32 66 29 66 L11 66 Q8 66 8 63 Z"/>
<g class="apron"><path d="M12.5 37 H27.5 V63 Q27.5 65 25.5 65 H14.5 Q12.5 65 12.5 63 Z" fill="#E9E3D6"/><path d="M14 37 L17 26 M26 37 L23 26" stroke="#E9E3D6" stroke-width="1.6" fill="none"/><rect x="21.5" y="41" width="4" height="2.6" rx=".6" fill="#C8361B"/></g><g class="arm a2"><rect x="30.5" y="27" width="7" height="31" rx="3.5"/></g>
<circle class="hd" cx="20" cy="12.5" r="9.5"/></svg>`;
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * (1 + k)))); return '#' + [f(n >> 16), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  function person(st, color, h) { const p = el('az-fig az-abs', st, PERSON); p.style.setProperty('--c', color); p.style.setProperty('--c2', shade(color, -.12)); p.style.height = h + 'px'; return p; }

  function scene(id, run, setup) {
    const sec = document.getElementById(id); if (!sec) return;
    const st = $('.az-stage', sec); let tok = { dead: true }, started = false, lastW = 0;
    st._hidden = false;
    if (setup) setup(st);
    const start = () => {
      tok.dead = true; tok = { dead: false, st }; started = true; lastW = st.clientWidth;
      clearAnims(st); $('.az-cap', st).textContent = '';
      run(st, tok).catch(e => { if (e !== 'stop') console.error(e); });
    };
    const rp = $('.az-replay', sec); if (rp) rp.onclick = start;
    if (RM) { st.classList.add('az-on'); requestAnimationFrame(start); }
    else new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.disconnect(); st.classList.add('az-on'); start(); } }), { threshold: .45 }).observe(st);
    // pause everything while off screen
    new IntersectionObserver(es => es.forEach(e => {
      const hid = !RM && !e.isIntersecting; if (hid === st._hidden) return; st._hidden = hid;
      st.getAnimations({ subtree: true }).forEach(a => { try { hid ? a.pause() : a.play(); } catch (_) {} });
    }), { threshold: 0 }).observe(st);
    let rt; new ResizeObserver(() => { if (!started || Math.abs(st.clientWidth - lastW) < 4) return; clearTimeout(rt); rt = setTimeout(start, 200); }).observe(st);
  }

  /* ---------- rain ---------- */
  const GLASS = i => `<svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><clipPath id="azgc${i}"><path d="M14 8 L86 8 L79 130 Q78 135 73 135 L27 135 Q22 135 21 130 Z"/></clipPath>
<linearGradient id="azwg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E1D2" stop-opacity=".5"/><stop offset="1" stop-color="#C9B9A0" stop-opacity=".22"/></linearGradient></defs>
<ellipse cx="50" cy="137" rx="38" ry="4" fill="rgba(0,0,0,.45)"/>
<g clip-path="url(#azgc${i})"><g class="lvl" style="transform:translateY(135px)"><g class="wv"><path d="M-100 4 Q-87.5 0 -75 4 T-50 4 T-25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4 V200 H-100 Z" fill="url(#azwg${i})"/><path d="M-100 4 Q-87.5 0 -75 4 T-50 4 T-25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4" fill="none" stroke="rgba(243,239,230,.75)" stroke-width="1.6"/></g></g></g>
<path d="M14 8 L86 8 L79 130 Q78 135 73 135 L27 135 Q22 135 21 130 Z" fill="rgba(243,239,230,.035)" stroke="rgba(243,239,230,.55)" stroke-width="2"/>
<path d="M24 18 L30 118" stroke="rgba(255,255,255,.16)" stroke-width="4" stroke-linecap="round"/><ellipse cx="50" cy="8" rx="36" ry="2.4" fill="none" stroke="rgba(243,239,230,.35)" stroke-width="1.2"/></svg><div class="az-wk az-mono">Week ${i + 1}</div>`;
  const CLOUD = `<svg viewBox="0 0 220 110" aria-hidden="true"><defs><linearGradient id="azcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A8278"/><stop offset=".6" stop-color="#5C554D"/><stop offset="1" stop-color="#3E3934"/></linearGradient></defs><g fill="url(#azcg)"><circle cx="62" cy="62" r="34"/><circle cx="108" cy="46" r="40"/><circle cx="154" cy="60" r="32"/><circle cx="186" cy="74" r="20"/><circle cx="34" cy="76" r="18"/><rect x="30" y="62" width="170" height="32" rx="16"/></g><g fill="#A39E93" opacity=".35"><circle cx="100" cy="30" r="16"/><circle cx="70" cy="44" r="10"/><circle cx="150" cy="44" r="9"/></g></svg>`;
  const TAP = `<svg viewBox="0 0 80 96" aria-hidden="true"><rect x="24" y="0" width="26" height="12" rx="4" fill="#6B675F"/><rect x="31" y="10" width="12" height="32" fill="#CFC8BB"/><rect x="18" y="38" width="44" height="18" rx="9" fill="#E8E2D6"/><rect x="47" y="48" width="13" height="30" rx="4" fill="#E8E2D6"/><rect x="45" y="76" width="17" height="6" rx="2" fill="#A39E93"/>
<g class="handle"><rect x="14" y="27" width="34" height="7" rx="3.5" fill="#C8361B"/><circle cx="31" cy="34" r="5" fill="#A39E93"/></g></svg>`;
  function gGeo(st, g) { const s = $('svg', g), r = rel(st, s), k = Math.min(r.w / 100, r.h / 140), ox = r.l + (r.w - 100 * k) / 2, oy = r.t + r.h - 140 * k; return { k, x: ox + 50 * k, surf: L => oy + (135 - L * 125) * k, l: ox + 14 * k, r: ox + 86 * k }; }

  scene('az-rain', async (st, tok) => {
    $$('.az-drop,.az-splash,.az-cloud,.az-tap,.az-stream,.az-thread', st).forEach(e => e.remove());
    const gls = $$('.az-gl', st), lv = gls.map(g => $('.lvl', g)), wk = gls.map(g => $('.az-wk', g)), L = [0, 0, 0, 0];
    lv.forEach(l => { l.style.transform = 'translateY(135px)'; }); wk.forEach(w => w.classList.remove('az-lit'));
    const W = st.clientWidth, H = st.clientHeight, geo = gls.map(g => gGeo(st, g));
    const setL = (i, to, d) => { const f = L[i]; L[i] = to; return A(lv[i], [{ transform: `translateY(${135 - f * 125}px)` }, { transform: `translateY(${135 - to * 125}px)` }], { duration: d, easing: 'cubic-bezier(.3,.2,.4,1)' }); };
    const cy0 = W < 520 ? H * .1 : H * .035, cl = el('az-cloud az-abs', st, CLOUD), cw = cl.getBoundingClientRect().width;
    const cx = i => clamp(geo[i].x, cw / 2 + W * .02, W - cw / 2 - W * .02); // fix: cloud never clips the stage edge
    put(cl, -cw, cy0, 'translate(-50%,0)');
    const rail = $('.az-rail', st); rail.style.transform = 'scaleX(0)';
    const drop = (x, y0, y1) => { const d = el('az-drop az-abs', st); put(d, x, y0, 'translate(-50%,-100%)'); move(d, x, y1, RM ? 1 : (y1 - y0) / 0.9, 'cubic-bezier(.55,0,1,.45)').then(() => { d.remove(); const s = el('az-splash az-abs', st); put(s, x, y1, 'translate(-50%,-50%)'); A(s, [{ opacity: 1, transform: T(x, y1, 'translate(-50%,-50%) scale(.3)') }, { opacity: 0, transform: T(x, y1, 'translate(-50%,-50%) scale(1.4)') }], { duration: 500, easing: 'ease-out' }).then(() => s.remove()); }); };
    const rainOn = (i, ms, density) => new Promise(res => {
      if (RM) return res(); let left = ms, last = performance.now();
      const tick = () => {
        if (tok.dead) return res(); const now = performance.now();
        if (st._hidden) { last = now; return setTimeout(tick, 80); }
        left -= now - last; last = now; if (left <= 0) return res();
        const g = geo[i], w = cw * .62;
        for (let n = 0; n < density; n++) { const x = cl._x + rnd(-w / 2, w / 2), inG = x > g.l + 4 && x < g.r - 4; drop(x, cl._y + cw * .4, inG ? g.surf(L[i]) : H * .8 + rnd(0, H * .06)); }
        setTimeout(tick, 55);
      };
      tick();
    });
    const cloudTo = (i, d) => move(cl, cx(i), cy0, d, INOUT);
    cap(st, 'Referrals arrive like weather.');
    await wait(300, tok); await cloudTo(0, 1000);
    setL(0, .5, 1300); wk[0].classList.add('az-lit'); cap(st, 'Week 1 gets a downpour.'); await rainOn(0, 1300, 3);
    await wait(200, tok); cap(st, 'Week 2 gets nothing.'); await cloudTo(1, 900); await wait(400, tok);
    await cloudTo(2, 800); setL(2, .3, 1000); wk[2].classList.add('az-lit'); cap(st, 'Week 3, a shower.'); await rainOn(2, 1000, 2);
    await wait(200, tok); await cloudTo(3, 800); cap(st, 'Week 4, dry again.'); await wait(300, tok);
    await move(cl, W + cw, cy0, 900, 'cubic-bezier(.5,0,.8,.5)');
    cap(st, 'Two good weeks, two dry ones. You never know which.'); await wait(1100, tok);
    cap(st, 'So we turn on a tap that runs every week.');
    await A(rail, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 600, easing: INOUT });
    const tap = el('az-tap az-abs', st, TAP), rr = rel(st, rail); put(tap, geo[0].x, rr.t - 2, 'translate(-67%,0)'); // fix: fades in over week 1, never off stage
    await A(tap, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    const handle = $('.handle', tap);
    for (let i = 0; i < 4; i++) {
      if (i) await move(tap, geo[i].x, rr.t - 2, 500, INOUT);
      const tb = tap.getBoundingClientRect(), R = st.getBoundingClientRect(), sx = geo[i].x, sy = tb.top - R.top + tb.width * (82 / 80);
      await A(handle, [{ transform: 'rotate(0)' }, { transform: 'rotate(-38deg)' }], { duration: 300, easing: BACK });
      const target = Math.min(.92, L[i] + .4), s = el('az-stream', st); Object.assign(s.style, { left: sx + 'px', top: sy + 'px', height: Math.max(4, geo[i].surf(target) - sy) + 'px' });
      await A(s, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 260, easing: 'cubic-bezier(.5,0,1,.6)' });
      wk[i].classList.add('az-lit'); await setL(i, target, 700);
      A(handle, [{ transform: 'rotate(-38deg)' }, { transform: 'rotate(0)' }], { duration: 260 });
      await A(s, [{ transform: 'scaleY(1)', transformOrigin: '50% 100%', opacity: 1 }, { transform: 'scaleY(0)', transformOrigin: '50% 100%', opacity: .6 }], { duration: 240, easing: 'ease-in' }); s.remove();
    }
    await wait(250, tok); await fade(tap, 0, 300);
    const th = el('az-thread', st), ty = geo[1].surf(.4), x0 = geo[0].l - W * .02, x1 = geo[3].r + W * .02;
    Object.assign(th.style, { left: x0 + 'px', width: x1 - x0 + 'px', top: ty - 1 + 'px' });
    cap(st, 'Every week has something in it now. Referrals land on top.');
    await A(th, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1100, easing: INOUT });
  }, st => { const g = $('.az-glasses', st); for (let i = 0; i < 4; i++) el('az-gl', g, GLASS(i)); });

  /* ---------- shop window ---------- */
  scene('az-win', async (st, tok) => {
    $$('.az-fig,.az-think', st).forEach(e => e.remove());
    const dm = $('.az-dm', st), rp = $('.az-reply', st), gl = $('.az-glass', st), sign = $('.az-sign', st), door = $('.az-door', st), leaf = $('.az-leaf', st), bell = $('.az-bell', st), pool = $('.az-pool', st), nws = $$('.az-nw', st);
    [dm, rp].forEach(e => { e.style.opacity = 0; }); gl.classList.remove('az-lit'); sign.classList.remove('az-lit'); door.classList.remove('az-lit'); pool.style.opacity = 0;
    nws.forEach(n => { n.style.opacity = 0; n.style.transform = 'translateY(30%) rotate(-6deg)'; }); leaf.style.transform = 'none';
    const W = st.clientWidth, H = st.clientHeight, street = H * .9, g = rel(st, gl), dr = rel(st, door);
    const dmTxt = n => `<small>LinkedIn · now</small>Hey ${n}, may I send you a short review of your store?`;
    let p = person(st, '#8C8378', H * .3); put(p, W + 40, street, 'translate(-50%,-100%)');
    const think = (txt, d = 1100) => { const t = el('az-think az-paper az-abs', st); t.textContent = txt; const pr = p.getBoundingClientRect(), R = st.getBoundingClientRect(); put(t, pr.left - R.left + pr.width * .75, pr.top - R.top - 6, 'translate(-10%,-100%)'); show(t, 'scale(.6) translateY(8px)', 400); return wait(d, tok).then(() => fade(t, 0, 250)).then(() => t.remove()); };
    dm.innerHTML = dmTxt('Alex'); cap(st, 'Alex gets your message.'); await wait(300, tok);
    show(dm, 'translateY(-14px) scale(.94)', 600); await wait(1500, tok);
    cap(st, 'First thing Alex does is look at your profile.');
    await walk(p, g.x + W * .02, street); await wait(200, tok);
    await think('Hmm.', 1000); cap(st, 'Not much in the window, so Alex walks on.');
    fade(dm, 0, 400); await walk(p, W + 60, street); p.style.display = 'none'; await wait(300, tok);
    cap(st, 'We fill the window with posts from your calls and opinions.');
    gl.classList.add('az-lit'); sign.classList.add('az-lit'); door.classList.add('az-lit'); fade(pool, 1, 900);
    for (const n of nws) { await wait(260, tok); A(n, [{ opacity: 0, transform: 'translateY(30%) rotate(-6deg)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: BACK }); }
    await wait(1100, tok);
    p = person(st, '#8FA0A6', H * .3); put(p, W + 40, street, 'translate(-50%,-100%)');
    dm.innerHTML = dmTxt('Sam'); show(dm, 'translateY(-14px) scale(.94)', 600);
    cap(st, 'Next time someone checks, they stay and read.');
    await walk(p, g.x + W * .02, street); await think('Oh, nice.', 1100);
    await walk(p, dr.x, street);
    A(leaf, [{ transform: 'perspective(500px) rotateY(0)' }, { transform: 'perspective(500px) rotateY(-72deg)' }], { duration: 600, easing: EXPO });
    A(bell, [{ transform: 'rotate(0)' }, { transform: 'rotate(22deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(0)' }], { duration: 1100, easing: 'ease-out' });
    await wait(300, tok); await A(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
    A(leaf, [{ transform: 'perspective(500px) rotateY(-72deg)' }, { transform: 'perspective(500px) rotateY(0)' }], { duration: 600, easing: EXPO });
    fade(dm, 0, 300); await wait(200, tok); show(rp, 'translateY(-14px) scale(.94)', 600); cap(st, 'And Sam replies.');
  }, st => { const s = $('.az-awn svg', st); let h = ''; for (let i = 0; i < 10; i++) { const c = i % 2 ? '#6B5A48' : '#D9D0C2'; h += `<rect x="${i * 20}" y="3" width="20" height="18" fill="${c}"/><path d="M${i * 20} 20 a10 9 0 0 0 20 0 z" fill="${c}"/>`; } s.innerHTML = '<rect x="0" y="0" width="200" height="4" fill="#3A352F"/>' + h; });

  /* ---------- shop assistant ---------- */
  const PCOL = ['#3A342E', '#4A433B', '#5C544A', '#6E655A', '#8A6F4E', '#A39E93', '#56504A', '#7D6A52', '#2E2925'];
  scene('az-shop', async (st, tok) => {
    $$('.az-fig,.az-item,.az-bub,.az-pick', st).forEach(e => e.remove()); $$('.az-pr', st).forEach(p => p.classList.remove('az-gone'));
    const W = st.clientWidth, H = st.clientHeight, small = W < 520, floor = H * (small ? .845 : .9), fh = H * (small ? .33 : .36);
    const xs = small ? [.12, .31, .5, .69, .88] : [.1, .26, .42, .58, .74, .9];
    const cols = ['#857B6F', '#6E665C', '#958C80', '#5C554D', '#A39E93', '#7D7468'];
    // pickers are spread out so their tags never overlap
    const pickC = small ? [0, 2, 4] : [1, 3, 5], pickTone = ['#B9A27C', '#8FA0A6', '#A88C8C'];
    const SIG = [
      { ico: '♥', who: 'Priya', what: 'liked a post about repeat orders', say: 'Hi Priya, may I send you a short review of how your store brings customers back?' },
      { ico: '💬', who: 'Marco', what: 'commented on a post about checkout drop-off', say: 'Hi Marco, may I send you a short review of your checkout?' },
      { ico: '♥', who: 'Ana', what: 'liked a post about rising ad costs', say: 'Hi Ana, may I send you a few ideas to bring your ad costs down?' }
    ];
    const cs = xs.map((x, i) => { const c = person(st, pickC.includes(i) ? pickTone[pickC.indexOf(i)] : cols[i], fh); put(c, x * W + rnd(-4, 4), floor - H * .03 + rnd(-3, 3), 'translate(-50%,-100%)'); return c; });
    cs.forEach((c, i) => { if (!pickC.includes(i)) c.classList.add('az-fidget'); c.style.animationDelay = (-i * .3) + 's'; });
    // the shop assistant (apron) walks in the foreground lane, slightly bigger
    const lane = floor + H * (small ? .01 : .035), as = person(st, '#C8361B', fh * 1.1); as.style.zIndex = 10; put(as, W + 60, lane, 'translate(-50%,-100%)');
    as.classList.add('az-staff');
    cap(st, 'A shop full of people. Most are just looking.'); await wait(1700, tok);
    cap(st, 'A few pick something up. On LinkedIn, that’s a like or a comment.');
    const chips = [], prs = $$('.az-pr', st), low = $$('.az-row', st)[2];
    for (const ci of pickC) {
      const c = cs[ci], cr = rel(st, c), sg = SIG[chips.length]; let best = null, bd = 1e9;
      prs.forEach(pr => { if (pr.classList.contains('az-gone') || pr.closest('.az-row') !== low) return; const r = rel(st, pr), d = Math.abs(r.x - (cr.x + cr.w * .4)); if (d < bd) { bd = d; best = pr; } });
      c.classList.add('az-reach'); await wait(280, tok);
      const r = rel(st, best), it = el('az-item az-abs', st); it.style.background = best.style.background; it.style.width = r.w + 'px'; it.style.height = r.h + 'px'; it.style.borderRadius = getComputedStyle(best).borderRadius; best.classList.add('az-gone');
      const hx = cr.l + cr.w * .92, hy = cr.t + cr.h * .2; put(it, r.x, r.y);
      await A(it, [{ transform: T(r.x, r.y, 'translate(-50%,-50%)') }, { transform: T((r.x + hx) / 2, Math.min(r.y, hy) - H * .04, 'translate(-50%,-50%) rotate(-10deg)'), offset: .5 }, { transform: T(hx, hy, 'translate(-50%,-50%) rotate(8deg) scale(.85)') }], { duration: 650, easing: 'cubic-bezier(.4,0,.3,1)' });
      c.classList.remove('az-reach'); c.classList.add('az-halo');
      const ch = el('az-pick az-paper az-abs', st); ch.innerHTML = `<i style="background:${pickTone[chips.length]}"></i><span><b>${sg.who}</b> ${sg.what}</span><em></em>`;
      const cw = ch.getBoundingClientRect().width; const tx = small ? cr.x : W * [1 / 6, .5, 5 / 6][chips.length]; // desktop: three even columns, never overlapping
      put(ch, clamp(tx, cw / 2 + W * .02, W - cw / 2 - W * .02), cr.t - H * (small && chips.length === 1 ? .27 : .05), 'translate(-50%,-100%)'); // phone: middle tag sits higher so the three never overlap
      show(ch, 'scale(.6) translateY(8px)', 420); chips.push(ch);
      await A(it, [{ transform: T(hx, hy, 'translate(-50%,-50%) rotate(8deg) scale(.85)') }, { transform: T(cr.l + cr.w * .9, cr.t + cr.h * .62, 'translate(-50%,-50%) rotate(0deg) scale(.8)') }], { duration: 450, easing: EXPO });
      await wait(450, tok);
    }
    await wait(900, tok); cap(st, 'A good shop assistant goes to those three first.');
    for (const ci of pickC) {
      const c = cs[ci], k = pickC.indexOf(ci), side = c._x > W * .55 ? -1 : 1; // approach from the open side, never off the edge
      await walk(as, c._x + side * W * (small ? .07 : .055), lane, .45);
      const b = el('az-bub az-r az-paper az-abs', st); b.textContent = SIG[k].say;
      const ar = rel(st, as), bw = b.getBoundingClientRect().width;
      put(b, clamp(ar.x, bw / 2 + W * .03, W - bw / 2 - W * .03), ar.t - 8, 'translate(-50%,-100%)');
      chips.forEach(x => fade(x, 0, 200));
      await show(b, 'scale(.7) translateY(10px)', 420); c.classList.add('az-nod'); await wait(2100, tok); await fade(b, 0, 220); b.remove(); c.classList.remove('az-nod');
      chips.forEach(x => fade(x, 1, 200));
    }
    await wait(300, tok); cap(st, 'They hear from you first, with a review made for their business.');
  }, st => {
    $$('.az-row', st).forEach((row, r) => { const n = 9 + (r % 2); for (let i = 0; i < n; i++) { const p = el('az-pr', row), kind = (i * 7 + r * 3) % 5; p.style.width = [5.2, 3.6, 2.6, 4.4, 3.2][kind] + 'cqw'; p.style.height = [6.4, 7.6, 9, 5.4, 7][kind] + 'cqw'; p.style.background = PCOL[(i * 5 + r * 2) % PCOL.length]; if (kind === 1) p.classList.add('az-jar'); if (kind === 2) p.classList.add('az-bt'); } });
  });
  /* ---------- step 4 LinkedIn thread plays out once ---------- */
  const lk = document.getElementById('lk');
  if (lk && !RM) {
    const ms = $$('.lk-msg', lk), ty = $('.lk-typing', lk), body = $('.lk-body', lk), me = ms[0].querySelector('.lk-h b').textContent;
    let vis = false; new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(lk);
    const sleep = ms => new Promise(r => { let left = ms, last = performance.now(); const t = () => { const n = performance.now(); if (vis) left -= n - last; last = n; if (left <= 0) r(); else setTimeout(t, 40); }; t(); });
    new IntersectionObserver((es, o) => es.forEach(async e => {
      if (!e.isIntersecting) return; o.disconnect(); vis = true;
      await sleep(500);
      for (const m of ms) {
        const them = m.querySelector('.lk-h b').textContent !== me;
        if (them) { ty.style.top = m.offsetTop + 'px'; ty.classList.add('on'); await sleep(1000); ty.classList.remove('on'); }
        m.classList.add('on'); await sleep(them ? 700 : 900);
      }
    }), { threshold: .4 }).observe(lk);
  }
})();
