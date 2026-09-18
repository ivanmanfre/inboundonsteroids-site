(function () {
  'use strict';

  // "see more" on the LinkedIn cards and the carousel caption
  document.querySelectorAll('[data-more]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    var more = btn.getAttribute('data-more');
    var less = btn.getAttribute('data-less');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      target.classList.toggle('clamped', open);
      btn.textContent = open ? more : less;
    });
  });

  // topic map: lane filter + show all
  (function () {
    var grid = document.getElementById('topic-grid');
    if (!grid || !document.querySelector('.show-all')) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.topic'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('button.lane-chip'));
    var showAll = document.querySelector('.show-all');
    var count = document.querySelector('.topics-count');
    var lane = 'all';
    var expanded = false;
    function render() {
      var shown = 0;
      cards.forEach(function (c) {
        var on = lane === 'all' ? (expanded || c.getAttribute('data-top') === '1') : c.getAttribute('data-lane') === lane;
        c.hidden = !on;
        if (on) shown++;
      });
      chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lane') === lane)); });
      showAll.hidden = lane !== 'all';
      showAll.setAttribute('aria-expanded', String(expanded));
      showAll.textContent = expanded ? 'Show the strongest 8' : 'Show all ' + cards.length + ' topics';
      count.textContent = 'Showing ' + shown + ' of ' + cards.length;
    }
    chips.forEach(function (b) { b.addEventListener('click', function () { lane = b.getAttribute('data-lane'); render(); }); });
    showAll.addEventListener('click', function () { expanded = !expanded; render(); });
    render();
  })();

  // carousel: native scroll snap for touch, buttons and arrow keys on top
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.car-track');
    var slides = track ? track.querySelectorAll('img') : [];
    if (!slides.length) return;
    var prev = root.querySelector('.car-prev');
    var next = root.querySelector('.car-next');
    var count = root.querySelector('.car-count');
    var dotsBox = root.querySelector('.car-dots');
    var total = slides.length;
    var index = 0;
    var lockUntil = 0;
    var dots = [];

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    for (var i = 0; i < total; i++) {
      (function (n) {
        var d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', 'Go to slide ' + (n + 1));
        d.addEventListener('click', function () { go(n); });
        dotsBox.appendChild(d);
        dots.push(d);
      })(i);
    }

    function render() {
      prev.disabled = index === 0;
      next.disabled = index === total - 1;
      count.textContent = pad(index + 1) + ' / ' + pad(total);
      dots.forEach(function (d, n) { d.setAttribute('aria-current', String(n === index)); });
    }

    function go(n) {
      index = Math.max(0, Math.min(total - 1, n));
      lockUntil = Date.now() + 700; // ignore scroll readings while the smooth scroll runs
      track.scrollTo({ left: index * track.clientWidth });
      render();
    }

    prev.addEventListener('click', function () { go(index - 1); });
    next.addEventListener('click', function () { go(index + 1); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    });

    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking || Date.now() < lockUntil) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var n = Math.round(track.scrollLeft / track.clientWidth);
        if (n !== index && n >= 0 && n < total) { index = n; render(); }
      });
    }, { passive: true });

    window.addEventListener('resize', function () {
      track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' });
    });

    render();
  });
})();
