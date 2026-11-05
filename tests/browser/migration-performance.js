async page => {
 const results=[];
 for(const [width,height,dpr,cpu] of [[1440,900,2,1],[390,844,3,4]]){
  const c=await page.context().browser().newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:cpu>1,hasTouch:cpu>1});
  await c.route('**/_vercel/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  await c.addInitScript(()=>{
   sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:20}));
   window.__metrics={tasks:[],lcp:0,cls:0,frames:[],scenes:[]};window.__THREE_DEVTOOLS__=new EventTarget();
   for(const type of ['longtask','largest-contentful-paint','layout-shift'])new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='longtask')window.__metrics.tasks.push(e.duration);if(type==='largest-contentful-paint')window.__metrics.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.__metrics.cls+=e.value;}}).observe({type,buffered:true});
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const m=window.__metrics;if(e.detail.isScene)m.scenes.push(e.detail);if(e.detail.isWebGLRenderer){m.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(s,c)=>{const main=e.detail.getRenderTarget()===null,t=performance.now(),r=render(s,c);if(main&&m.record)m.frames.push({t,cost:performance.now()-t,calls:e.detail.info.render.calls});return r;};}});
  });
  try{const p=await c.newPage();await p.bringToFront();const client=await c.newCDPSession(p);await client.send('Emulation.setCPUThrottlingRate',{rate:cpu});
   const response=await p.goto('http://localhost:3001');await p.waitForTimeout(5000);
   await p.screenshot({path:`output/playwright/astro-migration/after-${width}.png`,fullPage:true});
   const normal=await p.evaluate(()=>({lcp:window.__metrics.lcp,cls:window.__metrics.cls,domReady:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,load:performance.getEntriesByType('navigation')[0].loadEventEnd,tasks:window.__metrics.tasks,resources:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,type:e.initiatorType,bytes:e.encodedBodySize,transfer:e.transferSize}))}));
   normal.html=(await response.body()).byteLength;
   normal.heap=(await client.send('Runtime.getHeapUsage')).usedSize;
   const start=Date.now();await p.getByRole('link',{name:'3Dワールド',exact:true}).click();await p.locator('.worldSurface[aria-busy="false"]').waitFor({timeout:90000});const ready=Date.now()-start;const heap=(await client.send('Runtime.getHeapUsage')).usedSize;
   const geometry=await p.evaluate(()=>{const scene=window.__metrics.scenes.find(s=>s.getObjectByName('hall-history')),gs=new Set(),bs=new Set();scene.traverse(o=>{if(!o.geometry||gs.has(o.geometry))return;const g=o.geometry;gs.add(g);for(const a of Object.values(g.attributes))bs.add((a.array??a.data.array).buffer);if(g.index)bs.add(g.index.array.buffer);});return{count:gs.size,bytes:[...bs].reduce((n,b)=>n+b.byteLength,0)};});
   const modes=[];for(const quality of ['quality','low']){
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
    await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:'露天風呂へ歩く ↗',exact:true}).click();await p.waitForTimeout(500);await p.evaluate(()=>{window.__metrics.frames=[];window.__metrics.record=true;});await p.waitForTimeout(2000);
    const frames=await p.evaluate(()=>{window.__metrics.record=false;return window.__metrics.frames;});await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');const gaps=frames.slice(1).map((f,i)=>f.t-frames[i].t).sort((a,b)=>a-b);modes.push({quality,fps:(frames.length-1)*1000/(frames.at(-1).t-frames[0].t),p95:gaps[Math.floor(gaps.length*.95)],max:gaps.at(-1),calls:frames.at(-1).calls});
   }
   results.push({width,cpu,normal,world:{ready,heap,geometry,modes,...await p.evaluate(()=>({longestTask:Math.max(...window.__metrics.tasks)}))}});
  }finally{await c.close();}
 }
 return results;
}
