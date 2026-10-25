async page=>{
 const c=await page.context().browser().newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 try{
  await c.addInitScript(()=>{
   sessionStorage.setItem('portfolio-welcome-v4','seen');
   window.__THREE_DEVTOOLS__=new EventTarget();window.__inputFrames={stamp:0,collect:false,frames:[]};
   const mark=t=>{window.__inputFrames.stamp=t;requestAnimationFrame(mark);};requestAnimationFrame(mark);
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
    if(e.detail.isWebGLRenderer){const renderer=e.detail,render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{
     if(renderer.getRenderTarget()===null&&window.__inputFrames.collect)window.__inputFrames.frames.push(window.__inputFrames.stamp);
     return render(scene,camera);
    };}
   });
  });
  const p=await c.newPage();await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  await p.evaluate(()=>window.__inputFrames.collect=true);
  for(let i=0;i<4;i++){await p.getByRole('button',{name:'景色を拡大',exact:true}).click();await p.getByRole('button',{name:'景色を縮小',exact:true}).click();}
  await p.waitForTimeout(100);
  const counts=await p.evaluate(()=>{window.__inputFrames.collect=false;const counts={};for(const stamp of window.__inputFrames.frames)counts[stamp]=(counts[stamp]||0)+1;return Object.values(counts);});
  const max=Math.max(...counts),rendered=counts.reduce((n,count)=>n+count,0);
  if(max>1)throw Error('repeated full scene renders in one display frame '+JSON.stringify({max,rendered,paints:counts.length}));
  return {max,rendered,paints:counts.length};
 }finally{await c.close();}
}
