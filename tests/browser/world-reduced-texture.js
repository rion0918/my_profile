async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const p=await c.newPage();await p.addInitScript(()=>{
   sessionStorage.setItem('portfolio-welcome-v2','seen');sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:-12.85,z:-7.5}));
   const draw=WebGL2RenderingContext.prototype.drawElements;window.__drawCalls=0;WebGL2RenderingContext.prototype.drawElements=function(...args){window.__drawCalls++;return draw.apply(this,args);};
  });
  let release;const gate=new Promise(resolve=>release=resolve);
  await p.route('**/images/projects/yoin/library.jpg',async route=>{await gate;await route.continue();});
  await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.waitForTimeout(300);const before=await p.evaluate(()=>window.__drawCalls);
  const loaded=p.waitForResponse(r=>r.url().includes('/images/projects/yoin/library.jpg'));release();await loaded;await p.waitForTimeout(250);const after=await p.evaluate(()=>window.__drawCalls);
  if(after<=before)throw Error('the project texture loaded but the reduced-motion scene never repainted');
  return {before,after,repainted:true};
 }finally{await c.close();}
}
