(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prospects = {
    maya: {
      initials: 'MR', name: 'Maya R.', role: 'Founder at a creative agency',
      profile: 'Runs a small creative team serving growing brands.',
      decision: 'Review for outreach',
      fit: 'Founder role and agency fit the agreed buyer profile. Check offer and company size.',
      history: 'Check prior contact and exclusions before approving a draft.',
      draft: 'Hi Maya, saw you in the discussion about referrals and agency pipeline. I put together a short breakdown of where warm leads get lost. Want me to send it?',
      draftStatus: 'Draft for review · unsent'
    },
    leo: {
      initials: 'LM', name: 'Leo M.', role: 'Head of growth at a lead-generation provider',
      profile: 'His company sells pipeline and lead-generation services.',
      decision: 'Hold: agency peer',
      fit: 'His company sells lead generation, so it falls under this sample campaign’s peer exclusion.',
      history: 'No outreach while this person is outside the agreed buyer set.',
      draft: 'No message draft. This person works at a peer agency.',
      draftStatus: 'No draft prepared'
    },
    ava: {
      initials: 'AC', name: 'Ava C.', role: 'Operations lead at a logistics company',
      profile: 'Works in logistics operations.',
      decision: 'Hold: outside buyer profile',
      fit: 'The role and company do not match this campaign.',
      history: 'Leave out of this campaign. There is no reason to prepare a message.',
      draft: 'No message draft. The role and company do not fit this campaign.',
      draftStatus: 'No draft prepared'
    }
  };
  const copy = {
    signal: [
      ['Start with the discussion.', 'The post supplies the topic. Maya’s reaction says she noticed it; it does not tell us that she has this problem.'],
      ['Check the business and history.', 'This sample seeks creative-agency founders. Role, company, prior contact and peer exclusions decide whether a message makes sense.'],
      ['Write with the right context.', 'The draft refers to the public discussion and offers something useful. It stays unsent until reviewed.']
    ],
    reader: [
      ['It starts with the founder.', 'A sales question or observation becomes source material. The founder checks that the claim and any client detail can be published.'],
      ['Give the reader a useful point.', 'The post carries one idea from the agency’s work and offers a specific worksheet.'],
      ['The reader asks for more.', 'MAP is an explicit request. The resource can be delivered when the LinkedIn connection path permits.']
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
