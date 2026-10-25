async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height,dpr,cpu] of [[1440,900,2,1],[390,844,3,4]])for(const hour of [12,21])for(const quality of ['quality','low']){
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:width<760,hasTouch:width<760,timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(({hour})=>{
    const fixed=Date.parse(`2026-10-24T${hour}:00:00+09:00`),NativeDate=Date;
    window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:20}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__frameQA={collect:false,frames:[],passes:[]};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     const q=window.__frameQA;
     if(e.detail.isScene)q.scene=e.detail;
     if(e.detail.isWebGLRenderer){
      q.renderer=e.detail;const render=e.detail.render.bind(e.detail);
      e.detail.render=(scene,camera)=>{
       const main=e.detail.getRenderTarget()===null,start=performance.now();if(main)q.camera=camera;
       const result=render(scene,camera);
       if(q.collect){const sample={start,cost:performance.now()-start,calls:e.detail.info.render.calls,triangles:e.detail.info.render.triangles};q.passes.push({...sample,main});if(main)q.frames.push(sample);}
       return result;
      };
     }
    });
   },{hour});
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));const client=await c.newCDPSession(p);
   await client.send('Emulation.setCPUThrottlingRate',{rate:cpu});
   await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
   await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:'露天風呂へ歩く ↗',exact:true}).click();
   await p.waitForTimeout(1000);
   await p.evaluate(()=>{window.__frameQA.collect=true;window.__frameQA.from=window.__frameQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray();});
   await p.waitForTimeout(5000);
   const sample=await p.evaluate(()=>{
    const q=window.__frameQA;q.collect=false;
    const to=q.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray(),gl=q.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    return {frames:q.frames,passes:q.passes,from:q.from,to,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
   });
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   const frames=sample.frames,intervals=frames.slice(1).map((f,i)=>f.start-frames[i].start).sort((a,b)=>a-b),costs=frames.map(f=>f.cost).sort((a,b)=>a-b);
   const fps=(frames.length-1)/((frames.at(-1).start-frames[0].start)/1000),distance=Math.hypot(sample.to[0]-sample.from[0],sample.to[2]-sample.from[2]);
   if(distance<7)throw Error('not sustained movement '+JSON.stringify({width,quality,distance}));
   const result={width,height,cpu,hour,quality,fps,rendered:frames.length,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),stalls:frames.slice(1).map((f,i)=>({gap:f.start-frames[i].start,previousCost:frames[i].cost,cost:f.cost,reflectionCosts:sample.passes.filter(p=>!p.main&&p.start>=frames[i].start&&p.start<f.start).map(p=>p.cost)})).filter(f=>f.gap>34),over33:intervals.filter(t=>t>34).length,cpuP95:costs[Math.floor(costs.length*.95)],drawCalls:Math.round(frames.reduce((n,f)=>n+f.calls,0)/frames.length),triangles:Math.round(frames.reduce((n,f)=>n+f.triangles,0)/frames.length),reflectionPasses:sample.passes.filter(f=>!f.main).length,reflectionMaxCPU:Math.max(0,...sample.passes.filter(f=>!f.main).map(f=>f.cost)),distance,gpu:sample.gpu,drawingBuffer:sample.drawingBuffer};
   if(fps<55||result.p95>30||result.max>65)throw Error('movement frame budget exceeded '+JSON.stringify(result));
   results.push(result);
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
