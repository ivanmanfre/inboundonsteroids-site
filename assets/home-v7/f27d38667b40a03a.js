document.documentElement.classList.add('js');
const pause = document.querySelector('#logo-motion');
pause.addEventListener('click', () => {
  const paused = pause.getAttribute('aria-pressed') !== 'true';
  pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = paused ? 'Play logos' : 'Pause logos';
  document.querySelector('.client-strip').classList.toggle('logos-paused', paused);
});
const hours = document.querySelector('#weekly-hours');
hours.addEventListener('input', () => {
  document.querySelector('#weekly-output').value = hours.value;
  document.querySelector('#monthly-hours').value = String(Number(hours.value) * 4);
});
hours.disabled = false;
const dock = document.querySelector('.dock');
new IntersectionObserver(([entry]) => {
  dock.classList.toggle('dock-visible', !entry.isIntersecting && entry.boundingClientRect.bottom < 0);
}).observe(document.querySelector('.hero'));
// The carousel is a small, manual demonstration; it never auto-advances.
const slides=[...document.querySelectorAll('.carousel-slide')];
const prev=document.querySelector('.slide-prev'),next=document.querySelector('.slide-next');
let activeSlide=0;
function showSlide(index){activeSlide=Math.max(0,Math.min(slides.length-1,index));slides.forEach((slide,i)=>slide.hidden=i!==activeSlide);prev.disabled=activeSlide===0;next.disabled=activeSlide===slides.length-1;document.querySelector('.slide-count').textContent=`${activeSlide+1} / ${slides.length}`;}
showSlide(0);
prev.addEventListener('click',()=>showSlide(activeSlide-1));next.addEventListener('click',()=>showSlide(activeSlide+1));
document.querySelector('.carousel-controls').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();showSlide(activeSlide+(e.key==='ArrowRight'?1:-1));}});
const staticCapture=new URLSearchParams(location.search).get('motion')==='static';
if(staticCapture)document.documentElement.dataset.motion='static';
if(window.gsap&&window.ScrollTrigger&&!staticCapture){
 gsap.registerPlugin(ScrollTrigger);
 const media=gsap.matchMedia();
 media.add('(prefers-reduced-motion: no-preference)',()=>{
  document.querySelectorAll('.service-chapter').forEach(stage=>{
   const timeline=gsap.timeline({scrollTrigger:{trigger:stage,start:'top 85%',end:'center 45%',scrub:.6}});
   timeline.fromTo(stage.querySelectorAll('.motion-art'),{y:24},{y:0,ease:'none'},0);
   const second=stage.querySelector('.motion-secondary');if(second)timeline.fromTo(second,{y:stage.id==='resources'?12:42},{y:0,ease:'none'},0);
   const replies=stage.querySelectorAll('.dm-bubble');if(replies.length)timeline.fromTo(replies,{y:18},{y:0,stagger:.12,ease:'none'},0);
  });
  gsap.fromTo('.compound-line',{strokeDashoffset:1},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.compound-figure',start:'top 85%',end:'center 45%',scrub:.6}});
 });
 Promise.all([document.fonts.ready,...[...document.querySelectorAll('.stage-visual img,.expert-portrait img')].map(i=>i.decode().catch(()=>{}))]).then(()=>ScrollTrigger.refresh());
}
