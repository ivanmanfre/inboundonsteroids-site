/* Kyle case: count-ups that need thousands separators (site.js data-count prints raw integers). */
(() => {
  if (document.documentElement.classList.contains('rm')) return;
  const ease = (t) => 1 - Math.pow(2, -10 * t);
  document.fonts.ready.then(() => document.querySelectorAll('[data-kc]').forEach((el) => {
    const to = +el.dataset.kc, host = el.closest('[data-in], .seam') || el;
    el.style.display = 'inline-block'; el.style.minWidth = el.offsetWidth + 'px';
    el.textContent = '0';
    const run = () => {
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 1300); el.textContent = Math.round(to * ease(k)).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(step); };
      setTimeout(() => requestAnimationFrame(step), 250);
    };
    if (host.classList.contains('on')) run(); else host.addEventListener('enter', run, { once: true });
  }));
})();
