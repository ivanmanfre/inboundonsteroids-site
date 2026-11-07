#!/usr/bin/env python3
"""Builds ~/Desktop/inboundonsteroids-proof-wt/proof/index.html from real threads.
Every message below is copied from outreach_messages (pulled 2026-11-07). Edits: names/emails
redacted with R(), long messages shortened with an ellipsis. Nothing else is changed."""
import html, os, urllib.parse

OUT = os.path.expanduser('~/Desktop/inboundonsteroids-proof-wt/proof/index.html')
RD = '\x00'  # redaction marker

def R(n=5):
    return RD + str(n) + RD

def esc(t):
    parts = t.split(RD)
    out = []
    for i, p in enumerate(parts):
        if i % 2 == 1:
            out.append(f'<span class="rd" aria-label="removed">{"x" * int(p)}</span>')
        else:
            out.append(html.escape(p).replace('\n', '<br>'))
    return ''.join(out)

def initials_av(txt):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112"><rect width="112" height="112" fill="#d7d2c8"/>'
           f'<text x="56" y="68" font-size="34" text-anchor="middle" font-family="Arial" fill="#555">{txt}</text></svg>')
    return 'data:image/svg+xml,' + urllib.parse.quote(svg)

SEATS = {
    'arch': dict(name='Davorin Smit', org='ARCH', av='assets/davorin-av.jpg', who='Davorin Smit · ARCH'),
    'rise': dict(name='Mattan Danino', org='RISE DTC', av='assets/mattan-av.webp', who='Mattan Danino · RISE DTC'),
    'ivan': dict(name='Ivan Manfredi', org='InboundOnSteroids', av='assets/ivan-av.webp', who='Ivan Manfredi · my own account'),
}

CHAINS = [
    dict(seat='arch', company='Funcell Games', role='CEO', ini='FG', outcome='Call booked',
         signal="Engaged with Raf Mertens's posts",
         dates=[('Nov 3', 'Invite with a note'), ('Nov 3', 'He replies and asks how'), ('Nov 3', 'Call booked')],
         msgs=[('us', 'Nov 3', f"Hey {R(7)}, Davorin here :) I saw you around Raf Mertens's posts. We're in the same corner of gaming UA, so I figured I should say Hi."),
               ('them', 'Nov 3', '"Hi Davorin, it’s great to connect with you. Looking forward to staying in touch." Would also love to know how can you help us grow our title “Pawn to Don”'),
               ('us', 'Nov 3', 'Great to connect too :)\n\nWe find creators whose audience fits the game, arrange the paid promotions, negotiate the rates and manage the campaign for you. The goal is bringing in players, so we measure attributed installs and what each install costs.\n\nWe’re mostly focused on the US and EU. Which markets are you pushing Pawn to Don in?'),
               ('them', 'Nov 3', 'US and EU mainly'),
               ('them', 'Nov 3', 'So how do we start'),
               ('them', 'Nov 3', 'Done Tuesday 8am uk')]),
    dict(seat='rise', company='Quip Protein Soda', role='Co-founder', ini='QP', outcome='Call booked',
         signal="Engaged with Darren Viscount's posts",
         dates=[('Sep 16', 'Invite with a note'), ('Sep 16', 'He says yes'), ('Sep 17', 'Call booked')],
         msgs=[('us', 'Sep 16', "Hey " + R(5) + ", saw you around Darren Viscount's posts. We grow DTC brands at RISE and only get paid on the growth we create, would love to connect."),
               ('them', 'Sep 16', 'yes.  let me know or send an invite to ' + R(16)),
               ('us', 'Sep 16', 'Sure thing -- you can pick a time to chat here: meetings.hubspot.com/mattan5')]),
    dict(seat='arch', company='Plus500 Canada', role='CEO', ini='P5', outcome='Call booked',
         signal="Engaged with a post by David Zruia",
         dates=[('Oct 28', 'Blank invite, no note'), ('Oct 28', 'He asks about Canada'), ('Oct 28', 'Call booked')],
         msgs=[('them', 'Oct 28', 'Hi Davorin, pleasure to connect.'),
               ('them', 'Oct 28', 'Are you active in Canada?'),
               ('us', 'Oct 28', f"Likewise {R(5)}! Yes, we're active in Canada and work with Canadian creators.\n\nHere’s our deck with some info: madebyarch.com/deck\n\nAre you open to a intro chat? Next Monday 10.30 or Tuesday 8.30am ET"),
               ('them', 'Oct 28', f"Thanks Davorin, and yes, I'd love to chat. Can you send me an invite for Monday 10:30 ET? My email is {R(18)}. Thx."),
               ('us', 'Oct 28', f'Sent. Talk soon {R(5)} :)')]),
    dict(seat='rise', company='The Heart Company', role='Founder and CEO', ini='HC', outcome='Call held',
         signal="Engaged with Rich Gersten's posts",
         dates=[('Sep 10', 'Invite with a note'), ('Sep 10', 'She asks to meet'), ('Sep 11', 'Call booked, then held')],
         msgs=[('us', 'Sep 10', f"Hey {R(8)}, saw you around Rich Gersten's posts. We grow DTC brands at RISE, would love to connect."),
               ('them', 'Sep 10', 'Hi Mattan, Happy to connect. Would love to learn more about RISE. Shall we plan an e-meeting?'),
               ('us', 'Sep 10', 'Awesome -- let’s chat\n\nBook me here: meetings.hubspot.com/mattan5'),
               ('them', 'Sep 11', 'Me too. I booked it for next Thursday.✅')]),
    dict(seat='rise', company='urture', role='Founder', ini='UR', outcome='Call booked',
         signal="Engaged with Eoin Comerford's posts",
         dates=[('Nov 2', 'Invite with a note'), ('Nov 3', 'He replies with context'), ('Nov 4', 'Call booked')],
         msgs=[('us', 'Nov 2', f"Hey {R(4)}, saw you around Eoin Comerford's posts. We grow e-commerce brands at RISE and our fee is tied to the growth we create, would love to connect."),
               ('them', 'Nov 3', 'Yes would lile to talk. Most of our business is being grown in B2B bulk sales but want to start to grow our D2C'),
               ('us', 'Nov 3', f"Hey {R(4)}, would love to chat\n\nWe’ve worked with a bunch of apparel brands over the years, a few of them mostly wholesale\n\nI have a spot this Thursday at 1pm ET. If that works, what's the best email to send the invite to?"),
               ('them', 'Nov 4', 'That should work.\n' + R(14)),
               ('us', 'Nov 4', 'Perfect, just sent you the invite. Talk soon!')]),
    dict(seat='ivan', company='AKG Media', role='Founder', ini='AK', outcome='Call booked',
         signal="Engaged with Suhit Amin's content",
         dates=[('Oct 23', 'Invite, then one idea for his posts'), ('Oct 23', 'He says send it'), ('Oct 27', 'Call booked')],
         msgs=[('us', 'Oct 23', f"Hey {R(5)}, saw you around Suhit Amin's content \U0001F602 figured I'd say hi."),
               ('us', 'Oct 23', f"Happy Friday {R(5)} \U0001F642\n\nHope you don't mind, went through your profile before reaching out, one quick idea that could benefit your LinkedIn inbound.\n\n- Your post lists seven creator-fit questions. Turn them into a scorecard AI marketing leads can run on a shortlist.\n\n… May I send you your complete plan?"),
               ('them', 'Oct 23', 'feel free'),
               ('us', 'Oct 23', f"Here u go: inboundonsteroids.com/scan/{R(10)}\n\nHave a look, and if it sounds like we could give you a hand I'll demo how it works live :)"),
               ('us', 'Oct 26', f'Hey {R(5)} did u have a chance to take a look?'),
               ('them', 'Oct 27', 'just booked')]),
]

INBOX = [
    ('Booked', "If we are only spending against growth, I have an unlimited budget, but I won't pay an agency a retainer", 'VP Sales and Marketing · Panther Vision'),
    ('Booked', 'Do you have any materials i can review? Very timely as we are actively looking for a meta ads expert/creative strategist.', 'Co-founder · Good Candy'),
    ('Booked', 'sure, pls do, but I cant promise you anything', 'Strategic Partnerships · Pixel Federation'),
    ('Sent to a colleague', 'Please, reach out to our CMO', 'CEO and Co-founder · Global Work AI'),
    ('Not yet', 'Online only like $2k. I have a friend who works in marketing and he also only works with brands over $10k/month so I assume I’m not. But if you wanted to tell me about your business or try me in 6 months.', 'Founder · DTC brand'),
    ('No', 'Thanks Matt. We don’t work with external agencies for ads. Its all in-house.', 'CEO · e-commerce brand'),
    ('No', 'Yes we are but we have an internal team that manages this', 'Director, Performance Marketing · game publisher'),
    ('No', 'No thanks. All the best!', 'GM, Growth and Strategy · coffee brand'),
]

BRANDS = [
    ('Pixel Federation', 'Strategic Partnerships', 'ARCH'), ('ZiMAD', 'Chief Business Development Officer', 'ARCH'),
    ('Plus500', 'CEO, Plus500 Canada', 'ARCH'), ('Funcell Games', 'CEO', 'ARCH'),
    ('Good Candy', 'Co-founder', 'RISE DTC'), ('Quip', 'Co-founder, Quip Protein Soda', 'RISE DTC'),
    ('Panther Vision', 'VP Sales and Marketing', 'RISE DTC'), ('Maison Monravel', 'Co-founder and CEO', 'RISE DTC'),
    ('AKG Media', 'Founder', 'Ivan'), ('Botpresso', 'Founder', 'Ivan'),
]


def chain_html(c, i):
    s = SEATS[c['seat']]
    side = 'flip' if i % 2 else ''
    posts = []
    for who, d, txt in c['msgs']:
        if who == 'us':
            av, nm, sub = s['av'], s['name'], f"{s['org']} · {d}"
        else:
            av, nm, sub = initials_av(c['ini']), c['role'], f"{c['company']} · {d}"
        posts.append(f'<article class="post{" them" if who == "them" else ""}"><div class="top"><img src="{av}" width="112" height="112" alt="" loading="lazy"><div><b>{html.escape(nm)}</b><span>{html.escape(sub)}</span></div><em>in</em></div><p>{esc(txt)}</p></article>')
    dates = ''.join(f'<li><span class="mono">{d}</span><span>{html.escape(t)}</span></li>' for d, t in c['dates'])
    return f'''
<article class="chain {side}">
  <div class="meta" data-in>
    <p class="seat">{html.escape(s['who'])}</p>
    <h3 class="disp">{html.escape(c['company'])}</h3>
    <p class="role">{html.escape(c['role'])}</p>
    <div class="signal"><span class="mono">The signal</span><p>{html.escape(c['signal'])}</p></div>
    <ol class="steps">{dates}</ol>
  </div>
  <div class="art">
    <div class="sheet prof" data-in="sheet">
      <div class="ph mini"><img class="pav" src="{s['av']}" width="112" height="112" alt="{html.escape(s['name'])}" loading="lazy"><div><div class="pn">{html.escape(s['name'])}</div><div class="pf"><b>LinkedIn</b> messages</div></div></div>
      <div class="posts">{''.join(posts)}</div>
    </div>
  </div>
</article>'''


def build():
    chains = ''.join(chain_html(c, i) for i, c in enumerate(CHAINS))
    brands = ''.join(f'<div><b class="brand">{html.escape(b)}</b><span>{html.escape(r)}<br><em>{html.escape(a)}</em></span></div>' for b, r, a in BRANDS)
    inbox = ''.join(f'<li class="{ "yes" if t=="Booked" else ("mid" if t in ("Not yet","Sent to a colleague") else "no") }"><span class="mono">{html.escape(t)}</span><p>{html.escape(q)}</p><small>{html.escape(w)}</small></li>' for t, q, w in INBOX)
    page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0F0E0D">
<title>Proof: real threads, real booked calls</title>
<link rel="preload" href="../assets/fonts/Brico.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../assets/fonts/GeistV.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../site.css">
<link rel="stylesheet" href="page.css">
<link rel="stylesheet" href="../case/assets/glance.css">
<script>document.documentElement.className = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'rm' : 'js';</script>
<meta name="description" content="Real LinkedIn threads from the accounts we run: the signal, the first message, the reply and the booked call.">
<meta property="og:title" content="Real threads, real booked calls">
<meta property="og:description" content="The signal, the first message, the reply and the booked call, from the accounts we run.">
<meta property="og:image" content="https://inboundonsteroids.com/assets/og.png">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<script src="/assets/content-pattern-attribution.js" defer></script>
<script src="/assets/site-tracking.js" defer></script>
</head>
<body>
<div class="room" aria-hidden="true"><div class="pool p1"></div><div class="pool p2"></div><div class="vig"></div></div>
<div class="grain" aria-hidden="true"></div>

<header class="nav" id="nav">
  <div class="wrap">
    <a class="mark" href="/#top" aria-label="InboundOnSteroids">inbound<b>on</b>steroids</a>
    <nav>
      <a class="t" href="/#service">The service</a>
      <a class="t" href="#threads">The threads</a>
      <a class="t" href="/#offer">Compare the plans</a>
      <a class="btn" href="https://calendly.com/im-ivanmanfredi/30min"><span class="dsk-i">Book a call with Ivan</span><span class="mob-i">Book a call</span> <i>↗</i></a>
    </nav>
  </div>
</header>

<svg id="thread" aria-hidden="true"><path class="glow" id="tg"/><path id="tl"/><g id="th"><circle r="16" fill="url(#hg)"/><circle r="4.5" fill="#F06A45"/></g>
  <defs><radialGradient id="hg"><stop offset="0" stop-color="#E5502F" stop-opacity=".75"/><stop offset="1" stop-color="#E5502F" stop-opacity="0"/></radialGradient></defs></svg>

<main id="top">

<!-- ============ HERO (landing shape) ============ -->
<section class="hero" data-stage>
  <div class="wrap">
    <div class="stage">
      <div class="cam">
        <h1 class="disp seam words" data-fit=".6" data-fit-max="138" aria-label="Each call started with a signal.">
          <span class="ln" aria-hidden="true"><span class="lt">Each call</span></span>
          <span class="ln" aria-hidden="true"><span class="lt">started with</span></span>
          <span class="ln" aria-hidden="true"><span class="lt last"><span class="swipe">a signal.</span></span></span>
        </h1>
        <div class="cut" data-cut data-headx=".498" data-ratio="1.2064" data-headw=".478"><img src="../assets/img/ivan-smile-g-1100.webp" srcset="../assets/img/ivan-smile-g-640.webp 640w, ../assets/img/ivan-smile-g-1100.webp 1100w" sizes="(max-width: 860px) 60vw, 40vw" alt="" fetchpriority="high"></div>
        <div class="tag" data-tag><i></i><span>Ivan Manfredi</span></div>
      </div>
      <div class="copy" data-copy>
        <p class="lede" data-in style="--d:.35s">These are real LinkedIn threads from accounts we run, for Davorin at ARCH, Mattan at RISE DTC and me. For each one you see what the person engaged with first, what we sent, what they said back and the call.</p>
        <div class="ctas" data-in style="--d:.5s">
          <a class="btn big" href="https://calendly.com/im-ivanmanfredi/30min">Book a call with Ivan <i>↗</i></a>
          <a class="link" href="#threads">Read the threads ↓</a>
        </div>
      </div>
    </div>
  </div>
  <i class="tp" data-x="-.02" data-mx="-.04"></i>
</section>

<!-- ============ AT A GLANCE ============ -->
<section class="cs-glance pf-glance" aria-label="Booked calls">
  <div class="wrap">
    <p class="lbl" data-in>Booked calls with</p>
    <div class="g" data-in style="--d:.1s">{brands}</div>
  </div>
</section>

<!-- ============ HOW IT RUNS ============ -->
<section class="cs-loop">
  <div class="wrap">
    <div class="head">
      <div>
        <div class="seam zoom"><div class="cam" data-creep><h2 class="disp">We start from what they did.</h2></div></div>
        <p class="lede" data-in style="--d:.2s">Nobody here came off a bought list. Each person engaged with a post in their own market first, and the first message says where we saw them.</p>
      </div>
    </div>
    <ol class="lanes four" data-in>
      <li><b>Signal</b><span>A like or comment on a post by someone their buyers follow</span></li>
      <li><b>Fit check</b><span>Owner or decision maker, the right size, the right market</span></li>
      <li><b>Message</b><span>Sent from the founder's own account, in their voice</span></li>
      <li><b>Call</b><span>Every reply handled through to a time on their calendar</span></li>
    </ol>
  </div>
  <i class="tp" data-x=".985" data-mx=".975" style="margin-top:60px"></i>
</section>

<!-- ============ THE THREADS ============ -->
<section class="pf-threads" id="threads">
  <div class="wrap">
    <div class="seam"><div class="cam" data-creep><h2 class="disp">Six threads, start to call.</h2></div></div>
    <p class="lede" data-in style="--d:.2s">Copied from the LinkedIn inboxes. Names and emails removed, long messages shortened.</p>
    {chains}
  </div>
  <i class="tp" data-x=".985" data-mx=".975" style="margin-top:50px"></i>
</section>

<!-- ============ MID CTA ============ -->
<section class="cs-band">
  <div class="wrap">
    <p class="flow" data-in>Want threads like these in your inbox?</p>
    <div class="ctas" data-in style="--d:.1s"><a class="btn" href="https://calendly.com/im-ivanmanfredi/30min">Book a call <i>↗</i></a></div>
  </div>
  <i class="tp" data-x=".985" data-mx=".975" style="margin-top:50px"></i>
</section>

<!-- ============ INBOX ============ -->
<section class="pf-inbox">
  <div class="wrap">
    <div class="seam"><div class="cam" data-creep><h2 class="disp">Not every reply is a yes.</h2></div></div>
    <p class="lede" data-in style="--d:.2s">First replies from the same accounts, the good and the bad.</p>
    <ul class="replies" data-in>{inbox}</ul>
  </div>
  <i class="tp" data-x=".02" data-mx=".975" style="margin-top:50px"></i>
</section>

<!-- ============ CASE STUDIES ============ -->
<section class="pf-cases">
  <div class="wrap">
    <div class="seam"><div class="cam" data-creep><h2 class="disp">The full stories.</h2></div></div>
    <div class="cases" data-in>
      <a href="/case/arch/"><span class="mono">Outbound</span><b>ARCH</b><span>Davorin Smit, influencer marketing for games and apps</span><i>→</i></a>
      <a href="/case/rise-dtc/"><span class="mono">Content + outreach</span><b>RISE DTC</b><span>Mattan Danino, growth for DTC brands</span><i>→</i></a>
      <a href="/case/kyle-hunt/"><span class="mono">Inbound</span><b>Kyle Hunt</b><span>Agency operations coach</span><i>→</i></a>
    </div>
  </div>
  <i class="tp" data-x=".985" data-mx=".975" style="margin-top:50px"></i>
</section>

<!-- ============ CLOSE ============ -->
<section class="close cs-close">
  <div class="wrap">
    <div class="grid">
      <div>
        <div class="seam zoom"><div class="cam" data-creep><h2 class="disp">We can run this for you.</h2></div></div>
        <p class="body" data-in>We find the people showing interest in your market, write the messages in your voice and take every reply through to a call.</p>
        <div class="ctas" data-in style="--d:.1s"><span class="tp-end"></span><a class="btn big" id="finalCta" href="https://calendly.com/im-ivanmanfredi/30min">Book a call <i>↗</i></a></div>
      </div>
      <div class="sheet offerplan" data-in="sheet" style="--d:.15s">
        <ul>
          <li><i>→</i><span>Prospects found from real signals in your market</span></li>
          <li><i>→</i><span>Invites and DMs written in your voice</span></li>
          <li><i>→</i><span>Custom resources for the right prospects</span></li>
          <li><i>→</i><span>Every reply handled through to a booked call</span></li>
        </ul>
        <p class="job">Nothing for you to <strong>source, write or chase</strong>.</p>
        <p class="price">Content + outreach from <b>$3k a month</b>.</p>
      </div>
    </div>
  </div>
</section>

<section class="cs-next">
  <div class="wrap">
    <p class="note">Threads from August to November 2026. These are booked calls, not signed clients.</p>
  </div>
</section>

</main>

<footer>
  <div class="wrap">
    <a class="mark" href="/#top">inbound<b>on</b>steroids</a>
    <p>Content + outreach, run for you.</p>
    <a href="https://ivanmanfredi.com/">Ivan Manfredi ↗</a>
  </div>
</footer>

<script src="../site.js" defer></script>
</body>
</html>
'''
    open(OUT, 'w').write(page)
    print('wrote', OUT, len(page))

build()
