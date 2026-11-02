(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Carousel
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.slides');
    const slides = [...track.querySelectorAll('img')];
    const prev = carousel.querySelector('.prev'), next = carousel.querySelector('.next');
    const count = carousel.querySelector('.slide-count');
    let index = 0;
    const update = () => {
      index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      count.textContent = `${index + 1} / ${slides.length}`;
      prev.disabled = index === 0; next.disabled = index === slides.length - 1;
    };
    const go = d => track.scrollTo({left: Math.max(0, Math.min(slides.length - 1, index + d)) * track.clientWidth, behavior: reduced.matches ? 'instant' : 'smooth'});
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, {passive: true});
    track.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(e.key === 'ArrowLeft' ? -1 : 1); } });
    addEventListener('resize', () => { track.scrollTo({left: index * track.clientWidth, behavior: 'instant'}); update(); });
    update();
  });

  // Live infographic: scale the 1080x1350 frame to the post width
  document.querySelectorAll('.live').forEach(box => {
    const fit = () => box.style.setProperty('--s', (box.clientWidth / 1080).toFixed(4));
    new ResizeObserver(fit).observe(box); fit();
  });

  // Reveal on scroll
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -12% 0px'});
  document.querySelectorAll('.rv,.flow').forEach(el => io.observe(el));
  document.querySelectorAll('.flow li').forEach((li, i) => li.style.setProperty('--i', i));

  // Page thread (same build as the Leading Social page)
  const svg = document.getElementById('page-thread'), base = document.getElementById('thread-base'), line = document.getElementById('thread-drawn'), dot = document.getElementById('thread-dot');
  const art = [...document.querySelectorAll('.res-cover')];
  let points = [], length = 0, frame = 0, current = 0;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function build() {
    const w = innerWidth, mobile = w <= 760, ys = [{x: mobile ? 7 : w * .97, y: 120}];
    const markers = [...document.querySelectorAll('#posts,#lead-magnet,#icp,#outreach,#plan,#results,#start,#next-steps,#close')];
    markers.forEach((el, i) => {
      const y = el.getBoundingClientRect().top + scrollY;
      const x = mobile ? 7 + (i % 2) * 3 : w * (i % 2 ? .975 : .025);
      ys.push({x: ys.at(-1).x, y: Math.max(ys.at(-1).y, y - 90)}, {x, y: y + 24});
    });
    const end = document.querySelector('.closing .cta');
    if (end) { const b = end.getBoundingClientRect(); ys.push({x: w * .5, y: b.top + scrollY + b.height + 24}); }
    let d = `M${ys[0].x},${ys[0].y}`;
    for (let i = 1; i < ys.length; i++) { const a = ys[i - 1], b = ys[i], dy = (b.y - a.y) / 2; d += ` C${a.x},${a.y + dy} ${b.x},${b.y - dy} ${b.x},${b.y}`; }
    base.setAttribute('d', d); line.setAttribute('d', d); length = line.getTotalLength();
    points = Array.from({length: 1001}, (_, i) => { const p = line.getPointAtLength(length * i / 1000); return {y: p.y, l: length * i / 1000}; });
    line.style.strokeDasharray = String(length); kick();
  }
  function paint() {
    frame = 0; svg.setAttribute('viewBox', `0 ${scrollY} ${innerWidth} ${innerHeight}`);
    const y = scrollY + innerHeight * .75;
    const i = points.findIndex(p => p.y >= y), p = points[i < 0 ? points.length - 1 : i]; if (!p) return;
    current = reduced.matches ? length : current + (p.l - current) * .2;
    if (Math.abs(current - p.l) < .6) current = p.l;
    line.style.strokeDashoffset = String(length - current);
    const at = line.getPointAtLength(current); dot.setAttribute('cx', at.x); dot.setAttribute('cy', at.y);
    dot.style.opacity = y > points.at(-1).y ? '0' : '1';
    art.forEach((el, n) => {
      const t = clamp((el.getBoundingClientRect().top - innerHeight * .55) / (innerHeight * .55), 0, 1);
      el.style.setProperty('--art-x', reduced.matches ? '0px' : `${(t * (n % 2 ? 1 : -1) * (innerWidth <= 760 ? 8 : 26)).toFixed(1)}px`);
      el.style.setProperty('--art-y', reduced.matches ? '0px' : `${(t * 18).toFixed(1)}px`);
    });
    if (!reduced.matches && Math.abs(current - p.l) > .6) kick();
  }
  function kick() { if (!frame) frame = requestAnimationFrame(paint); }
  addEventListener('scroll', kick, {passive: true}); addEventListener('resize', build); reduced.addEventListener('change', build);
  new ResizeObserver(build).observe(document.querySelector('main')); document.fonts.ready.then(build); build();
})();
