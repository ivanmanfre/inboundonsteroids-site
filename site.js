/* InboundOnSteroids studio mockup. Motion per film DESIGN.md: blur/overshoot entries, whip + zoom seams,
   camera creep, red thread drawn on with scroll, founder cutout over the type. Transforms/opacity only on scroll. */
(() => {
  const html = document.documentElement;
  const RM = html.classList.contains('rm');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mobile = () => innerWidth <= 860;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- split display phrases into words (spoken-onset feel) ---------- */
  function split(root) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          if (parts.length === 1 && !parts[0]) return;
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = p; frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(root);
  }
  $$('.seam').forEach((s) => split(s.querySelector('.disp') || s));

  /* ---------- portrait versions (?ivan=a..f for the hero, ?about=a..f for the about block) ---------- */
  const PORTRAITS = window.IVAN_PORTRAITS || {};
  const qs = new URLSearchParams(location.search);
  [['.hero', qs.get('ivan')], ['.about', qs.get('about')]].forEach(([sel, k]) => {
    const v = k && PORTRAITS[k]; if (!v) return;
    const cut = document.querySelector(sel + ' [data-cut]'), img = cut.querySelector('img');
    img.src = `assets/img/${v.src}-1100.webp`; img.srcset = `assets/img/${v.src}-640.webp 640w, assets/img/${v.src}-1100.webp 1100w`;
    Object.assign(cut.dataset, { ratio: v.ratio, headx: v.headx, headw: v.headw });
  });

  /* ---------- fit big display lines to the measure ---------- */
  function fit() {
    $$('[data-fit]').forEach((h) => {
      h.style.fontSize = '100px';
      const lts = $$('.lt', h);
      const maxW = Math.max(...lts.map((l) => l.offsetWidth));
      const target = h.clientWidth * parseFloat(h.dataset.fit);
      h.style.fontSize = clamp(100 * target / maxW, 40, +h.dataset.fitMax || 200) + 'px';
    });
  }

  /* ---------- founder cutout: head covers at most the bottom third of the last line ---------- */
  const cv = document.createElement('canvas').getContext('2d');
  function offs(el, stop) { let x = 0, y = 0; while (el && el !== stop) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; }
  function placeCuts() {
    $$('[data-stage]').forEach((sec) => {
      const cam = $('.cam', sec), h = $('[data-fit]', sec), last = $('.last', h), cut = $('[data-cut]', sec), tag = $('[data-tag]', sec), copy = $('[data-copy]', sec);
      const fs = parseFloat(getComputedStyle(h).fontSize);
      cv.font = `800 ${fs}px IMDisplay`;
      const m = cv.measureText('H9');
      const o = offs(last, cam);
      const baseline = o.y + m.fontBoundingBoxAscent;
      const capH = m.actualBoundingBoxAscent;
      const ratio = +cut.dataset.ratio, hw = +cut.dataset.headw || .42;
      const camW = cam.clientWidth;
      // size by the head, so portraits with different framing land at the same scale over the type
      const w = (mobile() ? clamp(innerWidth * .277, 92, 139) : clamp(fs * 1.47, 151, 260)) / hw;
      const hx = parseFloat(cut.dataset.headx);
      const lastRight = o.x + last.offsetWidth;
      let left = lastRight - fs * (mobile() ? .12 : -.02) - hx * w;
      left = clamp(left, camW * .25, camW - w * (mobile() ? .8 : .62));
      const top = baseline - capH * .28;
      const hBottom = offs(h, cam).y + h.offsetHeight;
      // how much of him shows below the type
      let showBelow;
      if (sec.classList.contains('hero')) {
        copy.style.marginTop = '';
        copy.style.maxWidth = '';
        if (mobile()) { showBelow = Math.max(w * ratio * .55, w * hw * 2.2); copy.style.marginTop = Math.max(0, top + showBelow - hBottom - 30) + 'px'; }
        else {
          copy.style.maxWidth = clamp(left - 40, 420, 640) + 'px';
          const stageBottom = cam.offsetHeight + copy.offsetHeight + 40;
          showBelow = stageBottom - top;
        }
      } else {
        showBelow = Math.max(w * ratio * (mobile() ? .5 : .62), w * hw * (mobile() ? 2.1 : 2.4));
        copy.style.marginTop = mobile() ? Math.max(0, top + showBelow - hBottom - 40) + 'px' : '';
      }
      Object.assign(cut.style, { width: w + 'px', left: left + 'px', top: top + 'px', height: Math.min(w * ratio, showBelow) + 'px', overflow: 'hidden' });
      const tl = left + w * (hx + .27), tt = top + w * .28;
      const flip = tl + 150 > camW;
      Object.assign(tag.style, { left: (flip ? left + w * (hx - .27) - 140 : tl) + 'px', top: tt + 'px' });
      tag.classList.toggle('flip', flip);
    });
  }

  /* ---------- the red thread ----------
     Path lives in page coordinates. The SVG itself is only ~3 viewports tall and hops along with the reader,
     so each draw step repaints a small layer instead of the whole page. Sampling is analytic (no getPointAtLength loop). */
  const svg = $('#thread'), tl = $('#tl'), tg = $('#tg'), th = $('#th');
  let LEN = 0, BL = 1, xs = [], ys = [], lens = [], trigs = [], curL = 0, tgtL = 0, svgTop = -1, CH = 0, W = 0, H = 0;
  function pageXY(el) { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y }; }
  function buildThread() {
    W = document.documentElement.clientWidth; H = document.documentElement.scrollHeight; CH = Math.ceil(innerHeight * 3);
    const pts = $$('.tp').filter((el) => !(mobile() && el.dataset.m === 'skip')).map((el) => {
      const p = pageXY(el);
      const f = (mobile() && el.dataset.mx) || el.dataset.x;
      return [f ? parseFloat(f) * W : p.x, p.y];
    });
    const btn = $('#finalCta');
    if (btn) { const b = pageXY(btn); pts.push([b.x - 70, b.y + btn.offsetHeight / 2 + 30], [b.x - 4, b.y + btn.offsetHeight / 2]); }
    if (pts.length < 2) { svg.style.display = 'none'; return; }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    xs = [pts[0][0]]; ys = [pts[0][1]]; lens = [0];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 6;
      const c1 = [p1[0] + (p2[0] - p0[0]) / t, p1[1] + (p2[1] - p0[1]) / t], c2 = [p2[0] - (p3[0] - p1[0]) / t, p2[1] - (p3[1] - p1[1]) / t];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      for (let k = 1; k <= 24; k++) {
        const s = k / 24, u = 1 - s;
        const x = u * u * u * p1[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * p2[0];
        const y = u * u * u * p1[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * p2[1];
        L += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]); xs.push(x); ys.push(y); lens.push(L);
      }
    }
    LEN = L;
    tl.setAttribute('d', d); tg.setAttribute('d', d);
    BL = tl.getTotalLength();
    [tl, tg].forEach((p) => { p.style.strokeDasharray = BL; });
    // draw trigger: page depth reached so far, plus a share of any length run sideways or upward,
    // so the rising curve and horizontal sweeps draw progressively instead of all at once
    trigs = []; let my = -1e9, atMax = 0, trig = -1e9;
    for (let i = 0; i < ys.length; i++) {
      if (ys[i] >= my) { my = ys[i]; atMax = lens[i]; }
      trig = Math.max(trig, my + .12 * (lens[i] - atMax)); trigs.push(trig);
    }
    svg.setAttribute('width', W); svg.style.height = CH + 'px'; svgTop = -1;
    tgtL = RM ? LEN : targetLen(); curL = RM ? LEN : Math.min(curL, tgtL); paintThread();
  }
  function targetLen() {
    // near the bottom the draw line slides down so the thread reaches the final button
    const vh = innerHeight;
    const end = clamp((scrollY + vh - (H - vh * .5)) / (vh * .5), 0, 1);
    const y = scrollY + vh * (.82 + .4 * end);
    let lo = 0, hi = trigs.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (trigs[mid] < y) lo = mid + 1; else hi = mid; }
    return lens[lo] || 0;
  }
  function pointAt(L) {
    let lo = 0, hi = lens.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (lens[mid] < L) lo = mid + 1; else hi = mid; }
    const i = Math.max(1, lo), f = (L - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1);
    return [xs[i - 1] + (xs[i] - xs[i - 1]) * f, ys[i - 1] + (ys[i] - ys[i - 1]) * f];
  }
  function placeSvg() {
    const want = clamp(Math.floor((scrollY - innerHeight) / (innerHeight * .5)) * innerHeight * .5, 0, Math.max(0, H - CH));
    if (want === svgTop) return;
    svgTop = want; svg.style.transform = `translate3d(0,${want}px,0)`; svg.setAttribute('viewBox', `0 ${want} ${W} ${CH}`); svg.setAttribute('height', CH);
  }
  function paintThread() {
    placeSvg();
    const off = BL - curL * (BL / (LEN || 1));
    tl.style.strokeDashoffset = off; tg.style.strokeDashoffset = off;
    const p = pointAt(curL);
    th.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
    th.style.opacity = curL > 2 && curL < LEN - 2 ? 1 : 0;
  }

  /* ---------- camera creep on section openers ---------- */
  const creeps = new Set();
  const creepIO = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? creeps.add(e.target) : creeps.delete(e.target)), { rootMargin: '10% 0px' });
  $$('[data-creep]').forEach((el) => creepIO.observe(el));
  function creep() {
    const vh = innerHeight;
    creeps.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const p = clamp(1 - (r.top + r.height / 2) / vh, -.3, 1.3);
      const s = 1 + .04 * clamp(p, 0, 1.3);
      const x = p > .62 ? -(p - .62) * (mobile() ? 40 : 110) : 0;
      el.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${s.toFixed(4)})`;
    });
  }

  /* ---------- scroll loop: only runs while something moves ---------- */
  let ticking = false;
  const nav = $('#nav');
  function frame() {
    ticking = false;
    nav.classList.toggle('solid', scrollY > 40);
    if (!RM) { creep(); tgtL = targetLen(); }
    placeSvg();
    const dl = tgtL - curL;
    if (Math.abs(dl) > .5) { curL += dl * .14; paintThread(); ticking = true; requestAnimationFrame(frame); }
  }
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });

  /* ---------- entries ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('on'); io.unobserve(e.target);
    e.target.dispatchEvent(new CustomEvent('enter'));
  }), { rootMargin: '0px 0px -12% 0px', threshold: .01 });
  $$('[data-in], .seam:not(.words)').forEach((el) => io.observe(el));

  /* ---------- layout pass (fonts first, so the type does not jump) ---------- */
  let rz;
  function layout() { fit(); placeCuts(); buildThread(); creep(); }
  // lay out once the display face is in (it is preloaded and tiny), then reveal the staged blocks
  Promise.race([document.fonts.load('800 100px IMDisplay'), new Promise((r) => setTimeout(r, 1500))]).then(() => {
    layout();
    html.classList.add('ready');
    requestAnimationFrame(() => $$('.seam.words').forEach((s) => s.classList.add('on')));
  });
  addEventListener('load', () => { if (H !== document.documentElement.scrollHeight) buildThread(); });
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
  $$('details').forEach((d) => d.addEventListener('toggle', () => buildThread()));

  /* ---------- the carousel in the post ---------- */
  const car = $('#car');
  if (car) {
    const imgs = $$('img', car), n = $('#carN'); let k = 0, timer;
    const go = (to) => {
      const prev = imgs[k]; k = (to + imgs.length) % imgs.length;
      prev.classList.remove('cur'); prev.classList.add('out');
      setTimeout(() => prev.classList.remove('out'), 450);
      imgs[k].classList.remove('out'); imgs[k].classList.add('cur'); n.textContent = `${k + 1} / ${imgs.length}`;
    };
    $('#carX').onclick = () => { go(k + 1); clearInterval(timer); };
    $('#carP').onclick = () => { go(k - 1); clearInterval(timer); };
    const vis = new IntersectionObserver(([e]) => { clearInterval(timer); if (e.isIntersecting && !RM) timer = setInterval(() => go(k + 1), 3400); });
    vis.observe(car);
  }

  /* ---------- lead magnets: rack focus between the two ---------- */
  const stack = $('#stack');
  if (stack && !RM) {
    let t; new IntersectionObserver(([e]) => { clearInterval(t); if (e.isIntersecting) t = setInterval(() => { if (!stack.matches(':hover')) stack.classList.toggle('swap'); }, 3600); }).observe(stack);
  }

  /* ---------- the DM plays out once ---------- */
  const dm = $('#dm');
  if (dm) {
    const ms = $$('.m', dm), typing = $('.typing', dm);
    if (RM) ms.forEach((m) => m.classList.add('on'));
    else dm.addEventListener('enter', () => {
      setTimeout(() => ms[0].classList.add('on'), 450);
      setTimeout(() => typing.classList.add('on'), 1200);
      setTimeout(() => { typing.classList.remove('on'); ms[1].classList.add('on'); }, 2300);
      setTimeout(() => ms[2].classList.add('on'), 3300);
    }, { once: true });
  }

  /* ---------- real numbers count up as they land ---------- */
  const ease = (t) => 1 - Math.pow(2, -10 * t);
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), host = el.closest('[data-in], .seam') || el;
    if (RM) return;
    el.textContent = from;
    const run = () => { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(from + (to - from) * ease(k)); if (k < 1) requestAnimationFrame(step); }; setTimeout(() => requestAnimationFrame(step), 250); };
    if (host.classList.contains('on')) run(); else host.addEventListener('enter', run, { once: true });
  });
  /* the 15 call tiles land one after another */
  $$('.tiles i').forEach((t, i) => { t.style.transitionDelay = `${.35 + i * .06}s`; });

  /* ---------- DIY estimate ---------- */
  const hrs = $('#hrs');
  if (hrs) hrs.addEventListener('input', () => { $('#hrsO').textContent = hrs.value; $('#hrsT').textContent = hrs.value * 4; });

})();
