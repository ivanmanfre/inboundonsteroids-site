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
// Examples keep both complete panels in source for the no-JavaScript version.
const tabs=[...document.querySelectorAll('.example-tabs [role=tab]')];
function showExamples(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});window.ScrollTrigger?.refresh();}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>showExamples(tab));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;showExamples(tabs[next]);tabs[next].focus();});});
showExamples(tabs[0]);
const staticCapture=new URLSearchParams(location.search).get('motion')==='static';
if(staticCapture)document.documentElement.dataset.motion='static';
if(window.gsap&&window.ScrollTrigger&&!staticCapture){
 gsap.registerPlugin(ScrollTrigger);
 const media=gsap.matchMedia();
 media.add('(prefers-reduced-motion: no-preference)',()=>{
  document.querySelectorAll('.acquisition-scene').forEach(scene=>{
   const timeline=gsap.timeline({scrollTrigger:{trigger:scene,start:'top 85%',end:'center 45%',scrub:.55}});
   if(scene.querySelector('.visual-front'))timeline.fromTo(scene.querySelectorAll('.visual-front'),{y:24,rotation:0},{y:0,rotation:scene.classList.contains('scene-content')?5:-5,ease:'none'},0);
   if(scene.querySelector('.visual-back'))timeline.fromTo(scene.querySelectorAll('.visual-back'),{y:10,rotation:0},{y:0,rotation:scene.classList.contains('scene-content')?-9:8,ease:'none'},0);
   const mark=scene.querySelector('.booking-mark');if(mark)timeline.fromTo(mark,{y:20,scale:.94},{y:0,scale:1,ease:'none'},0);
  });
  gsap.fromTo('.beam-draw',{strokeDashoffset:1},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.acquisition-scenes',start:'top 65%',end:'bottom 50%',scrub:.55}});
 });
 Promise.all([document.fonts.ready,...[...document.querySelectorAll('.scene-art img,.expert-portrait img')].map(i=>i.decode().catch(()=>{}))]).then(()=>ScrollTrigger.refresh());
}
