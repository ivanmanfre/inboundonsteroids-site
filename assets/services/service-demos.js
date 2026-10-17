(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prospects = {
    maya: {
      initials: 'MR', name: 'Maya Reed', role: 'Founder at a creative agency',
      profile: 'Runs a small creative team serving growing brands.',
      decision: 'Check buyer fit',
      fit: 'Creative agency founder. Check the offer and company size against the brief.',
      history: 'Check prior contact and exclusions.',
      draft: 'Hi Maya, saw you in the discussion about referrals. I put together a short breakdown of where agencies lose warm enquiries between a referral and first call. Want it?',
      draftStatus: 'Draft'
    },
    leo: {
      initials: 'LM', name: 'Leo Morris', role: 'Head of growth at a lead-generation provider',
      profile: 'His company sells pipeline and lead-generation services.',
      decision: 'Excluded: agency peer',
      fit: 'His company sells lead generation, which the buyer brief excludes.',
      history: 'Excluded from this campaign.',
      draft: 'No draft for a peer agency.',
      draftStatus: 'No draft prepared'
    },
    ava: {
      initials: 'AC', name: 'Ava Chen', role: 'Operations lead at a logistics company',
      profile: 'Works in logistics operations.',
      decision: 'Excluded: outside buyer profile',
      fit: 'Logistics operations falls outside the buyer profile.',
      history: 'Excluded from this campaign.',
      draft: 'No draft for this role and company.',
      draftStatus: 'No draft prepared'
    }
  };
  const copy = {
    signal: [
      ['A reaction to a public discussion.', 'Maya reacted to a post about referrals. That shows interest in the topic, without telling us what her agency needs.'],
      ['Check the agency and contact history.', 'We check Maya’s role, company, prior contact and exclusions against the buyer brief.'],
      ['A draft tied to the discussion.', 'The message refers to the public topic and offers a short breakdown.']
    ],
    reader: [
      ['A question from a founder call.', 'The founder asks which sources of new work are repeatable.'],
      ['A post about referrals.', 'Emma offers a worksheet for founders mapping where new projects come from.'],
      ['Jordan asks for the worksheet.', 'The MAP comment requests the worksheet. Delivery depends on the available LinkedIn connection path.']
    ]
  };

  function setupSequence(root, kind) {
    const stages = [...root.querySelectorAll('[data-stage]')];
    const scenes = [...root.querySelectorAll('[data-scene]')];
    const play = root.querySelector('[data-motion="play"]');
    const pause = root.querySelector('[data-motion="pause"]');
    const replay = root.querySelector('[data-motion="replay"]');
    const readout = root.querySelector('[data-motion-readout]');
    let stage = 0;
    let timer = null;
    let inView = false;
    let hasStarted = false;
    let manuallyPaused = false;
    let complete = false;
    let runId = 0;
    let activeTransition = null;
    const dwellMs = 4200;
    let observer;

    function state(value) {
      root.dataset.motionState = value;
      play.setAttribute('aria-pressed', String(value === 'playing'));
      pause.setAttribute('aria-pressed', String(value === 'paused'));
      readout.textContent = value === 'playing' ? 'Playing sequence' : value === 'complete' ? 'Sequence complete' : value === 'paused' ? 'Sequence paused' : value === 'reduced' ? 'Motion reduced' : 'Sequence ready';
    }
    function clear() {
      if (timer) window.clearTimeout(timer);
      timer = null;
      runId += 1;
      if (activeTransition) activeTransition.skipTransition();
      activeTransition = null;
    }
    function render(index) {
      const previousHandoff = scenes[stage].querySelector('[data-handoff]');
      stage = index;
      root.dataset.activeStage = String(index);
      root.querySelector('[data-scene-number]').textContent = `0${index + 1} / 03`;
      root.querySelector('[data-scene-title]').textContent = copy[kind][index][0];
      root.querySelector('[data-scene-copy]').textContent = copy[kind][index][1];
      stages.forEach(button => {
        if (Number(button.dataset.stage) === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      scenes.forEach(scene => {
        const active = Number(scene.dataset.scene) === index;
        scene.hidden = !active;
        scene.setAttribute('aria-hidden', String(!active));
        scene.inert = !active;
      });
      if (observer) {
        observer.unobserve(previousHandoff);
        observer.observe(scenes[index].querySelector('[data-handoff]'));
      }
    }
    async function moveTo(index) {
      if (index === stage) return;
      if (reducedMotion.matches || !document.startViewTransition) { render(index); return; }
      const requestedRun = runId;
      root.dataset.vt = 'true';
      const transition = document.startViewTransition(() => {
        if (requestedRun === runId) render(index);
      });
      activeTransition = transition;
      // A newer stage choice deliberately skips this transition. Chromium rejects
      // ready on that path even though finished is handled below.
      void transition.ready.catch(() => {});
      try { await transition.finished; } catch (_) { /* A paused or hidden tab skips the visual transfer. */ }
      if (activeTransition === transition) activeTransition = null;
      if (!activeTransition) root.dataset.vt = 'false';
    }
    function pauseSequence(manual = false) {
      clear();
      if (manual) manuallyPaused = true;
      if (!complete) state('paused');
    }
    async function advance() {
      if (document.hidden || !inView || manuallyPaused) { pauseSequence(); return; }
      if (stage >= 2) { complete = true; state('complete'); return; }
      const thisRun = runId;
      await moveTo(stage + 1);
      if (thisRun !== runId || root.dataset.motionState !== 'playing') return;
      if (!inView) { pauseSequence(); return; }
      if (stage === 2) { complete = true; state('complete'); }
      else timer = window.setTimeout(advance, dwellMs);
    }
    function start(reset = false) {
      clear();
      hasStarted = true;
      manuallyPaused = false;
      complete = false;
      if (reset || stage >= 2) render(0);
      if (reducedMotion.matches) { render(2); complete = true; state('complete'); return; }
      if (!inView || document.hidden) { state('paused'); return; }
      state('playing');
      timer = window.setTimeout(advance, dwellMs);
    }
    stages.forEach(button => button.addEventListener('click', () => {
      clear(); hasStarted = true; manuallyPaused = true; complete = false;
      state('paused');
      moveTo(Number(button.dataset.stage));
    }));
    play.addEventListener('click', () => start());
    pause.addEventListener('click', () => { hasStarted = true; pauseSequence(true); });
    replay.addEventListener('click', () => start(true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && root.dataset.motionState === 'playing') pauseSequence();
      else if (!document.hidden && inView && hasStarted && !manuallyPaused && !complete && root.dataset.motionState === 'paused') start();
    });
    observer = new IntersectionObserver(entries => {
      const currentHandoff = scenes[stage].querySelector('[data-handoff]');
      const entry = entries.find(item => item.target === currentHandoff);
      if (!entry) return;
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.75;
      if (!inView && root.dataset.motionState === 'playing' && !activeTransition) pauseSequence();
      else if (inView && !document.hidden && !reducedMotion.matches) {
        if (!hasStarted) start();
        else if (!manuallyPaused && !complete && root.dataset.motionState === 'paused') start();
      }
    }, { threshold: [0, 0.75] });
    observer.observe(scenes[0].querySelector('[data-handoff]'));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches && root.dataset.motionState === 'playing') { clear(); state('reduced'); }
    });
    root.querySelectorAll('button[disabled]').forEach(button => { button.disabled = false; });
    root.classList.add('is-ready');
    render(0);
    state(reducedMotion.matches ? 'reduced' : 'idle');
    return { render, pause: () => { complete = false; pauseSequence(true); } };
  }

  const outreach = document.querySelector('[data-signal-demo]');
  if (outreach) {
    const sequence = setupSequence(outreach, 'signal');
    outreach.querySelectorAll('[data-prospect]').forEach(button => button.addEventListener('click', () => {
      const record = prospects[button.dataset.prospect];
      if (!record) return;
      outreach.querySelectorAll('[data-prospect]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      outreach.querySelectorAll('[data-field]').forEach(field => {
        if (record[field.dataset.field]) field.textContent = record[field.dataset.field];
      });
      outreach.querySelector('[data-draft-name]').textContent = record.name;
      outreach.querySelector('[data-draft-initials]').textContent = record.initials;
      outreach.querySelector('.sp-chat-draft span').textContent = record.draftStatus;
      outreach.querySelector('.sp-fit-verdict').classList.toggle('is-held', button.dataset.prospect !== 'maya');
      sequence.pause();
      sequence.render(1);
    }));
  }

  const carousel = document.querySelector('[data-carousel-demo]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('[data-slide]')];
    const count = carousel.querySelector('[data-carousel-count]');
    let current = 0;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      count.textContent = `${current + 1} / ${slides.length}`;
    }
    carousel.querySelectorAll('button[disabled]').forEach(button => { button.disabled = false; });
    carousel.querySelector('[data-carousel="prev"]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-carousel="next"]').addEventListener('click', () => show(current + 1));
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.classList.add('is-ready');
    show(0);
  }

  const inbound = document.querySelector('[data-reader-demo]');
  if (inbound) setupSequence(inbound, 'reader');
})();
