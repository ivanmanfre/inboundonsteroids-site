(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveals ----
  var revs = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    },{threshold:.15, rootMargin:'0px 0px -8% 0px'});
    revs.forEach(function(el){ ro.observe(el); });
  } else {
    revs.forEach(function(el){ el.classList.add('is-in'); });
  }

  // ---- count-up ----
  function fmt(v,dec){ return Number(v.toFixed(dec)).toLocaleString('en-US'); }
  function runCount(el){
    var to = parseFloat(el.dataset.to);
    var from = parseFloat(el.dataset.from || 0);
    var dec = parseInt(el.dataset.dec || 0,10);
    var pre = el.dataset.prefix || '';
    var suf = el.dataset.suffix || '';
    if(reduce){ el.textContent = pre + fmt(to,dec) + suf; return; }
    var dur = 1500, start = null;
    function tick(ts){
      if(start===null) start = ts;
      var p = Math.min(1,(ts-start)/dur);
      var e = 1 - Math.pow(1-p,3);
      el.textContent = pre + fmt(from + (to-from)*e, dec) + suf;
      if(p<1) requestAnimationFrame(tick);
      else el.textContent = pre + fmt(to,dec) + suf;
    }
    requestAnimationFrame(tick);
  }
  var counts = document.querySelectorAll('.count');
  if('IntersectionObserver' in window){
    var co = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ runCount(e.target); co.unobserve(e.target); }
      });
    },{threshold:.5});
    counts.forEach(function(el){ co.observe(el); });
  } else {
    counts.forEach(function(el){ runCount(el); });
  }

  // ---- loop flow: rail draw + sequential step light-up ----
  var loopSec = document.getElementById('loop');
  var flow = document.getElementById('flow');
  if(loopSec && flow){
    var steps = flow.querySelectorAll('.fstep');
    var lightUp = function(){
      loopSec.classList.add('go');
      if(reduce){ steps.forEach(function(s){ s.classList.add('lit'); }); return; }
      steps.forEach(function(s,i){ setTimeout(function(){ s.classList.add('lit'); }, 220 + i*340); });
    };
    if('IntersectionObserver' in window){
      var lo = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ lightUp(); lo.disconnect(); } });
      },{threshold:.3});
      lo.observe(flow);
    } else { lightUp(); }
  }

  // ---- phone feed auto-advance ----
  var feed = document.getElementById('feed');
  if(feed && !reduce){
    var posts = feed.querySelectorAll('.post');
    var idx = 0, timer = null, paused = false;
    var step = function(){
      if(paused) return;
      idx = (idx + 1) % posts.length;
      var target = (idx === 0) ? 0 : posts[idx].offsetTop - 8;
      feed.scrollTo({ top: target, behavior: 'smooth' });
    };
    var start = function(){ if(!timer) timer = setInterval(step, 2600); };
    var stop = function(){ clearInterval(timer); timer = null; };
    feed.addEventListener('mouseenter', function(){ paused = true; });
    feed.addEventListener('mouseleave', function(){ paused = false; });
    feed.addEventListener('touchstart', function(){ paused = true; }, {passive:true});
    if('IntersectionObserver' in window){
      var fo = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting) start(); else stop(); });
      },{threshold:.3});
      fo.observe(feed);
    } else { start(); }
  }
})();

// ---- index list: cursor-follow image reveal ----
(function(){
  if(!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches)) return;
  document.querySelectorAll('.crow').forEach(function(row){
    var img = row.querySelector('.cr-img');
    if(!img) return;
    row.addEventListener('mousemove', function(e){
      img.style.left = (e.clientX + 36) + 'px';
      img.style.top = (e.clientY - 110) + 'px';
    });
  });
})();
