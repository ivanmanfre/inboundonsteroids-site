/* inboundonsteroids.com /d/ - token-keyed asset pages.
   All asset content is treated as untrusted text: every value reaches the DOM
   through textContent or a validated image URL. No innerHTML with data. */
(function (global) {
  'use strict';

  var SB = 'https://bjbvqvzbzczjbatgmccb.supabase.co';
  var RES = 'https://resources.inboundonsteroids.com/get/30-post-ideas/';
  var IMG_BASE = RES + 'img/';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnZxdnpiemN6amJhdGdtY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDUwODAsImV4cCI6MjA4Mzg4MTA4MH0.yqghcn-Rw5dIFadLhvUASIeUARPvu_CyPOGayI8KyTI';
  var IMG_PREFIX = SB + '/storage/v1/object/public/';

  /* ---------- every UI string on these pages ---------- */
  var S = {
    mastAria: 'InboundOnSteroids home',
    mastNote: 'Content and outreach, run for you.',
    skip: 'Skip to content',
    loading: 'Loading.',
    badKicker: 'Link check',
    badTitle: 'This link is not valid.',
    badBody: 'Reply to the email that brought you here and I will send a fresh one.',
    soonKicker: 'Almost there',
    soonTitle: 'This one is still being written.',
    soonBody: 'Give it a little while, then open this link again. It lands in your inbox first.',
    builtFrom: 'Built from',
    footPrefix: 'Built by Ivan Manfredi from ',
    from: 'From ',
    copy: 'Copy',
    copied: 'Copied',
    copyPost: 'Copy post',
    copyAbout: 'Copy the About',
    copyBrief: 'Copy the brief',

    ideasKicker: 'Post ideas',
    ideasTitle: '30 post ideas for ',
    ideasSub: 'Every idea below grew out of something you already said. The line it came from sits inside each one.',
    ideasStoodKicker: 'Start here',
    ideasStood: 'What stood out',
    ideasWho: 'What you do, as your sources read it',
    ideasAssets: 'What you have got',
    ideasAssetsSub: 'Six things in your own sources that a reader would stop for, each one carrying the words you used.',
    ideasAll: 'The 30 ideas',
    ideasAllSub: 'Open any one for the words behind it, the reason it works, and three ways to start it.',
    tabAll: 'All',
    expandAll: 'Open all',
    collapseAll: 'Close all',
    ideaOpen: 'Open the quote and the hooks',
    ideaClose: 'Close',
    ideaWhy: 'Why this one',
    ideaHooks: 'Three ways to start it',

    voiceKicker: 'Voice',
    voiceTitle: 'How you write, ',
    voiceSub: 'Measured off your own writing, then written down so anyone putting words under your name can hold the line.',
    voiceBasis: 'What this is built on',
    voiceSummary: 'What we found',
    voiceTraits: 'What you do',
    voiceUseIt: 'Use it',
    voiceMoves: 'Signature moves',
    voiceWords: 'Words you use',
    voiceNever: 'What you never sound like',
    voiceCounted: 'The numbers behind this',
    voiceBrief: 'The brief for whoever writes with you',

    weekKicker: 'Your week',
    weekTitle: 'Five posts for ',
    weekSub: 'One a day, Monday to Friday. Each one is ready to paste, and the line it grew from sits underneath.',
    weekBefore: 'Before you post',
    weekPosts: 'The five posts',
    weekGrown: 'Grown from',

    profKicker: 'Profile',
    profTitle: 'Your profile, rewritten',
    profSub: 'What a buyer reads first, where it loses them, and the words to put there instead.',
    profDiag: 'What it costs you right now',
    profCurrent: 'What is on your profile now',
    profCurrentHead: 'Headline',
    profCurrentAbout: 'About, as it opens',
    profHeads: 'Three headlines',
    profHeadsSub: 'Pick one. The character count is what LinkedIn will show you.',
    profChars: ' characters',
    profWhy: 'Why it works',
    profAbout: 'Your About, rewritten',
    profFirst: 'Your first two lines',
    profSwap: 'Fill these in before you publish',
    profFacts: 'Where every claim came from',

    lmKicker: 'Lead magnet',
    lmSub: 'One asset your buyer would hand over an email address for.',
    lmCover: 'The cover',
    lmWhy: 'Why this one',
    lmBuyer: 'Who raises a hand',
    lmOutline: 'What goes in it',
    lmCapture: 'How to give it away',
    lmPost: 'The post that gives it away',
    lmKeyword: 'Comment keyword: ',
    lmAlts: 'Two more you could build',

    nextKicker: 'Still to come',
    nextTitle: 'Next in your inbox',
    nextSub: 'The rest of the week lands one piece at a time.',
    setKicker: 'The week',
    setTitle: 'Everything that landed',
    setSub: 'All five pieces are with you now. Keep this tab, the links stay live.',

    dayIdeas: '10 minutes',
    whatIdeas: '30 post ideas, each with the reason it fits you and three hooks.',
    dayVoice: 'Day 2',
    whatVoice: 'Your voice profile, drawn from the posts you already wrote.',
    dayWeek: 'Day 3',
    whatWeek: 'A week of posts in your voice and your brand.',
    dayProf: 'Day 4',
    whatProf: 'A profile rewrite. Three headlines and a new About.',
    dayLm: 'Day 5',
    whatLm: 'Your lead magnet. The concept, a designed cover and the post that gives it away.'
  };

  /* ---------- the five-day drip, in order ---------- */
  var DRIP = [
    { kind: 'ideas', art: 'idea-grid.png', when: S.dayIdeas, what: S.whatIdeas },
    { kind: 'voice', art: 'voice-wave.png', when: S.dayVoice, what: S.whatVoice },
    { kind: 'post_week', art: 'week-calendar.png', when: S.dayWeek, what: S.whatWeek },
    { kind: 'profile_rewrite', art: 'profile-highlight.png', when: S.dayProf, what: S.whatProf },
    { kind: 'lead_magnet', art: 'cover-stand.png', when: S.dayLm, what: S.whatLm }
  ];

  function dripIndex(kind) {
    for (var i = 0; i < DRIP.length; i++) { if (DRIP[i].kind === kind) return i; }
    return -1;
  }

  /* ---------- small DOM helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function add(parent, child) { parent.appendChild(child); return child; }
  function str(v) { return v == null ? '' : String(v); }
  function has(v) { return v != null && String(v).trim() !== ''; }
  function arr(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }

  function paras(host, value, cls) {
    var chunks = str(value).split(/\n{2,}/);
    for (var i = 0; i < chunks.length; i++) {
      var line = chunks[i].replace(/^\s+|\s+$/g, '');
      if (!line) continue;
      add(host, el('p', cls ? 't ' + cls : 't', line));
    }
    return host;
  }

  function label(word) {
    var s = str(word).replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function joinList(list) {
    var a = arr(list).map(str).filter(function (x) { return x !== ''; });
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function quoteBlock(text, source) {
    var w = el('div', 'quote');
    add(w, el('p', 'quote-text', '“' + str(text) + '”'));
    if (has(source)) add(w, el('span', 'quote-src', S.from + str(source)));
    return w;
  }

  function writeClipboard(value, done) {
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, function () { legacyCopy(value, done); });
    } else {
      legacyCopy(value, done);
    }
  }
  function legacyCopy(value, done) {
    var ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }
  function copyBtn(getValue, text) {
    var caption = text || S.copy;
    var b = el('button', 'copy', caption);
    b.type = 'button';
    b.addEventListener('click', function () {
      writeClipboard(getValue(), function () {
        b.setAttribute('data-done', '1');
        b.textContent = S.copied;
        global.setTimeout(function () {
          b.removeAttribute('data-done');
          b.textContent = caption;
        }, 1800);
      });
    });
    return b;
  }

  /* ---------- page frame ---------- */
  function masthead(host) {
    var h = add(host, el('header', 'masthead'));
    var a = add(h, el('a', 'wordmark'));
    a.href = 'https://inboundonsteroids.com/';
    a.setAttribute('aria-label', S.mastAria);
    add(a, el('span', null, 'INBOUND'));
    add(a, el('span', 'on', 'ON'));
    add(a, el('span', null, 'STEROIDS'));
    add(h, el('span', 'mast-note', S.mastNote));
    return h;
  }

  /* Decorative illustration. Hosted on resources.inboundonsteroids.com.
     If it does not load the holder removes itself, so the page never shows a gap. */
  function artFigure(cls, file) {
    if (!has(file)) return null;
    var fig = el('div', cls);
    var img = el('img');
    img.src = IMG_BASE + str(file);
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    img.addEventListener('error', function () { fig.hidden = true; });
    add(fig, img);
    return fig;
  }

  function frame(app, opts) {
    app.textContent = '';
    var band = add(app, el('section', 'band'));
    var wrap = add(band, el('div', 'wrap'));
    masthead(wrap);
    var head = add(wrap, el('div', 'head'));
    var i = dripIndex(opts.kind);
    if (i >= 0) {
      var art = artFigure('hero-art', DRIP[i].art);
      if (art) add(head, art);
    }
    if (opts.kicker) add(head, el('span', 'kicker-accent', opts.kicker));
    add(head, el('h1', null, opts.title));
    if (has(opts.sub)) add(head, el('p', 'head-sub t', opts.sub));
    var built = arr(opts.built);
    if (built.length) {
      var ul = add(head, el('ul', 'chips'));
      add(ul, el('li', 'chips-label', S.builtFrom));
      for (var i = 0; i < built.length; i++) add(ul, el('li', 'chip', built[i]));
    }
    return app;
  }

  function section(app, kicker, title, sub) {
    var sec = add(app, el('section', 'sec'));
    var wrap = add(sec, el('div', 'wrap'));
    if (kicker || title || sub) {
      var head = add(wrap, el('div', 'sec-head'));
      if (kicker) add(head, el('span', 'kicker', kicker));
      if (title) add(head, el('h2', null, title));
      if (has(sub)) {
        var p = add(head, el('p', 'note prose t', sub));
        p.style.marginTop = '14px';
      }
    }
    return wrap;
  }

  function footer(app, built) {
    var f = add(app, el('footer', 'foot'));
    var wrap = add(f, el('div', 'wrap'));
    var row = add(wrap, el('div', 'foot-in'));
    var line = joinList(built);
    add(row, el('p', 'foot-line', line ? S.footPrefix + line + '.' : ''));
    var a = add(row, el('a', 'wordmark'));
    a.href = 'https://inboundonsteroids.com/';
    a.setAttribute('aria-label', S.mastAria);
    add(a, el('span', null, 'INBOUND'));
    add(a, el('span', 'on', 'ON'));
    add(a, el('span', null, 'STEROIDS'));
    return f;
  }

  /* "Next in your inbox": the days that have not landed yet.
     On the last piece it turns into a recap of all five. */
  function nextStrip(app, kind) {
    var i = dripIndex(kind);
    if (i < 0) return;
    var last = i === DRIP.length - 1;
    var items = last ? DRIP.slice(0) : DRIP.slice(i + 1);
    if (!items.length) return;
    var w = section(
      app,
      last ? S.setKicker : S.nextKicker,
      last ? S.setTitle : S.nextTitle,
      last ? S.setSub : S.nextSub
    );
    var strip = add(w, el('ul', 'strip'));
    items.forEach(function (it) {
      var card = add(strip, el('li', 'strip-card'));
      var art = artFigure('strip-art', it.art);
      if (art) {
        art.firstChild.loading = 'lazy';
        add(card, art);
      }
      add(card, el('span', 'strip-when', it.when));
      add(card, el('p', 'strip-what', it.what));
    });
  }

  /* LinkedIn replies, rendered by the shared component on resources.inboundonsteroids.com.
     It reads proof.json next to itself. Empty file means the block stays hidden. */
  function proofMount(app) {
    var host = add(app, el('div', 'wrap proof-wrap'));
    var node = add(host, el('div', 'proof'));
    node.id = 'proof';
    node.setAttribute('data-proof-src', RES + 'proof.json');
    if (!document.getElementById('proof-css')) {
      var link = document.createElement('link');
      link.id = 'proof-css';
      link.rel = 'stylesheet';
      link.href = RES + 'proof.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('proof-js')) {
      var s = document.createElement('script');
      s.id = 'proof-js';
      s.src = RES + 'proof.js';
      s.async = true;
      document.head.appendChild(s);
    } else if (global.Proof && typeof global.Proof.mount === 'function') {
      global.Proof.mount(node);
    }
    return node;
  }

  function tail(app, kind, built, extra) {
    nextStrip(app, kind);
    proofMount(app);
    if (typeof extra === 'function') extra(app);
    footer(app, built);
  }

  function foldBlock(host, title) {
    var d = add(host, el('details', 'fold'));
    add(d, el('summary', null, title));
    return add(d, el('div', 'fold-body'));
  }

  function safeImage(url, altText) {
    var u = str(url);
    if (u.indexOf(IMG_PREFIX) !== 0) return null;
    var img = el('img');
    img.src = u;
    img.alt = str(altText);
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function linkedInCard(name, meta, body, image) {
    var card = el('article', 'li');
    var head = add(card, el('div', 'li-head'));
    var initial = str(name).replace(/^\s+/, '').charAt(0).toUpperCase() || '·';
    add(head, el('div', 'li-av', initial));
    var who = add(head, el('div', 'li-who'));
    add(who, el('div', 'li-name', name));
    if (has(meta)) add(who, el('div', 'li-meta', meta));
    paras(add(card, el('div', 'li-body')), body);
    if (image) {
      var holder = add(card, el('div', 'li-img'));
      add(holder, image);
    }
    return card;
  }

  /* ---------- renderers ---------- */
  var R = {};

  R.ideas = function (app, c) {
    frame(app, {
      kind: 'ideas',
      kicker: S.ideasKicker,
      title: S.ideasTitle + str(c.first_name),
      sub: S.ideasSub,
      built: c.built_from
    });

    if (has(c.stood_out)) {
      var w = section(app, S.ideasStoodKicker, S.ideasStood);
      paras(add(w, el('div', 'panel panel-accent lede')), c.stood_out);
    }

    if (arr(c.who_you_are).length) {
      var w2 = section(app, null, null);
      var box = add(foldBlock(w2, S.ideasWho), el('div', 'note prose'));
      arr(c.who_you_are).forEach(function (chunk) { paras(box, chunk); });
    }

    var assets = arr(c.assets);
    if (assets.length) {
      var w3 = section(app, null, S.ideasAssets, S.ideasAssetsSub);
      var grid = add(w3, el('div', 'grid-2'));
      assets.forEach(function (a) {
        var card = add(grid, el('article', 'panel panel-warm'));
        add(card, el('h3', null, a.title));
        var body = add(card, el('div', 'note'));
        body.style.marginTop = '12px';
        paras(body, a.body);
        if (has(a.quote)) add(card, quoteBlock(a.quote, a.source_label));
      });
    }

    var ideas = arr(c.ideas);
    if (!ideas.length) { tail(app, 'ideas', c.built_from); return; }

    section(app, null, S.ideasAll, S.ideasAllSub);

    var counts = {};
    var order = [];
    ideas.forEach(function (idea) {
      var b = str(idea.bucket) || 'other';
      if (!counts[b]) { counts[b] = 0; order.push(b); }
      counts[b]++;
    });

    var bar = add(app, el('div', 'bar'));
    var barIn = add(bar, el('div', 'wrap bar-in'));
    var list = add(add(app, el('div', 'wrap')), el('div', 'ideas'));

    var tabs = [];
    function makeTab(key, text, n) {
      var b = add(barIn, el('button', 'tab'));
      b.type = 'button';
      b.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
      add(b, el('span', null, text));
      add(b, el('span', 'n', String(n)));
      b.addEventListener('click', function () {
        tabs.forEach(function (t) { t.el.setAttribute('aria-pressed', t.key === key ? 'true' : 'false'); });
        var cards = list.children;
        for (var i = 0; i < cards.length; i++) {
          cards[i].hidden = !(key === 'all' || cards[i].getAttribute('data-bucket') === key);
        }
      });
      tabs.push({ key: key, el: b });
    }
    makeTab('all', S.tabAll, ideas.length);
    order.forEach(function (b) { makeTab(b, label(b), counts[b]); });
    add(barIn, el('span', 'bar-spacer'));
    var toggle = add(barIn, el('button', 'ghost', S.expandAll));
    toggle.type = 'button';
    toggle.addEventListener('click', function () {
      var open = toggle.textContent === S.expandAll;
      var cards = list.children;
      for (var i = 0; i < cards.length; i++) { if (!cards[i].hidden) cards[i].open = open; }
      toggle.textContent = open ? S.collapseAll : S.expandAll;
    });

    ideas.forEach(function (idea) {
      var card = add(list, el('details', 'idea'));
      card.setAttribute('data-bucket', str(idea.bucket) || 'other');
      var sum = add(card, el('summary'));
      var top = add(sum, el('div', 'idea-top'));
      var n = idea.n != null ? idea.n : '';
      add(top, el('span', 'idea-n', n !== '' ? (String(n).length < 2 ? '0' + n : String(n)) : ''));
      if (has(idea.bucket)) add(top, el('span', 'tag', label(idea.bucket)));
      add(sum, el('h3', null, idea.title));
      var hooks = arr(idea.hooks);
      if (hooks.length) add(sum, el('p', 'idea-hook t', hooks[0]));
      var more = add(sum, el('span', 'idea-more'));
      add(more, el('span', 'more-open', S.ideaOpen));
      add(more, el('span', 'more-close', S.ideaClose));

      var body = add(card, el('div', 'idea-body'));
      if (has(idea.angle)) add(body, el('p', 'angle t', idea.angle));
      if (has(idea.quote)) add(body, quoteBlock(idea.quote, idea.source_label));
      if (has(idea.why)) {
        add(body, el('span', 'lbl', S.ideaWhy));
        paras(add(body, el('div', 'note')), idea.why);
      }
      if (hooks.length) {
        add(body, el('span', 'lbl', S.ideaHooks));
        var hostHooks = add(body, el('div', 'hooks'));
        hooks.forEach(function (h) {
          var row = add(hostHooks, el('div', 'hook'));
          add(row, el('p', 't', h));
          add(row, copyBtn(function () { return str(h); }));
        });
      }
    });

    tail(app, 'ideas', c.built_from);
  };

  R.voice = function (app, c) {
    frame(app, {
      kind: 'voice',
      kicker: S.voiceKicker,
      title: S.voiceTitle + str(c.first_name),
      sub: S.voiceSub,
      built: c.built_from
    });

    if (has(c.basis_note)) {
      var wb = section(app, null, S.voiceBasis);
      paras(add(wb, el('div', 'panel panel-accent lede')), c.basis_note);
    }

    var summary = arr(c.summary);
    if (summary.length) {
      var ws = section(app, null, S.voiceSummary);
      var ol = add(ws, el('ol', 'numlist prose'));
      summary.forEach(function (line) { paras(add(ol, el('li', 'note')), line); });
    }

    var traits = arr(c.traits);
    if (traits.length) {
      var wt = section(app, null, S.voiceTraits);
      var grid = add(wt, el('div', 'grid-2'));
      traits.forEach(function (t) {
        var card = add(grid, el('article', 'panel'));
        add(card, el('h3', null, t.name));
        var body = add(card, el('div', 'note'));
        body.style.marginTop = '12px';
        paras(body, t.what_you_do);
        if (has(t.quote)) add(card, quoteBlock(t.quote, t.source_label));
        if (has(t.use_it)) {
          var use = add(card, el('div', 'panel panel-warm'));
          use.style.marginTop = '18px';
          add(use, el('span', 'lbl', S.voiceUseIt)).style.marginTop = '0';
          paras(add(use, el('div', 'note')), t.use_it);
        }
      });
    }

    var moves = arr(c.signature_moves);
    if (moves.length) {
      var wm = section(app, null, S.voiceMoves);
      var host = add(wm, el('div', 'stack'));
      moves.forEach(function (m) {
        var card = add(host, el('article', 'panel'));
        paras(add(card, el('div', 'note')), m.move);
        if (has(m.quote)) add(card, quoteBlock(m.quote, m.source_label));
      });
    }

    var wordCounts = arr(c.word_counts);
    var words = wordCounts.length ? wordCounts : arr(c.words_you_use).map(function (w) { return { phrase: w }; });
    if (words.length) {
      var ww = section(app, null, S.voiceWords, c.words_you_use_note);
      var holder = add(ww, el('div', 'words'));
      words.forEach(function (w) {
        var chip = add(holder, el('span', 'word'));
        add(chip, el('span', null, w.phrase));
        if (w.times != null) add(chip, el('span', 'n', String(w.times)));
      });
    }

    var never = arr(c.never_sounds_like);
    if (never.length) {
      var wn = section(app, null, S.voiceNever);
      var host2 = add(wn, el('div', 'stack'));
      never.forEach(function (x) {
        var card = add(host2, el('article', 'panel panel-warm'));
        add(card, el('h3', null, x.thing));
        var b = add(card, el('div', 'note'));
        b.style.marginTop = '10px';
        paras(b, x.evidence);
      });
    }

    var counted = arr(c.counted);
    var brief = has(c.ghostwriter_brief);
    if (counted.length || brief) {
      var wf = section(app, null, null);
      if (brief) {
        var panel = add(wf, el('div', 'panel panel-ink'));
        add(panel, el('h2', null, S.voiceBrief)).style.marginBottom = '18px';
        paras(add(panel, el('div', 'note')), c.ghostwriter_brief);
        var row = add(panel, el('div'));
        row.style.marginTop = '22px';
        add(row, copyBtn(function () { return str(c.ghostwriter_brief); }, S.copyBrief));
      }
      if (counted.length) {
        var body = foldBlock(wf, S.voiceCounted);
        var ul = add(body, el('ul', 'metrics prose'));
        counted.forEach(function (line) { add(ul, el('li', 't', line)); });
      }
    }

    tail(app, 'voice', c.built_from);
  };

  R.post_week = function (app, c) {
    frame(app, {
      kind: 'post_week',
      kicker: S.weekKicker,
      title: S.weekTitle + str(c.first_name),
      sub: S.weekSub,
      built: c.built_from
    });

    if (has(c.posting_note)) {
      var wn = section(app, null, S.weekBefore);
      paras(add(wn, el('div', 'panel panel-accent lede')), c.posting_note);
    }

    var posts = arr(c.posts);
    if (posts.length) {
      var w = section(app, null, S.weekPosts);
      posts.forEach(function (p) {
        var block = add(w, el('div', 'post-block'));
        if (has(p.day)) add(block, el('span', 'post-day', p.day));
        if (has(p.title)) add(block, el('h3', 'post-title', p.title));
        var image = p.image ? safeImage(p.image.url, p.image.copy) : null;
        var card = add(block, linkedInCard(c.name, p.day, p.body, image));
        var foot = add(card, el('div', 'li-foot'));
        add(foot, copyBtn(function () { return str(p.body); }, S.copyPost));
        if (has(p.quote)) {
          var grown = add(block, el('div', 'grown'));
          add(grown, el('span', 'lbl', S.weekGrown)).style.marginTop = '0';
          add(grown, quoteBlock(p.quote, p.source_label));
        }
      });
    }

    tail(app, 'post_week', c.built_from);
  };

  R.profile_rewrite = function (app, c) {
    frame(app, {
      kind: 'profile_rewrite',
      kicker: S.profKicker,
      title: S.profTitle,
      sub: S.profSub,
      built: c.built_from
    });

    var diagnosis = arr(c.diagnosis);
    if (diagnosis.length) {
      var wd = section(app, S.ideasStoodKicker, S.profDiag);
      var ol = add(wd, el('ol', 'numlist'));
      diagnosis.forEach(function (d) {
        var li = add(ol, el('li'));
        paras(add(li, el('div', 'note prose')), d.point);
        if (has(d.quote)) add(li, quoteBlock(d.quote, d.source_label));
      });
      var cur = c.current || {};
      if (has(cur.headline) || has(cur.about_excerpt)) {
        var body = foldBlock(wd, S.profCurrent);
        var card = add(body, el('div', 'panel panel-warm'));
        if (has(cur.headline)) {
          add(card, el('span', 'lbl', S.profCurrentHead)).style.marginTop = '0';
          add(card, el('p', 'opt-text t', cur.headline));
        }
        if (has(cur.about_excerpt)) {
          add(card, el('span', 'lbl', S.profCurrentAbout));
          paras(add(card, el('div', 'note')), cur.about_excerpt);
        }
      }
    }

    var heads = arr(c.headlines);
    if (heads.length) {
      var wh = section(app, null, S.profHeads, S.profHeadsSub);
      heads.forEach(function (h) {
        var card = add(wh, el('article', 'opt'));
        var top = add(card, el('div', 'opt-top'));
        var left = add(top, el('div'));
        if (has(h.angle)) add(left, el('span', 'tag', label(h.angle)));
        var right = add(top, el('div'));
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '12px';
        add(right, el('span', 'count', str(h.text).length + S.profChars));
        add(right, copyBtn(function () { return str(h.text); }));
        add(card, el('p', 'opt-text t', h.text));
        if (has(h.why)) {
          add(card, el('span', 'lbl', S.profWhy));
          paras(add(card, el('div', 'note')), h.why);
        }
      });
    }

    var about = c.about || {};
    if (has(about.text)) {
      var wa = section(app, null, S.profAbout);
      var card2 = add(wa, el('div', 'about-card'));
      var head = add(card2, el('div', 'ac-head'));
      add(head, el('span', 'ac-title', str(c.name)));
      add(head, copyBtn(function () { return str(about.text); }, S.copyAbout));
      paras(add(card2, el('div', 'ac-body')), about.text);
      if (has(about.first_lines_note)) {
        var note = add(wa, el('div', 'panel panel-warm prose'));
        note.style.marginTop = '20px';
        add(note, el('span', 'lbl', S.profFirst)).style.marginTop = '0';
        paras(add(note, el('div', 'note')), about.first_lines_note);
      }
    }

    var swaps = arr(c.swap_notes);
    if (swaps.length) {
      var ws = section(app, null, S.profSwap);
      var ul = add(ws, el('ul', 'ticks prose'));
      swaps.forEach(function (s) { add(ul, el('li', 't', s)); });
    }

    var facts = arr(about.facts_used);
    if (facts.length) {
      var wf = section(app, null, null);
      var body2 = foldBlock(wf, S.profFacts);
      var host = add(body2, el('div', 'stack'));
      facts.forEach(function (f) {
        var card3 = add(host, el('article', 'panel panel-warm'));
        add(card3, el('p', 't', f.claim)).style.fontWeight = '600';
        if (has(f.quote)) add(card3, quoteBlock(f.quote, f.source_label));
      });
    }

    tail(app, 'profile_rewrite', c.built_from);
  };

  R.lead_magnet = function (app, c) {
    var k = c.concept || {};
    frame(app, {
      kind: 'lead_magnet',
      kicker: S.lmKicker,
      title: str(k.title),
      sub: has(k.promise) ? k.promise : S.lmSub,
      built: c.built_from
    });

    var cover = c.cover || {};
    var wc = section(app, null, S.lmCover);
    if (has(k.format)) {
      var meta = add(wc, el('div'));
      meta.style.margin = '-12px 0 22px';
      add(meta, el('span', 'tag', label(k.format)));
    }
    var img = safeImage(cover.url, str(cover.title));
    if (img) {
      var frameBox = add(wc, el('div', 'cover-frame'));
      add(frameBox, img);
    } else {
      var ph = add(wc, el('div', 'cover-ph'));
      if (has(cover.hook)) add(ph, el('div', 'ph-hook', cover.hook));
      add(ph, el('h3', null, str(cover.title) || str(k.title)));
      var bullets = arr(cover.bullets);
      if (bullets.length) {
        var ul = add(ph, el('ul'));
        bullets.forEach(function (b) { add(ul, el('li', null, b)); });
      }
      var mark = add(ph, el('div', 'ph-mark'));
      add(mark, el('span', null, 'INBOUND'));
      add(mark, el('span', 'on', 'ON'));
      add(mark, el('span', null, 'STEROIDS'));
    }
    if (has(k.why_this_one)) {
      var ww = section(app, null, S.lmWhy);
      var box = add(ww, el('div', 'note prose'));
      paras(box, k.why_this_one);
      if (has(k.quote)) add(ww, quoteBlock(k.quote, k.source_label));
      if (has(k.buyer)) {
        var who = add(ww, el('div', 'panel panel-warm prose'));
        who.style.marginTop = '24px';
        add(who, el('span', 'lbl', S.lmBuyer)).style.marginTop = '0';
        paras(add(who, el('div', 'note')), k.buyer);
      }
    }

    var outline = arr(k.outline);
    if (outline.length) {
      var wo = section(app, null, S.lmOutline);
      var ol = add(wo, el('ol', 'numlist prose'));
      outline.forEach(function (o) {
        var li = add(ol, el('li'));
        add(li, el('h3', null, o.heading));
        paras(add(li, el('div', 'note')), o.what_goes_in);
      });
    }

    if (has(k.capture_note)) {
      var wcap = section(app, null, S.lmCapture);
      paras(add(wcap, el('div', 'panel panel-warm note prose')), k.capture_note);
    }

    var post = c.giveaway_post || {};
    if (has(post.body)) {
      var wp = section(app, null, S.lmPost);
      var card = add(wp, linkedInCard(c.name, null, post.body, null));
      var foot = add(card, el('div', 'li-foot'));
      add(foot, copyBtn(function () { return str(post.body); }, S.copyPost));
      if (has(post.keyword)) add(foot, el('span', 'k', S.lmKeyword + str(post.keyword)));
    }

    var alts = arr(k.alternates);
    if (alts.length) {
      var wa = section(app, null, null);
      var body = foldBlock(wa, S.lmAlts);
      var host = add(body, el('div', 'stack'));
      alts.forEach(function (a) {
        var card2 = add(host, el('article', 'panel panel-warm'));
        add(card2, el('h3', null, a.title));
        if (has(a.format)) {
          var row = add(card2, el('div'));
          row.style.margin = '12px 0';
          add(row, el('span', 'tag', label(a.format)));
        }
        paras(add(card2, el('div', 'note')), a.promise);
      });
    }

    tail(app, 'lead_magnet', c.built_from, function (host) {
      var slot = add(host, el('div', 'wrap slot panel panel-warm prose'));
      slot.setAttribute('data-slot', 'call-ask');
      slot.hidden = true;
    });
  };

  /* ---------- states ---------- */
  function skeleton(app) {
    app.textContent = '';
    var band = add(app, el('section', 'band'));
    var wrap = add(band, el('div', 'wrap'));
    masthead(wrap);
    var head = add(wrap, el('div', 'head'));
    add(head, el('span', 'sr', S.loading));
    var widths = ['30%', '82%', '64%'];
    for (var i = 0; i < widths.length; i++) {
      var b = add(head, el('div', 'sk sk-band'));
      b.style.width = widths[i];
      b.style.height = i === 0 ? '13px' : '30px';
      if (i === 0) b.style.marginBottom = '24px';
    }
    var sec = add(app, el('div', 'wrap'));
    sec.style.marginTop = '58px';
    var rows = ['96%', '88%', '92%', '44%'];
    for (var j = 0; j < rows.length; j++) {
      var r = add(sec, el('div', 'sk sk-band'));
      r.style.width = rows[j];
    }
  }

  function renderState(app, soon) {
    app.textContent = '';
    var band = add(app, el('section', 'band'));
    var wrap = add(band, el('div', 'wrap'));
    masthead(wrap);
    var head = add(wrap, el('div', 'head'));
    add(head, el('span', 'kicker-accent', soon ? S.soonKicker : S.badKicker));
    add(head, el('h1', null, soon ? S.soonTitle : S.badTitle));
    add(head, el('p', 'head-sub', soon ? S.soonBody : S.badBody));
    footer(app, []);
  }

  /* ---------- boot ---------- */
  function unwrap(payload) {
    var row = payload;
    if (Object.prototype.toString.call(row) === '[object Array]') row = row.length ? row[0] : null;
    if (!row || typeof row !== 'object') return null;
    var content = row.content;
    if (!content || typeof content !== 'object') return null;
    if (!has(content.first_name) && has(row.first_name)) content.first_name = row.first_name;
    return content;
  }

  function show(app, kind, payload, soon) {
    var content = unwrap(payload);
    var render = R[kind];
    if (!content || !render) { renderState(app, soon); return; }
    try {
      render(app, content);
    } catch (e) {
      renderState(app, soon);
    }
  }

  function boot(kind) {
    var app = document.getElementById('app');
    if (!app) return;
    var params = new global.URLSearchParams(global.location.search);
    var soon = params.get('soon') === '1';
    skeleton(app);

    var fixture = params.get('fixture');
    if (fixture && /^[a-z0-9-]{1,24}$/.test(fixture)) {
      global.fetch('/d/fixtures/' + kind + '.' + fixture + '.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { show(app, kind, d, soon); })
        .catch(function () { show(app, kind, null, soon); });
      return;
    }

    var token = params.get('t') || '';
    if (!/^[0-9a-fA-F]{32}$/.test(token)) { show(app, kind, null, soon); return; }

    global.fetch(SB + '/rest/v1/rpc/ios_drip_page', {
      method: 'POST',
      headers: {
        'apikey': ANON,
        'Authorization': 'Bearer ' + ANON,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ p_token: token.toLowerCase(), p_kind: kind })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { show(app, kind, d, soon); })
      .catch(function () { show(app, kind, null, soon); });
  }

  global.D = { boot: boot, strings: S };
})(window);
