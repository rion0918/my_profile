async page=>{
 const results=[],errors=[],browser=page.context().browser();
 for(const [width,height,cpu] of [[1440,900,1],[390,844,4]])for(const quality of ['quality','low']){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760});
  try{
   await c.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__focusFrames=[];
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     if(e.detail.isWebGLRenderer){const renderer=e.detail,render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{
      if(renderer.getRenderTarget()===null)window.__focusFrames.push(performance.now());
      return render(scene,camera);
     };}
    });
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   const client=await c.newCDPSession(p);await client.send('Emulation.setCPUThrottlingRate',{rate:cpu});
   await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
   await p.waitForTimeout(300);
   for(let step=0;step<4;step++){
    await p.evaluate(()=>window.__focusFrames=[]);
    if(step===0)await p.locator('.welcomeActions button').first().click();
    else await p.locator('.tourNext').click();
    await p.getByRole('dialog').waitFor({state:'visible'});
    const frames=await p.evaluate(()=>window.__focusFrames),intervals=frames.slice(1).map((t,i)=>t-frames[i]);
    const fps=(frames.length-1)/(frames.at(-1)-frames[0])*1000,max=Math.max(...intervals);
    if(frames.length<30||fps<50||max>65)throw Error('tour camera stutters '+JSON.stringify({width,quality,step,fps,max,rendered:frames.length}));
    results.push({width,quality,step,fps,max,rendered:frames.length});
   }
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
