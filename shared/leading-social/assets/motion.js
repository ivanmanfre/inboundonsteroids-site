(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const headings = [...document.querySelectorAll('.sec h2,.results>h3,.closing h2')];
  headings.forEach(heading => {
    const wrap=document.createElement('div');wrap.className='motion-heading';heading.before(wrap);wrap.append(heading);
  });
  const art=[...document.querySelectorAll('.lm-cover')];
  art.forEach(el=>el.classList.add('motion-art'));
  const svg=document.getElementById('page-thread'),base=document.getElementById('thread-base'),line=document.getElementById('thread-drawn'),dot=document.getElementById('thread-dot');
  let points=[],length=0,frame=0,current=0,target=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function build(){
    const w=innerWidth,mobile=w<=760,ys=[{x:mobile?7:w*.96,y:130}];
    const markers=[...document.querySelectorAll('#posts,#topics,#magnets,#outreach,#plan,#results,#start,#close')];
    markers.forEach((el,i)=>{
      const y=el.getBoundingClientRect().top+scrollY;
      const x=mobile?7+(i%2)*3:w*(i%2?.97:.03);
      // Cross the page in the whitespace before the next section, then keep to its edge.
      ys.push({x:ys.at(-1).x,y:Math.max(ys.at(-1).y,y-110)},{x,y:y+20});
    });
    const end=document.querySelector('.closing-actions');
    if(end){const b=end.getBoundingClientRect();ys.push({x:mobile?8:w*.5,y:b.top+scrollY+b.height+20});}
    let d=`M${ys[0].x},${ys[0].y}`;
    for(let i=1;i<ys.length;i++){const a=ys[i-1],b=ys[i],dy=(b.y-a.y)/2;d+=` C${a.x},${a.y+dy} ${b.x},${b.y-dy} ${b.x},${b.y}`;}
    base.setAttribute('d',d);line.setAttribute('d',d);length=line.getTotalLength();
    points=Array.from({length:1001},(_,i)=>{const p=line.getPointAtLength(length*i/1000);return {x:p.x,y:p.y,l:length*i/1000};});
    line.style.strokeDasharray=String(length);kick();
  }
  function paint(){
    frame=0;svg.setAttribute('viewBox',`0 ${scrollY} ${innerWidth} ${innerHeight}`);
    const y=scrollY+innerHeight*.77;
    const i=points.findIndex(p=>p.y>=y),p=points[i<0?points.length-1:i];if(!p)return;
    target=p.l;current=reduced.matches?length:current+(target-current)*.2;
    if(Math.abs(current-target)<.6)current=target;
    line.style.strokeDashoffset=String(length-current);
    const at=line.getPointAtLength(current);dot.setAttribute('cx',at.x);dot.setAttribute('cy',at.y);dot.style.opacity=y>points.at(-1).y?'0':'1';
    art.forEach((el,n)=>{
      const top=el.getBoundingClientRect().top;
      const t=clamp((top-innerHeight*.55)/(innerHeight*.55),0,1);
      el.style.setProperty('--art-x',reduced.matches?'0px':`${(t*(n%2?1:-1)*(innerWidth<=760?8:26)).toFixed(1)}px`);
      el.style.setProperty('--art-y',reduced.matches?'0px':`${(t*18).toFixed(1)}px`);
    });
    if(!reduced.matches&&Math.abs(current-target)>.6)kick();
  }
  function kick(){if(!frame)frame=requestAnimationFrame(paint);}
  addEventListener('scroll',kick,{passive:true});addEventListener('resize',build);reduced.addEventListener('change',build);
  new ResizeObserver(build).observe(document.querySelector('main'));document.fonts.ready.then(build);build();
})();
