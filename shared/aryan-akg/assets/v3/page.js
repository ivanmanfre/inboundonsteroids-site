document.querySelectorAll('[data-carousel]').forEach(carousel=>{
  const track=carousel.querySelector('.slides');
  const slides=Array.from(track.querySelectorAll('img'));
  const previous=carousel.querySelector('.prev');
  const next=carousel.querySelector('.next');
  const count=carousel.querySelector('.slide-count');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index=0;
  function update(){
    index=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));
    count.textContent=`${index+1} / ${slides.length}`;
    previous.disabled=index===0;
    next.disabled=index===slides.length-1;
  }
  function go(delta){
    const target=Math.max(0,Math.min(slides.length-1,index+delta));
    track.scrollTo({left:target*track.clientWidth,behavior:reduce?'instant':'smooth'});
  }
  previous.addEventListener('click',()=>go(-1));
  next.addEventListener('click',()=>go(1));
  track.addEventListener('scroll',update,{passive:true});
  track.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();go(event.key==='ArrowLeft'?-1:1);
    }
  });
  window.addEventListener('resize',()=>{
    track.scrollTo({left:index*track.clientWidth,behavior:'instant'});update();
  });
  update();
});
