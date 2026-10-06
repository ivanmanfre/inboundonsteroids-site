/* RISE DTC case: outreach numbers count up with thousands separators as each row lands. */
(() => {
  if (document.documentElement.classList.contains('rm')) return;
  const ease = (t) => 1 - Math.pow(2, -10 * t);
  const fmt = (n) => n.toLocaleString('en-US');
  document.querySelectorAll('[data-cnt]').forEach((el) => {
    const to = +el.dataset.cnt, host = el.closest('[data-in]') || el;
    const run = () => {
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 1300); el.textContent = fmt(k < 1 ? Math.round(to * ease(k)) : to); if (k < 1) requestAnimationFrame(step); };
      setTimeout(() => requestAnimationFrame(step), 300);
    };
    if (host.classList.contains('on')) { run(); return; }
    el.textContent = '0';
    host.addEventListener('enter', run, { once: true });
  });
})();
