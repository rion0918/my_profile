async page => {
 const results=[];
 for(const [width,height,dpr,cpu] of [[1440,900,2,1],[390,844,3,4]]){
  const c=await page.context().browser().newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:cpu>1,hasTouch:cpu>1}),errors=[];
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:20}));
    window.__architecture={frames:[],tasks:[],scenes:[]};window.__THREE_DEVTOOLS__=new EventTarget();
    new PerformanceObserver(list=>window.__architecture.tasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     const q=window.__architecture;
     if(e.detail.isScene)q.scenes.push(e.detail);
     if(e.detail.isWebGLRenderer){q.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(s,c)=>{
      const main=e.detail.getRenderTarget()===null;const t=performance.now();const result=render(s,c);
      if(main&&q.record)q.frames.push({t,duration:performance.now()-t,calls:e.detail.info.render.calls,triangles:e.detail.info.render.triangles});return result;
     };}
    });
   });
   const p=await c.newPage();await p.bringToFront();p.on('pageerror',e=>errors.push(e.message));const client=await c.newCDPSession(p);await client.send('Emulation.setCPUThrottlingRate',{rate:cpu});
   const response=await p.goto('http://localhost:3001'),htmlBytes=(await response.body()).byteLength;
   await p.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/models/rion-walker.glb')&&e.responseEnd>0));
   if(await p.locator('.worldSurface').count())throw Error('Normal display eagerly mounts 3D');
   const start=Date.now();await p.getByRole('link',{name:'3Dワールド',exact:true}).click();await p.locator('.worldSurface[aria-busy="false"]').waitFor({timeout:60000});const readyMs=Date.now()-start;
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   const geometry=await p.evaluate(()=>{
    const q=window.__architecture,s=q.scenes.find(s=>s.getObjectByName('hall-history')),geometries=new Set(),buffers=new Set();let triangles=0;
    s.traverse(o=>{if(!o.geometry||geometries.has(o.geometry))return;const g=o.geometry;geometries.add(g);if(o.isMesh)triangles+=(g.index?.count??g.attributes.position?.count??0)/3;
     for(const a of Object.values(g.attributes))buffers.add((a.array??a.data.array).buffer);if(g.index)buffers.add(g.index.array.buffer);
    });return {count:geometries.size,bytes:[...buffers].reduce((n,b)=>n+b.byteLength,0),triangles};
   });
   const modes=[];
   for(const quality of ['quality','low']){
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
    await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:'露天風呂へ歩く ↗',exact:true}).click();
    await p.waitForTimeout(500);const from=await p.evaluate(()=>window.__architecture.scenes.find(s=>s.getObjectByName('hall-history')).children.find(o=>o.getObjectByName('Hips')).position.toArray());await p.evaluate(()=>{window.__architecture.frames=[];window.__architecture.record=true;});await p.waitForTimeout(2000);
    const frames=await p.evaluate(()=>{window.__architecture.record=false;return window.__architecture.frames;});await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
    const to=await p.evaluate(()=>window.__architecture.scenes.find(s=>s.getObjectByName('hall-history')).children.find(o=>o.getObjectByName('Hips')).position.toArray());
    const distance=Math.hypot(to[0]-from[0],to[2]-from[2]);if(distance<1)throw Error('Measurement must include sustained movement');
    const intervals=frames.slice(1).map((f,i)=>f.t-frames[i].t).sort((a,b)=>a-b);
    modes.push({quality,distance,frames:frames.length,fps:(frames.length-1)*1000/(frames.at(-1).t-frames[0].t),p95:intervals[Math.floor(intervals.length*.95)],calls:frames.at(-1).calls,triangles:frames.at(-1).triangles});
   }
   results.push({width,cpu,htmlBytes,readyMs,geometry,modes,longestTask:await p.evaluate(()=>Math.max(...window.__architecture.tasks)),errors});
   if(errors.length)throw Error(errors.join('\n'));
  }finally{await c.close();}
 }
 const fail=results.filter(r=>r.htmlBytes>65536||r.geometry.bytes>90*1024*1024||r.modes.some(m=>m.p95>50));
 if(fail.length)throw Error('Architecture performance budget exceeded: '+JSON.stringify(results));
 return results;
}
