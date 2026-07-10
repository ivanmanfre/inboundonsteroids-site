/* InboundOnSteroids landing-page figures (Builder B).
   Self-contained vanilla JS. Runs with defer. Builds three figures into
   #fig-dose, #fig-synthesis, #fig-curve. Ported faithfully from the
   ratified cd-final "Landing Page.dc.html" React.createElement source:
   the dose strip is rebuilt as FLAT PRESSED CELLS (paper-flat, no 3D),
   the synthesis pathway and pipeline curve are ported verbatim in geometry,
   labels, timings and colors. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var GROT = "'Schibsted Grotesk', sans-serif";
  var SERIF = "'Source Serif 4', serif";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- helpers ---------------------------------------------------------- */
  function svgel(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] == null) continue;
        e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }
  // text helper mirrors spec T(): centered, Schibsted Grotesk, 700, 14, ink
  function T(x, y, content, o) {
    var a = Object.assign({
      x: x, y: y, 'text-anchor': 'middle', 'font-family': GROT,
      'font-weight': 700, 'font-size': 14, fill: '#131210'
    }, o || {});
    var e = svgel('text', a);
    e.textContent = content;
    return e;
  }
  // rect helper mirrors spec R(): white fill, ink 2px stroke
  function R(x, y, w, h, o) {
    return svgel('rect', Object.assign({
      x: x, y: y, width: w, height: h, fill: '#FFFFFF',
      stroke: '#131210', 'stroke-width': 2
    }, o || {}));
  }

  /* ---- injected CSS ----------------------------------------------------- */
  function injectCSS() {
    if (document.getElementById('figures-css')) return;
    var s = document.createElement('style');
    s.id = 'figures-css';
    s.textContent = [
      '@keyframes drawCurve { to { stroke-dashoffset: 0; } }',
      '@keyframes arrowIn { to { opacity: 1; } }',
      '@keyframes dashMarch { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -56; } }',
      // flat press: dot snaps out then restocks, mechanical (steps timing)
      '@keyframes flatPress { 0% { opacity: 1; } 2.5% { opacity: 0; } 88% { opacity: 0; } 94% { opacity: 1; } 100% { opacity: 1; } }',
      '.ios-dose-strip { display: flex; gap: 10px; flex-wrap: wrap; }',
      '.ios-dose-cell { box-sizing: border-box; width: 30px; height: 30px; border: 2px solid #131210; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }',
      '.ios-dose-dot { width: 11px; height: 11px; border-radius: 50%; animation: flatPress 13s steps(1, end) infinite both; }',
      '.ios-dash { animation: dashMarch 2.6s linear infinite; }',
      '.ios-curve { stroke-dasharray: 1; stroke-dashoffset: 1; }',
      '.ios-arrow { opacity: 0; }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .ios-dose-dot { animation: none !important; opacity: 1 !important; }',
      '  .ios-dash { animation: none !important; }',
      '  .ios-curve { stroke-dashoffset: 0 !important; animation: none !important; }',
      '  .ios-arrow { opacity: 1 !important; animation: none !important; }',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- FIGURE 1: dose strip (flat pressed-cell rebuild) ----------------- */
  function buildDose() {
    var mount = document.getElementById('fig-dose');
    if (!mount) return;
    var leadSet = { 6: 1, 13: 1, 21: 1, 27: 1 }; // spec leadIdx
    var strip = document.createElement('div');
    strip.className = 'ios-dose-strip';
    for (var i = 0; i < 30; i++) {
      var cell = document.createElement('div');
      cell.className = 'ios-dose-cell';
      var dot = document.createElement('span');
      dot.className = 'ios-dose-dot';
      dot.style.background = leadSet[i] ? '#C8361B' : '#131210';
      dot.style.animationDelay = (i * 0.32) + 's'; // spec stagger
      cell.appendChild(dot);
      strip.appendChild(cell);
    }
    mount.appendChild(strip);
  }

  /* ---- FIGURE 3: pipeline curve ---------------------------------------- */
  function buildCurve() {
    var mount = document.getElementById('fig-curve');
    if (!mount) return;
    var svg = svgel('svg', {
      width: '100%', viewBox: '0 0 600 470',
      preserveAspectRatio: 'xMidYMid meet'
    });
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.maxWidth = '580px';
    svg.style.height = 'auto';

    svg.appendChild(svgel('line', { x1: 50, y1: 30, x2: 50, y2: 410, stroke: '#131210', 'stroke-width': 2.5 }));
    svg.appendChild(svgel('line', { x1: 50, y1: 410, x2: 570, y2: 410, stroke: '#131210', 'stroke-width': 2.5 }));
    svg.appendChild(T(50, 442, 'day 0', { 'font-family': SERIF, 'font-weight': 400, 'font-size': 16, 'text-anchor': 'start' }));
    svg.appendChild(T(518, 442, 'day 90', { 'font-family': SERIF, 'font-weight': 400, 'font-size': 16, 'text-anchor': 'start' }));
    svg.appendChild(T(30, 230, 'pipeline', { 'font-family': SERIF, 'font-weight': 400, 'font-size': 16, 'text-anchor': 'start', transform: 'rotate(-90 30 230)' }));
    svg.appendChild(svgel('path', { d: 'M 50 396 L 570 386', stroke: '#9A958A', 'stroke-width': 2.5, 'stroke-dasharray': '7 7', fill: 'none' }));
    svg.appendChild(T(468, 372, 'by hand', { 'font-family': SERIF, 'font-weight': 400, 'font-style': 'italic', 'font-size': 16.5, fill: '#6B675E', 'text-anchor': 'start' }));

    var curve = svgel('path', {
      d: 'M 50 394 C 130 390, 170 382, 210 362 C 270 332, 310 290, 360 240 C 420 180, 480 110, 524 56 L 550 22',
      pathLength: 1, stroke: '#C8361B', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
    });
    curve.setAttribute('class', 'ios-curve');
    svg.appendChild(curve);

    var arrow = svgel('polygon', { points: '542,32 553,10 562,30', fill: '#C8361B' });
    arrow.setAttribute('class', 'ios-arrow');
    svg.appendChild(arrow);

    svg.appendChild(svgel('circle', { cx: 210, cy: 362, r: 5.5, fill: '#131210' }));
    svg.appendChild(T(224, 350, 'daily administration begins', { 'font-family': SERIF, 'font-weight': 400, 'font-style': 'italic', 'font-size': 17, 'text-anchor': 'start' }));
    svg.appendChild(T(316, 268, 'the machine, daily', { 'font-family': SERIF, 'font-weight': 400, 'font-style': 'italic', 'font-size': 17, fill: '#C8361B', 'text-anchor': 'start', transform: 'rotate(-40 316 268)' }));

    mount.appendChild(svg);

    if (reduce) {
      // settled state guaranteed by CSS; nothing to trigger
      return;
    }
    // draw once on first viewport entry
    var drawn = false;
    var trigger = function () {
      if (drawn) return;
      drawn = true;
      curve.style.animation = 'drawCurve 2.8s cubic-bezier(0.45,0,0.2,1) 0.4s forwards';
      arrow.style.animation = 'arrowIn 0.4s ease 3.1s forwards';
    };
    if (typeof IntersectionObserver === 'undefined') { trigger(); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { trigger(); io.unobserve(en.target); }
      });
    }, { threshold: 0.2 });
    io.observe(svg);
  }

  /* ---- FIGURE 2: synthesis pathway ------------------------------------- */
  function buildSynth() {
    var mount = document.getElementById('fig-synthesis');
    if (!mount) return;

    var svg = svgel('svg', {
      id: 'sy-root', width: '100%', viewBox: '0 0 1200 560',
      preserveAspectRatio: 'xMidYMid meet'
    });
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';

    // feedback path (dashMarch loop)
    var fbPath = svgel('path', { d: 'M 1050 315 C 950 30, 500 15, 330 105', stroke: '#9A958A', 'stroke-width': 2, 'stroke-dasharray': '7 7', fill: 'none' });
    fbPath.setAttribute('class', 'ios-dash');
    svg.appendChild(fbPath);
    svg.appendChild(T(690, 46, 'TOP PERFORMERS FEED BACK IN', { 'font-size': 12, 'letter-spacing': '0.14em', fill: '#6B675E' }));

    // inputs
    var inputLabels = [['YOUR CALLS', 90], ['THE WEB', 140], ['PAST WINNERS', 190], ['NEWS RADAR', 240]];
    inputLabels.forEach(function (p, i) {
      svg.appendChild(T(30, p[1] + 5, p[0], { 'text-anchor': 'start', 'font-size': 12.5, fill: '#4A463E', 'letter-spacing': '0.08em' }));
      svg.appendChild(svgel('path', { d: 'M 172 ' + p[1] + ' C 205 ' + p[1] + ', 210 165, 240 165', stroke: '#C9C2B2', 'stroke-width': 1.5, fill: 'none' }));
      svg.appendChild(svgel('circle', { id: 'sy-in' + i, r: 3.5, fill: '#131210', opacity: 0 }));
    });

    // main pipeline rail
    svg.appendChild(svgel('path', { d: 'M 410 165 H 1075 V 375 H 380', stroke: '#C9C2B2', 'stroke-width': 2, fill: 'none' }));

    // content brain
    svg.appendChild(R(240, 110, 170, 110, { 'stroke-width': 4, id: 'sy-brain' }));
    svg.appendChild(R(247, 117, 156, 96, { 'stroke-width': 1, fill: 'none' }));
    svg.appendChild(T(325, 158, 'CONTENT', { 'font-size': 17 }));
    svg.appendChild(T(325, 180, 'BRAIN', { 'font-size': 17 }));
    svg.appendChild(T(325, 245, 'decides what to post', { 'font-family': SERIF, 'font-style': 'italic', 'font-weight': 400, 'font-size': 13.5, fill: '#6B675E' }));

    // steps
    var stepNames = ['CONTEXT', 'FORMAT', 'HOOK', 'WRITE', 'QA', 'DE-SLOP'];
    stepNames.forEach(function (name, i) {
      var x = 450 + i * 86;
      var cx = x + 38;
      svg.appendChild(R(x, 133, 76, 64, { id: 'sy-step' + i }));
      svg.appendChild(T(cx, 160, String(i + 1), { 'font-size': 17 }));
      svg.appendChild(T(cx, 182, name, { 'font-size': 10.5, 'letter-spacing': '0.08em' }));
      svg.appendChild(svgel('polyline', { id: 'sy-tick' + i, points: (cx - 7) + ',116 ' + (cx - 2) + ',121 ' + (cx + 7) + ',109', fill: 'none', stroke: '#131210', 'stroke-width': 3, opacity: 0 }));
    });
    svg.appendChild(T(789, 226, 'rewritten until it passes', { 'font-family': SERIF, 'font-style': 'italic', 'font-weight': 400, 'font-size': 13, fill: '#6B675E' }));

    // approve + stamp
    svg.appendChild(R(990, 120, 170, 90, { 'stroke-width': 4, id: 'sy-approve' }));
    svg.appendChild(R(997, 127, 156, 76, { 'stroke-width': 1, fill: 'none' }));
    svg.appendChild(T(1075, 158, 'YOU APPROVE', { 'font-size': 16 }));
    svg.appendChild(T(1075, 180, 'your only step', { 'font-family': SERIF, 'font-style': 'italic', 'font-weight': 400, 'font-size': 13, fill: '#C8361B' }));
    var stamp = svgel('g', { id: 'sy-stamp', opacity: 0 });
    stamp.appendChild(svgel('rect', { x: 995, y: 88, width: 160, height: 36, fill: 'rgba(255,255,255,0.85)', stroke: '#C8361B', 'stroke-width': 2.5 }));
    stamp.appendChild(T(1075, 113, 'APPROVED', { 'font-size': 17, fill: '#C8361B', 'letter-spacing': '0.14em' }));
    svg.appendChild(stamp);

    // linkedin post
    svg.appendChild(R(940, 320, 220, 110, { id: 'sy-post' }));
    svg.appendChild(T(1050, 352, 'LINKEDIN POST', { 'font-size': 16 }));
    svg.appendChild(T(1050, 378, 'published on your schedule', { 'font-weight': 400, 'font-size': 12.5, fill: '#4A463E' }));
    svg.appendChild(T(1050, 396, 'native, in your voice', { 'font-weight': 400, 'font-size': 12.5, fill: '#4A463E' }));
    svg.appendChild(T(830, 360, 'READERS WHO ENGAGE', { 'font-size': 11, 'letter-spacing': '0.12em', fill: '#6B675E' }));

    // lead magnet
    svg.appendChild(R(500, 320, 220, 110, { id: 'sy-magnet' }));
    svg.appendChild(T(610, 352, 'LEAD MAGNET', { 'font-size': 16 }));
    svg.appendChild(T(610, 378, 'gated page, email capture', { 'font-weight': 400, 'font-size': 12.5, fill: '#4A463E' }));
    svg.appendChild(T(610, 396, 'follow-up until they reply', { 'font-weight': 400, 'font-size': 12.5, fill: '#4A463E' }));

    // inbox
    svg.appendChild(R(180, 325, 200, 100, { 'stroke-width': 4, id: 'sy-inbox' }));
    svg.appendChild(R(187, 332, 186, 86, { 'stroke-width': 1, fill: 'none' }));
    svg.appendChild(svgel('rect', { x: 207, y: 355, width: 40, height: 28, fill: 'none', stroke: '#131210', 'stroke-width': 2 }));
    svg.appendChild(svgel('polyline', { points: '207,355 227,372 247,355', fill: 'none', stroke: '#131210', 'stroke-width': 2 }));
    svg.appendChild(T(305, 368, 'LEADS IN', { 'font-size': 15 }));
    svg.appendChild(T(305, 388, 'YOUR INBOX', { 'font-size': 15 }));
    svg.appendChild(T(305, 409, '', { id: 'sy-count', 'font-size': 12.5, fill: '#C8361B' }));
    svg.appendChild(T(280, 455, 'you take the calls', { 'font-family': SERIF, 'font-style': 'italic', 'font-weight': 400, 'font-size': 14, fill: '#6B675E' }));

    // moving dots
    svg.appendChild(svgel('circle', { id: 'sy-fb', r: 4.5, fill: '#6B675E', opacity: 0 }));
    for (var e = 0; e < 5; e++) svg.appendChild(svgel('circle', { id: 'sy-e' + e, r: 3.5, fill: '#6B675E', opacity: 0 }));
    svg.appendChild(svgel('circle', { id: 'sy-dose', r: 7, fill: '#C8361B', opacity: 0 }));

    mount.appendChild(svg);

    // ---- animation (ported verbatim from spec initSynth) ----
    var $ = function (id) { return svg.querySelector('#' + id); };
    var els = { brain: $('sy-brain'), approve: $('sy-approve'), post: $('sy-post'), magnet: $('sy-magnet'), inbox: $('sy-inbox'), dose: $('sy-dose'), count: $('sy-count'), stamp: $('sy-stamp'), fb: $('sy-fb') };
    var steps = [], ticks = [], ins = [], eds = [];
    for (var i = 0; i < 6; i++) { steps.push($('sy-step' + i)); ticks.push($('sy-tick' + i)); }
    for (var i2 = 0; i2 < 4; i2++) ins.push($('sy-in' + i2));
    for (var i3 = 0; i3 < 5; i3++) eds.push($('sy-e' + i3));

    if (reduce) {
      // settled: ticks visible, counter empty, moving dots hidden
      ticks.forEach(function (el) { if (el) el.setAttribute('opacity', '1'); });
      return;
    }

    var inY = [90, 140, 190, 240];
    var cubic = function (p0, p1, p2, p3, t) { var u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
    var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    var segs = [
      [1.6, 1.95, 410, 165, 488, 165], [2.2, 2.5, 488, 165, 574, 165], [2.75, 3.05, 574, 165, 660, 165],
      [3.3, 3.6, 660, 165, 746, 165], [3.85, 4.15, 746, 165, 832, 165],
      [4.5, 4.85, 832, 165, 746, 165],
      [5.15, 5.75, 746, 165, 918, 165],
      [6.05, 6.4, 918, 165, 1075, 165],
      [7.2, 7.7, 1075, 165, 1075, 375], [7.7, 7.95, 1075, 375, 1050, 375]
    ];
    var flashes = {
      brain: [[0.85, 1.2], [1.0, 1.35], [1.15, 1.5], [1.3, 1.65], [11.0, 11.4]],
      step0: [[1.95, 2.3]], step1: [[2.5, 2.85]], step2: [[3.05, 3.4]],
      step3: [[3.6, 3.95], [4.85, 5.15]], step4: [[4.15, 4.5], [5.45, 5.65]], step5: [[5.75, 6.1]],
      approve: [[6.4, 6.9]], post: [[7.8, 8.2]], magnet: [], inbox: []
    };
    for (var m = 0; m < 5; m++) { var a = 8.0 + 0.18 * m + 0.55; flashes.magnet.push([a, a + 0.25]); }
    var leadIdx = [1, 3];
    leadIdx.forEach(function (i) { var a = 8.0 + 0.18 * i + 0.55 + 0.15 + 0.45; flashes.inbox.push([a, a + 0.35]); });
    var tickAt = [2.25, 2.8, 3.35, 3.9, 5.65, 6.05];
    var inWin = function (t, ws) { return ws.some(function (w) { return t >= w[0] && t <= w[1]; }); };
    var setFill = function (el, on) { if (el) el.setAttribute('fill', on ? '#EDE7D3' : '#FFFFFF'); };

    var state = { leads: 0 };
    var counted = {};
    var D = 12;
    var rafId = null, start = null, lastTs = 0, rebase = false;

    var frame = function (ts) {
      if (start === null) start = ts;
      if (rebase) { start += ts - lastTs; rebase = false; }
      lastTs = ts;
      var total = (ts - start) / 1000;
      var t = total % D;
      var loop = Math.floor(total / D);
      ins.forEach(function (el, i) {
        if (!el) return;
        var p = (t - 0.15 * i) / 0.7;
        if (p < 0 || p > 1) { el.setAttribute('opacity', '0'); return; }
        var e2 = ease(clamp01(p));
        el.setAttribute('cx', cubic(172, 205, 210, 240, e2));
        el.setAttribute('cy', cubic(inY[i], inY[i], 165, 165, e2));
        el.setAttribute('opacity', '1');
      });
      setFill(els.brain, inWin(t, flashes.brain));
      steps.forEach(function (el, i) { setFill(el, inWin(t, flashes['step' + i])); });
      setFill(els.approve, inWin(t, flashes.approve));
      setFill(els.post, inWin(t, flashes.post));
      setFill(els.magnet, inWin(t, flashes.magnet));
      setFill(els.inbox, inWin(t, flashes.inbox));
      ticks.forEach(function (el, i) { if (el) el.setAttribute('opacity', t >= tickAt[i] && t < 11.4 ? '1' : '0'); });
      if (els.dose) {
        var x = 410, y = 165;
        for (var si = 0; si < segs.length; si++) {
          var s = segs[si];
          if (t >= s[1]) { x = s[4]; y = s[5]; }
          else if (t >= s[0]) { var p = ease((t - s[0]) / (s[1] - s[0])); x = s[2] + (s[4] - s[2]) * p; y = s[3] + (s[5] - s[3]) * p; break; }
          else break;
        }
        var hollow = t >= 4.5 && t <= 5.75;
        els.dose.setAttribute('cx', x); els.dose.setAttribute('cy', y);
        els.dose.setAttribute('fill', hollow ? '#FFFFFF' : '#C8361B');
        els.dose.setAttribute('stroke', hollow ? '#C8361B' : 'none');
        els.dose.setAttribute('stroke-width', hollow ? '2.5' : '0');
        var r = 7;
        if (t >= 6.4 && t <= 7.2) r = 7 + 1.8 * Math.abs(Math.sin((t - 6.4) * 6));
        els.dose.setAttribute('r', r);
        var op = 0;
        if (t >= 1.5 && t <= 8.35) { op = 1; if (t < 1.6) op = (t - 1.5) / 0.1; if (t > 8.05) op = Math.max(0, 1 - (t - 8.05) / 0.3); }
        els.dose.setAttribute('opacity', op);
      }
      if (els.stamp) {
        var sop = 0, ss = 1;
        if (t >= 6.7 && t < 11.8) {
          var sp = clamp01((t - 6.7) / 0.25);
          sop = sp * (t > 11.5 ? Math.max(0, 1 - (t - 11.5) / 0.3) : 1);
          ss = 1.6 - 0.6 * sp;
        }
        els.stamp.setAttribute('opacity', sop);
        els.stamp.setAttribute('transform', 'rotate(-7 1075 106) translate(' + (1075 * (1 - ss)) + ' ' + (106 * (1 - ss)) + ') scale(' + ss + ')');
      }
      eds.forEach(function (el, i) {
        if (!el) return;
        var t0 = 8.0 + 0.18 * i;
        var isLead = leadIdx.indexOf(i) >= 0;
        var op = 0, x = 940, fill = '#6B675E', r = 3.5;
        var p1 = (t - t0) / 0.55;
        if (p1 >= 0 && p1 <= 1) { op = 1; x = 940 - 220 * ease(clamp01(p1)); }
        else if (p1 > 1 && isLead) {
          var p2 = (t - (t0 + 0.7)) / 0.45;
          fill = '#C8361B'; r = 5;
          if (p2 < 0) { op = 1; x = 720; }
          else if (p2 <= 1) { op = 1; x = 720 - 340 * ease(clamp01(p2)); }
          else {
            var key = loop + '-' + i;
            if (!counted[key]) { counted[key] = 1; state.leads++; if (els.count) els.count.textContent = state.leads + (state.leads === 1 ? ' lead captured' : ' leads captured'); }
          }
        }
        el.setAttribute('cx', x); el.setAttribute('cy', 375);
        el.setAttribute('opacity', op); el.setAttribute('fill', fill); el.setAttribute('r', r);
      });
      if (els.fb) {
        var fp = (t - 9.8) / 1.2;
        if (fp >= 0 && fp <= 1) {
          var fe = ease(fp);
          els.fb.setAttribute('opacity', '1');
          els.fb.setAttribute('cx', cubic(1050, 950, 500, 330, fe));
          els.fb.setAttribute('cy', cubic(315, 30, 15, 105, fe));
        } else els.fb.setAttribute('opacity', '0');
      }
      rafId = requestAnimationFrame(frame);
    };

    var play = function () {
      if (rafId !== null) return;
      rebase = (start !== null);
      rafId = requestAnimationFrame(frame);
    };
    var pause = function () {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    };

    // gate on viewport + tab visibility
    var visible = false;
    var sync = function () {
      if (visible && !document.hidden) play();
      else pause();
    };
    document.addEventListener('visibilitychange', sync);
    if (typeof IntersectionObserver === 'undefined') { visible = true; sync(); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { visible = en.isIntersecting; });
      sync();
    }, { threshold: 0.15 });
    io.observe(svg);
  }

  /* ---- boot ------------------------------------------------------------- */
  function boot() {
    injectCSS();
    buildDose();
    buildSynth();
    buildCurve();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
