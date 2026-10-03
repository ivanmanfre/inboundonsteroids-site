(() => {
  const instrument = document.querySelector('[data-instrument]');
  if (!instrument) return;
  const buttons = [...instrument.querySelectorAll('[data-tool]')];
  const scenes = [...instrument.querySelectorAll('[data-scene]')];
  const count = instrument.querySelector('[data-count]');
  const motionToggle = instrument.querySelector('[data-motion-toggle]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 'breakouts';
  let timer = null;
  let startedAt = 0;
  let remaining = 6800;
  let visible = false;
  let paused = false;
  let hoverHold = false;
  let focusHold = false;

  function updatePauseState() {
    const held = paused || hoverHold || focusHold || reduced.matches || document.hidden || !visible;
    instrument.classList.toggle('is-paused', held);
    motionToggle.disabled = reduced.matches;
    motionToggle.innerHTML = reduced.matches ? 'Motion off' : paused ? 'Play motion <span aria-hidden="true">▶</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  }

  function select(tool, byUser = false) {
    current = tool;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
    for (const scene of scenes) scene.classList.toggle('is-active', scene.dataset.scene === tool);
    count.textContent = tool === 'breakouts' ? '01' : '02';
    instrument.dataset.activeTool = tool;
    if (byUser) {
      stop();
      paused = true;
      remaining = 6800;
      instrument.classList.add('is-manual');
      updatePauseState();
    }
  }
  function stop() {
    if (timer) {
      remaining = Math.max(1, remaining - (performance.now() - startedAt));
      window.clearTimeout(timer);
    }
    timer = null;
  }
  function start() {
    stop();
    updatePauseState();
    if (!visible || reduced.matches || paused || hoverHold || focusHold || document.hidden) return;
    startedAt = performance.now();
    timer = window.setTimeout(() => {
      timer = null;
      remaining = 6800;
      select(current === 'breakouts' ? 'draft' : 'breakouts');
      start();
    }, remaining);
  }
  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.tool, true));
  motionToggle.addEventListener('click', () => {
    paused = !paused;
    if (!paused && instrument.classList.contains('is-manual')) {
      instrument.classList.remove('is-manual');
      remaining = 6800;
    }
    start();
  });
  instrument.addEventListener('mouseenter', () => { hoverHold = true; start(); });
  instrument.addEventListener('mouseleave', () => { hoverHold = false; start(); });
  instrument.addEventListener('focusin', () => { focusHold = true; start(); });
  instrument.addEventListener('focusout', () => { focusHold = instrument.contains(document.activeElement); start(); });
  reduced.addEventListener?.('change', start);
  document.addEventListener('visibilitychange', start);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    if (visible) instrument.classList.add('is-visible');
    start();
  }, { threshold: 0.25 });
  observer.observe(instrument);
  const rows = document.querySelectorAll('.reading-row');
  const rowObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-in'); rowObserver.unobserve(entry.target); }
  }, { threshold: 0.2 });
  for (const row of rows) rowObserver.observe(row);
  document.documentElement.classList.add('research-js');
})();
