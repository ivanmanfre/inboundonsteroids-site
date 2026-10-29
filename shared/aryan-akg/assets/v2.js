(function(){
  'use strict';
  var fallback = [{"id": "carousel_caption", "label": "Carousel caption", "body": "For an AI creator campaign, I want the audience to understand what the product does within about 30 seconds.\n\nThen I’d work through the audience, the creator’s usual format and the sponsored content already in their feed. A useful shortlist needs enough context for the brand to make a decision.\n\nI put those checks in this carousel, including what I’d record before a first test goes live.\n\nIf you’re working through a shortlist, comment SKILLS and I’ll send you the four Claude skills for the campaign."}, {"id": "text_test_readout", "label": "Text post: first month readout", "body": "The first month of a creator campaign should leave you with something useful to test next.\n\nIf the creator, platform and message all change between placements, you’ve given yourself several possible explanations for the result. That gets messy when you’re deciding where the next budget should go.\n\nI’d start with a comparison the team can explain. If we’re comparing creator profiles, keep the platform and message consistent. Record what changed, then review the creative and the agreed tracking together.\n\nThe comments can also show which parts of the product people understood or asked about. Put those observations beside the numbers and keep the unanswered questions in the readout.\n\nI’d write down which creator profile to compare next, and what we need to keep consistent."}, {"id": "text_brief", "label": "Text post: creator brief", "body": "I’d love to know how many creator briefs were written by people who never had to make the video.\n\nA brief can be technically complete and still leave the creator doing a lot of guesswork. They need to know who the product is for, what someone should see it do, and which claims have to be checked. The brand also needs to settle legal boundaries before the content comes back for review.\n\nThen give the creator room to use the format their audience already likes. If they usually teach through a screen recording, let them show the product. If they tell stories, give them the use case and let them find the opening.\n\nWe run a lot of campaigns at once, so I care about the handoff as much as the document itself. Who answers product questions? Who signs off a claim? When does a revised cut need to come back?\n\nThose answers save everyone a tedious approval loop later."}, {"id": "infographic_caption", "label": "Infographic post: campaign handoffs", "body": "A creator campaign can look simple from the outside. The video goes live, the numbers come back, and someone writes a report.\n\nThe team has a lot of decisions to make before that happens. We need to know who can answer a product question, who approves claims, when the creator gets feedback, and who owns the go-live check.\n\nI put the handoffs on one page below. It's a useful check if you're running several creators at once, especially when the same person is currently carrying the whole campaign in their head.\n\nWhich handoff usually slows your team down?"}, {"id": "magnet_post", "label": "Gated resource post: four Claude skills", "body": "We put together 4 Claude skills for AI and tech teams planning creator campaigns.\n\nThey cover the parts where a team usually wants a second pair of eyes:\n\n1. Check whether a creator's audience and past sponsors fit the product.\n2. Draft a brief that gives the creator enough context to make the video.\n3. Plan a first month that can actually teach you something.\n4. Read the results and decide what to test next.\n\nEach skill asks for the information it needs and makes missing evidence explicit. The campaign calls still belong to the people running it.\n\nIf you're working through a shortlist or looking back at a first test, comment SKILLS and I'll send you the kit."}];
  var supplied = window.AKG_CONTENT || {};
  var posts = Array.isArray(supplied.posts) && supplied.posts.length ? supplied.posts : fallback;
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.post-tab'));
  var panel = document.getElementById('post-panel');
  var body = document.getElementById('post-body');
  function showPost(index, focus){
    if (!posts[index] || !tabs[index]) return;
    tabs.forEach(function(tab, i){
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    body.textContent = posts[index].body || '';
    if (focus) tabs[index].focus();
  }
  tabs.forEach(function(tab, i){
    tab.addEventListener('click', function(){ showPost(i, false); });
    tab.addEventListener('keydown', function(event){
      var next = i;
      if(event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if(event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if(event.key === 'Home') next = 0;
      else if(event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); showPost(next, true);
    });
  });
  if (posts[0]) showPost(0, false);

  var root = document.querySelector('[data-carousel]');
  if (!root) return;
  var track = root.querySelector('.carousel-track');
  var previous = root.querySelector('.car-prev');
  var next = root.querySelector('.car-next');
  var counter = root.querySelector('.car-count');
  var progress = root.querySelector('.car-progress span');
  var fullSlide = root.querySelector('.full-slide');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.carousel-slide'));
  var slideCopy = supplied.carousel && Array.isArray(supplied.carousel.slides) ? supplied.carousel.slides : [];
  slides.forEach(function(slide, i){
    if (slideCopy[i]) slide.querySelector('img').alt = slideCopy[i].title + ' ' + slideCopy[i].body;
  });
  var index = 0;
  function render(){
    var total = slides.length;
    index = Math.max(0, Math.min(index, total - 1));
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    progress.style.width = ((index + 1) / total * 100) + '%';
    fullSlide.href = slides[index].querySelector('img').getAttribute('src');
    fullSlide.setAttribute('aria-label', 'Open carousel slide ' + (index + 1) + ' full size');
    previous.disabled = index === 0;
    next.disabled = index >= total - 1;
  }
  function go(value){
    index = Math.max(0, Math.min(value, slides.length - 1));
    track.scrollTo({left: index * track.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    render();
  }
  previous.addEventListener('click', function(){go(index - 1)});
  next.addEventListener('click', function(){go(index + 1)});
  track.addEventListener('keydown', function(event){
    if(event.key === 'ArrowRight'){event.preventDefault();go(index + 1)}
    if(event.key === 'ArrowLeft'){event.preventDefault();go(index - 1)}
  });
  var scrollTick = false;
  track.addEventListener('scroll', function(){
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function(){
      scrollTick = false;
      var seen = Math.round(track.scrollLeft / track.clientWidth);
      if(seen !== index && seen >= 0 && seen < slides.length){index = seen;render()}
    });
  }, {passive:true});
  window.addEventListener('resize', function(){track.scrollLeft = index * track.clientWidth});
  slides.forEach(function(slide){
    var img = slide.querySelector('img');
    img.addEventListener('error', function(){
      if(slides.length <= 1) return;
      slide.remove();
      slides = slides.filter(function(item){return item !== slide});
      render();
    });
  });
  render();
})();
