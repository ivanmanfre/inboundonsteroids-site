(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prospectData = {
    maya: {
      initials: 'MR', name: 'Maya R.', role: 'Founder at a DTC skincare brand',
      profile: 'Runs a consumer brand with a direct-to-consumer store.',
      decision: 'Review for outreach',
      topic: 'Engaged with a post about the gap between paid clicks and product-page action.',
      fit: 'Founder at a DTC brand. Check offer and company size against agreed criteria.',
      history: 'Check prior contact and exclusions before a draft is approved.',
      draft: 'Hi Maya, saw you reacted to the product-page discussion. Do you usually compare the ad promise with the first screen before changing creative?'
    },
    leo: {
      initials: 'LM', name: 'Leo M.', role: 'Head of growth at a performance agency',
      profile: 'Works at an agency offering similar DTC growth services.',
      decision: 'Hold: agency peer',
      topic: 'Commented on the product-page discussion.',
      fit: 'His company sells similar services. Check the agreed peer and competitor exclusions.',
      history: 'Do not prepare outreach while this profile is outside the agreed buyer set.',
      draft: 'No message draft. This person works at a peer agency, so the current buyer criteria do not support outreach.'
    },
    ava: {
      initials: 'AC', name: 'Ava C.', role: 'Operations lead at a logistics company',
      profile: 'Runs operations for a logistics business.',
      decision: 'Hold: outside buyer profile',
      topic: 'Reacted to the product-page discussion. A reaction shows topical interest only.',
      fit: 'The role and company do not match this DTC agency campaign.',
      history: 'Leave out of this campaign; there is no reason to draft a message.',
      draft: 'No message draft. The role and company do not fit this campaign.'
    }
  };
  const stageCopy = {
    signal: [
      ['Start with a relevant discussion.', 'The source post and interaction give a topic to investigate.'],
      ['Check the person and history.', 'Role, company, prior contact and exclusions decide whether outreach fits.'],
      ['Prepare a draft for review.', 'A first message tied to the post and the person’s business.']
    ],
    reader: [
      ['A useful post gives the reader a choice.', 'The carousel offers a specific product-page checklist.'],
      ['The reader asks for it.', 'PAGE is an explicit request, not a claim of sales readiness.'],
      ['Deliver the resource in messages.', 'A named request can lead to a conversation after fit is checked.']
    ]
  };

  function activate(root) {
    root.querySelectorAll('button[disabled]').forEach(button => { button.disabled = false; });
    root.classList.add('is-ready');
  }

  function setupSequence(root, kind) {
    const buttons = [...root.querySelectorAll('[data-stage]')];
    const play = root.querySelector('[data-motion="play"]');
    const pause = root.querySelector('[data-motion="pause"]');
    const replay = root.querySelector('[data-motion="replay"]');
    let stage = 0;
    let timer = null;
    let inView = false;
    let started = false;
    let userPaused = false;
    let flowPositioned = false;
    let flowFrame = 0;
    root.dataset.motionState = 'idle';
    play.setAttribute('aria-pressed', 'false');
    pause.setAttribute('aria-pressed', 'false');
    const grid = root.querySelector(kind === 'signal' ? '.sp-lab-grid' : '.sp-reader-grid');
    const flow = root.querySelector('[data-flow-stage]');
    const token = flow.querySelector('[data-flow-token]');
    const path = flow.querySelector('[data-flow-path]');
    const targets = kind === 'signal'
      ? ['.sp-lab-sourcehead', '.sp-fit-check', '.sp-li-draft']
      : ['.sp-li-post-excerpt', '.sp-keyword-comment', '.sp-chat-delivered'];

    function positionFlow(animate = false) {
      if (!animate) {
        window.cancelAnimationFrame(flowFrame);
        root.dataset.flowAnimated = 'false';
      }
      const bounds = grid.getBoundingClientRect();
      const points = targets.map(selector => {
        const box = root.querySelector(selector).getBoundingClientRect();
        return { x: Math.max(8, box.right - bounds.left - 76), y: box.top - bounds.top + 12 };
      });
      const current = points[stage];
      if (kind === 'signal') {
        const rightGutter = bounds.width - 12;
        path.setAttribute('d', `M ${points[0].x + 33} ${points[0].y + 12} V 8 H ${rightGutter} V ${points[2].y + 12} H ${points[2].x + 33}`);
      } else {
        path.setAttribute('d', `M ${points[0].x + 33} ${points[0].y + 12} L ${points[1].x + 33} ${points[1].y + 12} L ${points[2].x + 33} ${points[2].y + 12}`);
      }
      token.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      token.textContent = kind === 'signal' ? ['TOPIC', 'FIT', 'DRAFT'][stage] : 'PAGE';
      root.dataset.flowReady = 'true';
      if (!animate) flowFrame = window.requestAnimationFrame(() => { root.dataset.flowAnimated = 'true'; });
    }

    function render(index) {
      const moveToken = flowPositioned && index !== stage;
      stage = index;
      root.dataset.activeStage = String(index);
      buttons.forEach(button => {
        if (Number(button.dataset.stage) === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      root.querySelector('[data-field="readout"]').textContent = stageCopy[kind][index][0];
      root.querySelector('[data-field="readout-detail"]').textContent = stageCopy[kind][index][1];
      positionFlow(moveToken);
      flowPositioned = true;
    }
    function stop(state = 'paused') {
      if (timer) window.clearTimeout(timer);
      timer = null;
      root.dataset.motionState = state;
      play.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
      pause.setAttribute('aria-pressed', state === 'paused' ? 'true' : 'false');
    }
    function next() {
      if (document.hidden || !inView) { stop(); return; }
      if (stage >= 2) { stop('complete'); return; }
      render(stage + 1);
      if (stage === 2) stop('complete');
      else timer = window.setTimeout(next, 1400);
    }
    function start(reset = false) {
      started = true;
      userPaused = false;
      if (reset || stage === 2) render(0);
      if (reduceMotion.matches) { render(2); stop('complete'); return; }
      if (document.hidden || !inView) { stop(); return; }
      stop('playing');
      root.dataset.motionState = 'playing';
      play.setAttribute('aria-pressed', 'true');
      pause.setAttribute('aria-pressed', 'false');
      timer = window.setTimeout(next, 1400);
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      started = true;
      userPaused = true;
      stop();
      render(Number(button.dataset.stage));
    }));
    play.addEventListener('click', () => start());
    pause.addEventListener('click', () => { started = true; userPaused = true; stop(); });
    replay.addEventListener('click', () => start(true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && root.dataset.motionState === 'playing') stop();
      else if (!document.hidden && inView && started && !userPaused && root.dataset.motionState === 'paused' && !reduceMotion.matches) start();
    });
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView && root.dataset.motionState === 'playing') stop();
      else if (inView && !document.hidden && !reduceMotion.matches) {
        if (!started) start();
        else if (!userPaused && root.dataset.motionState === 'paused') start();
      }
    }, { threshold: 0.2 });
    observer.observe(root);
    new ResizeObserver(() => positionFlow(false)).observe(grid);
    document.fonts.ready.then(() => positionFlow(false));
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches && root.dataset.motionState === 'playing') stop();
    });
    render(0);
    return { render, stop: () => { userPaused = true; stop(); } };
  }

  const signal = document.querySelector('[data-signal-demo]');
  if (signal) {
    const sequence = setupSequence(signal, 'signal');
    const fields = [...signal.querySelectorAll('[data-field]')];
    const profileExtra = signal.querySelector('[data-profile-extra]');
    signal.querySelector('[data-profile-action="message"]').addEventListener('click', () => {
      const draft = signal.querySelector('.sp-li-draft');
      draft.scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'center' });
      draft.focus({ preventScroll: true });
    });
    signal.querySelector('[data-profile-action="more"]').addEventListener('click', event => {
      profileExtra.hidden = !profileExtra.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!profileExtra.hidden));
    });
    signal.querySelectorAll('[data-prospect]').forEach(button => button.addEventListener('click', () => {
      const record = prospectData[button.dataset.prospect];
      if (!record) return;
      signal.querySelectorAll('[data-prospect]').forEach(choice => {
        const selected = choice === button;
        choice.classList.toggle('is-selected', selected);
        choice.setAttribute('aria-pressed', String(selected));
      });
      fields.forEach(field => {
        if (record[field.dataset.field]) field.textContent = record[field.dataset.field];
      });
      sequence.stop();
      sequence.render(1);
    }));
    activate(signal);
    sequence.render(0);
  }

  const carousel = document.querySelector('[data-carousel-demo]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('[data-slide]')];
    const count = carousel.querySelector('[data-carousel-count]');
    let current = 0;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== current;
        slide.classList.toggle('is-active', i === current);
      });
      count.textContent = `${current + 1} / ${slides.length}`;
    }
    carousel.querySelector('[data-carousel="prev"]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-carousel="next"]').addEventListener('click', () => show(current + 1));
    show(0);
    const slideArea = carousel.querySelector('.sp-carousel');
    slideArea.setAttribute('role', 'region');
    slideArea.setAttribute('aria-roledescription', 'carousel');
    activate(slideArea);
  }

  const reader = document.querySelector('[data-reader-demo]');
  if (reader) {
    const sequence = setupSequence(reader, 'reader');
    const checks = [...reader.querySelectorAll('.sp-resource-checks input[type="checkbox"]')];
    const progress = reader.querySelector('[data-check-progress]');
    checks.forEach(check => check.addEventListener('change', () => {
      const selected = checks.filter(item => item.checked).length;
      progress.textContent = `${selected} of ${checks.length} page checks selected.`;
    }));
    progress.textContent = `0 of ${checks.length} page checks selected.`;
    activate(reader);
    sequence.render(0);
  }
})();
