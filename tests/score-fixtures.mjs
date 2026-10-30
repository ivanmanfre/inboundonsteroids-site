// score-status replies for the page smoke test, shaped like score_public() over what score_worker writes:
// report = score_narrative.build_report(...) + report.subject (+ report.research after Tier 2); scores = score_rubric.score(...)
// (+ tier1_overall after Tier 2). The people and companies here are made up.

const created = '2026-10-29T14:02:11Z';
const at = (s) => new Date(Date.parse(created) + s * 1000).toISOString();
const fact = (id, pillar, label, display, scope, readable = true) => ({ id, pillar, label, display: readable ? display : "couldn't read", scope, readable });

export const TOKENS = {
  running: 'runRunRunRunRunRunRunRun01',
  tier1: 'tierOneTierOneTierOneTier1',
  complete: 'completeCompleteComplete01',
  bare: 'bareBareBareBareBareBare01',
  unscored: 'unscoredUnscoredUnscored01',
  failed: 'failedFailedFailedFailed01',
  xss: 'xssXssXssXssXssXssXssXss01',
  flaky: 'flakyFlakyFlakyFlakyFlak01',
  queued: 'queuedQueuedQueuedQueued01',
  failedLate: 'failedLateFailedLateFail01',
  failedReport: 'failedReportFailedReport01',
  cached: 'cachedCachedCachedCached01',
};

const subject = {
  name: 'Maya Okafor', first_name: 'Maya',
  headline: 'Founder at Fernhill Studio | Paid social for skincare brands doing $1M+ a year',
  photo_url: 'https://media.licdn.com/dms/image/test/maya-okafor.jpg',
  linkedin_url: 'https://www.linkedin.com/in/maya-okafor/',
};

const measured = [
  fact('posts_per_week_90d', 'posts', 'Posting rate', '1.1 posts a week', 'your last 14 posts in the past 90 days'),
  fact('original_share_90d', 'posts', 'Share of posts that are original', '64% original', 'your last 14 posts in the past 90 days'),
  fact('days_since_original', 'posts', 'Last original post', '9 days ago', 'your most recent post that is not a repost'),
  fact('median_engagement_original', 'posts', 'Typical engagement per original post', '23 reactions, comments and reposts per post (median)', 'your 9 posts that are not reposts, in the past 90 days'),
  fact('format_mix', 'posts', 'Post formats', '6 text, 2 image, 1 document', 'your 9 posts that are not reposts, in the past 90 days'),
  fact('link_share', 'posts', 'Original posts that carry a link', '22% carry a link', 'your 9 posts that are not reposts, in the past 90 days'),
  fact('booking_path', 'pipeline', 'Booking path', 'A booking link is only on your website', "your profile links and your website's booking links"),
  fact('featured_count', 'profile', 'Items in Featured', '', 'your Featured section', false),
  fact('banner_set', 'profile', 'Custom banner', 'A custom banner is set', 'your profile banner'),
  fact('followers', 'profile', 'Followers', '3,412 followers', 'your follower count on your profile'),
];
const judged = [
  fact('topic_fit', 'posts', 'Posts that speak to your buyers', '4 of 9 original posts speak to your buyers', 'your last 9 original posts'),
  fact('cta_share', 'pipeline', 'Posts that ask the reader to act', '1 of 9 original posts ask the reader to act', 'your last 9 original posts'),
  fact('lead_magnet_seen', 'pipeline', 'Free resource offered', 'No free resource offered in your posts', 'your last 9 original posts'),
  fact('headline_clear', 'profile', 'Headline names buyer and result', 'Your headline names who you help and the result', 'your headline'),
  fact('banner_states_offer', 'profile', 'Banner states the offer', 'Your banner does not say what you offer', 'the words on your banner'),
  fact('about_opens_on_buyer', 'profile', 'About opens on the buyer', 'Your About opens on your own story', 'the opening lines of your About'),
  fact('proof_visible', 'profile', 'Proof on the profile', 'No client result shows on your profile', 'your headline, About, banner and Featured'),
];
const buyersNamed = [
  { name: 'Priya Raman', headline: 'Head of Growth at Lumen Skin | DTC skincare', url: 'https://www.linkedin.com/in/priya-raman-test/' },
  { name: 'Tom Hadley', headline: 'Co-founder, Oat & Ash. Clean body care, 40k customers', url: 'https://www.linkedin.com/in/tom-hadley-test/' },
  { name: 'Lea Moreau', headline: 'Ecommerce Director at Belle Rive Cosmetics', url: '' },
];
const peers = [
  { name: 'Jonas Reed', url: 'https://www.linkedin.com/in/jonas-reed-test/', headline: 'Paid social for beauty brands | Founder at Reed & Co', posts_per_week_90d: 3.2, median_engagement_original: 61, original_share_90d: 0.91 },
  { name: 'Ana Silva', url: 'https://www.linkedin.com/in/ana-silva-test/', headline: 'Meta ads for DTC skincare. 8 years, 60+ brands', posts_per_week_90d: 2.4, median_engagement_original: 38.5, original_share_90d: 0.8 },
  { name: 'Ben Carter', url: 'https://www.linkedin.com/in/ben-carter-test/', headline: 'Growth partner to health and beauty founders', posts_per_week_90d: 0.7, median_engagement_original: 12, original_share_90d: 0.5 },
];
const tier2 = [
  fact('buyer_share', 'posts', 'Buyers among the people who engage with you', '19 of 214 people (9%)', 'people who reacted or commented on your last 5 posts, reading the first 100 reactions and 100 comments on each'),
  { ...fact('buyers_named', 'posts', 'Buyers who engaged with you', 'Priya Raman, Tom Hadley and Lea Moreau', 'people who reacted or commented on your last 5 posts') },
  fact('competitor_buyers', 'pipeline', 'Buyers engaging with your competitors', '11 people who fit your buyer engaged with Brightline Social, Cobalt Creative and Arrow Media in the last 14 days', 'people who reacted to or commented on 23 posts by Brightline Social, Cobalt Creative and Arrow Media or their leaders in the last 14 days'),
  fact('peer_benchmark', 'posts', 'Peers in your niche', 'Jonas Reed: 3.2 posts a week, 91% original, 61 reactions, comments and reposts per original post (median); Ana Silva: ...', '3 people in your niche found by LinkedIn search, each with at least 4 original posts; their posts in the past 90 days'),
];
const audit = [
  { area: 'headline', label: 'Headline', state: 'present', today: 'Your headline reads:', quote: subject.headline, fix: 'Add the result a brand gets in the first 6 words, for example lower cost per purchase, so a buyer sees it before the cut.' },
  { area: 'about', label: 'About', state: 'present', today: 'From your About section:', quote: 'I started Fernhill in 2019 after six years in agency land. I love building teams and I believe great creative wins.\nToday we run paid social for a handful of brands we really like.', fix: 'Open your About with the brand you help and the problem you fix for them, then move your own story lower.' },
  { area: 'banner', label: 'Banner', state: 'present', today: 'Your banner has no words on it: a photo of a city skyline at dusk.', quote: '', fix: 'Put one line on your banner that says who you help and what they get, and keep the photo behind it.' },
  { area: 'booking', label: 'How a buyer books', state: 'present', today: 'Your booking page (calendly.com/fernhill/intro) is only on your website.', quote: '', fix: 'Add your Calendly link to the top of your profile so a buyer can book without leaving LinkedIn.' },
];
const narrative = {
  headline: 'Only 1 of 9 original posts ask the reader to act, so the attention you earn has nowhere to go.',
  headline_fact_ids: ['cta_share'],
  pillars: {
    profile: [
      { text: 'Your headline names who you help and the result, which is the first thing a buyer reads when they click your name.', fact_ids: ['headline_clear'], fix: 'Keep the headline and pin your best client result in Featured right under it.' },
      { text: 'No client result shows on your profile, so a buyer who likes your posts has nothing to check before booking.', fact_ids: ['proof_visible', 'banner_states_offer'], fix: 'Add one client result with a number to your banner and your About.' },
    ],
    posts: [
      { text: 'You post 1.1 posts a week and your last original post went out 9 days ago, so buyers forget you between posts.', fact_ids: ['posts_per_week_90d', 'days_since_original'], fix: 'Post 3 times a week, on the same days, for the next 6 weeks.' },
      { text: '4 of 9 original posts speak to your buyers. The rest speak to other marketers.', fact_ids: ['topic_fit'], fix: 'Write every post for a skincare founder deciding where to spend next month.' },
      { text: '19 of 214 people who engage with you look like buyers, so most of the reach lands with peers.', fact_ids: ['buyer_share'], fix: 'Reply to every comment from a founder within an hour and start a conversation there.' },
    ],
    pipeline: [
      { text: '1 of 9 original posts ask the reader to act, so readers enjoy the post and move on.', fact_ids: ['cta_share'], fix: 'End 2 posts a week with one clear ask, like comment the word AUDIT for a teardown.' },
      { text: 'A booking link is only on your website, which adds a step for every buyer coming from LinkedIn.', fact_ids: ['booking_path'], fix: 'Add your booking link to your profile links and your Featured section.' },
    ],
  },
  plan_90d: [
    'Month one: end 2 posts a week with one clear ask, and add your booking link to your profile.',
    'Build one free resource for skincare founders and offer it in a post every other week.',
    'Message the buyers who engage with your posts and with your competitors, 5 a day.',
  ],
  about_them: { fact_id: 'median_engagement_original', text: 'Your posts get 23 reactions, comments and reposts each, a real audience that is ready for a next step.' },
};
const pillarScores = (overall, p1, p2, p3) => ({
  overall, tier: overall == null ? null : overall >= 75 ? 'revenue' : overall >= 45 ? 'side' : 'hobby',
  pillars: {
    profile: { score: p1, inputs: ['banner_set', 'booking_path', 'followers', 'headline_clear'], missing: ['featured_count'], normalised: { banner_set: 1, booking_path: 0.5, followers: 0.6, headline_clear: 1, banner_states_offer: 0, about_opens_on_buyer: 0, proof_visible: 0 } },
    posts: { score: p2, inputs: ['posts_per_week_90d', 'original_share_90d'], missing: [], normalised: { posts_per_week_90d: 0.43, original_share_90d: 0.64, days_since_original: 0.89, median_engagement_original: 0.57, format_mix: 1, topic_fit: 0.44 } },
    pipeline: { score: p3, inputs: ['booking_path', 'cta_share'], missing: [], normalised: p3 == null ? {} : { booking_path: 0.5, lead_magnet_seen: 0, cta_share: 0.11 } },
  },
});
const progressTier1 = [
  ['profile', 'Found Maya Okafor: 3,412 followers', 6],
  ['posts', 'Read 14 posts from the past 90 days: 9 originals, 5 reposts', 14],
  ['last_post', 'Your last original post: 9 days ago', 14],
  ['business', 'Your business: Fernhill Studio (fernhillstudio.com)', 22],
  ['buyers', 'Who buys from you: founders and growth leads at skincare and beauty brands selling online', 31],
  ['booking', 'A booking link is only on your website', 58],
  ['scores', 'Scored 49/100: profile 58, posts 55, pipeline 34', 59],
].map(([key, text, s]) => ({ key, text, at: at(s) }));
const progressDone = [
  ...progressTier1,
  { key: 'narrative', text: 'Wrote 7 fixes across your profile, posts and pipeline', at: at(84) },
  { key: 'engagers', text: 'Checked 214 people who engaged with your last 5 posts: 19 look like buyers', at: at(171) },
  { key: 'competitors', text: 'Read your competitors\' posts: 11 people who fit your buyer engaged with Brightline Social, Cobalt Creative and Arrow Media in the last 14 days', at: at(212) },
  { key: 'peers', text: 'Measured 3 peers in your niche: Jonas Reed, Ana Silva and Ben Carter', at: at(240) },
  { key: 'scores_tier2', text: 'Scored 47/100 after the deeper read: profile 58, posts 52, pipeline 31', at: at(251) },
];

const tier1Scores = pillarScores(49, 58, 55, 34);
const completeScores = { ...pillarScores(47, 58, 52, 31), tier1_overall: 49 };
const facts1 = [...measured, ...judged];

export const FIXTURES = {
  [TOKENS.queued]: { status: 'queued', progress: [], scores: null, report: null, pdf_url: null, created_at: created },
  [TOKENS.running]: { status: 'running', progress: progressTier1.slice(0, 4), scores: null, report: null, pdf_url: null, created_at: created },
  [TOKENS.tier1]: {
    status: 'tier1', progress: progressTier1, scores: tier1Scores, pdf_url: null, created_at: created,
    report: { scores: tier1Scores, facts: facts1, audit, narrative: null, subject },
  },
  [TOKENS.complete]: {
    status: 'complete', progress: progressDone, scores: completeScores, created_at: created,
    pdf_url: 'https://bjbvqvzbzczjbatgmccb.supabase.co/storage/v1/object/public/score/pdf/completeCompleteComplete01.pdf',
    report: {
      scores: completeScores, facts: [...measured, ...tier2, ...judged], audit, narrative, subject,
      research: {
        competitor_engagers: {
          count: 11, window_days: 14, posts_read: 23, engagers_read: 640,
          competitors: [{ name: 'Brightline Social', page: '', posts: 9 }, { name: 'Cobalt Creative', page: '', posts: 8 }, { name: 'Arrow Media', page: '', posts: 6 }],
          people: [
            { name: 'Rosa Lindqvist', headline: 'Founder, Saltmarsh Skincare | Clean skincare for sensitive skin', company: 'Saltmarsh Skincare', profile_url: 'https://www.linkedin.com/in/rosa-lindqvist-test/', reason: 'Founder of a skincare brand that sells online and runs its own paid social.', engaged: 'commented', competitor: 'Brightline Social', post_url: 'https://www.linkedin.com/posts/test1', post_excerpt: 'We cut CPA by a third for a skincare brand by changing one thing in the first 3 seconds of the ad.', posted_at: '2026-10-21' },
            { name: 'Daniel Osei', headline: 'Head of Ecommerce at Kora Botanics', company: 'Kora Botanics', profile_url: 'https://www.linkedin.com/in/daniel-osei-test/', reason: 'Leads ecommerce at a beauty brand and owns the ad budget.', engaged: 'reacted', competitor: 'Cobalt Creative', post_url: 'https://www.linkedin.com/posts/test2', post_excerpt: 'Creative testing framework we use for every new beauty client.', posted_at: '2026-10-24' },
            { name: 'Hannah Becker', headline: 'CEO at Nordlys Beauty', company: 'Nordlys Beauty', profile_url: 'https://www.linkedin.com/in/hannah-becker-test/', reason: 'Runs a DTC beauty brand of the size you work with.', engaged: 'commented', competitor: 'Arrow Media', post_url: 'https://www.linkedin.com/posts/test3', post_excerpt: '', posted_at: '2026-10-26' },
          ],
          notes: [
            { to: 'Rosa Lindqvist', headline: 'Founder, Saltmarsh Skincare', note: 'Hi Rosa, I run paid social for skincare brands and liked how Saltmarsh talks about sensitive skin. How are you finding Meta for new customers this year?' },
            { to: 'Hannah Becker', headline: 'CEO at Nordlys Beauty', note: 'Hi Hannah, I work with beauty founders on paid social and Nordlys caught my eye. What is the hardest part of growing past your first market right now?' },
          ],
        },
        buyers_named: buyersNamed,
        peers,
      },
    },
  },
  [TOKENS.bare]: (() => {
    const s = { ...pillarScores(44, 58, 55, null) };
    return {
      status: 'complete', created_at: created, pdf_url: null, scores: s,
      progress: [...progressTier1, { key: 'narrative', text: 'Your scores and evidence are ready; the written findings could not be finished this time', at: at(120) }],
      report: { scores: s, facts: facts1, audit: [], narrative: null, subject: { ...subject, photo_url: '' } },
    };
  })(),
  [TOKENS.unscored]: (() => {
    const s = { overall: null, tier: null, pillars: { profile: { score: null, inputs: [], missing: ['featured_count'], normalised: {} }, posts: { score: null, inputs: [], missing: [], normalised: {} }, pipeline: { score: null, inputs: [], missing: [], normalised: {} } } };
    return { status: 'complete', created_at: created, pdf_url: null, scores: s, progress: progressTier1.slice(0, 1),
      report: { scores: s, facts: measured.slice(7), audit: [], narrative: null, subject } };
  })(),
  [TOKENS.failed]: { status: 'failed', progress: [], scores: null, report: null, pdf_url: null, created_at: created },
};

// Hostile text in every place a stranger's words reach the page: the scored profile, an engager, the model's own copy.
const EVIL_NAME = '<img src=x onerror="window.__pwned=1">';
const EVIL_TEXT = '<script>window.__pwned=1</script><b id="injected">bold</b>';
FIXTURES[TOKENS.xss] = (() => {
  const base = FIXTURES[TOKENS.complete];
  const report = structuredClone(base.report);
  report.subject = { ...report.subject, name: EVIL_NAME, headline: EVIL_TEXT, photo_url: 'javascript:window.__pwned=1' };
  report.research.buyers_named[0] = { name: EVIL_NAME, headline: EVIL_TEXT, url: 'javascript:window.__pwned=1' };
  report.research.competitor_engagers.notes[0].note = EVIL_TEXT;
  report.narrative.headline = EVIL_TEXT;
  report.narrative.pillars.profile[0].text = EVIL_TEXT;
  report.audit[0].quote = EVIL_TEXT;
  return { ...base, report, progress: [...base.progress, { key: 'x', text: EVIL_TEXT, at: base.created_at }] };
})();

// A run that read the profile, then failed on its last attempt before any report: not a private profile.
FIXTURES[TOKENS.failedLate] = { status: 'failed', progress: progressTier1.slice(0, 2), scores: null, report: null, pdf_url: null, created_at: created };
// A run that wrote Tier 1, then failed in Tier 2 on its last attempt: the report is real and is shown.
FIXTURES[TOKENS.failedReport] = { ...structuredClone(FIXTURES[TOKENS.tier1]), status: 'failed' };
// A run on a subject read 4 days earlier (the 7-day cache): evidence is dated by the read, not the run.
FIXTURES[TOKENS.cached] = (() => {
  const f = structuredClone(FIXTURES[TOKENS.tier1]);
  f.report.subject = { ...f.report.subject, captured_at: '2026-10-25T09:12:00+00:00' };
  return f;
})();
