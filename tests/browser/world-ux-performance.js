async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,timezoneId:'Asia/Tokyo'});
 try{
  await c.addInitScript(()=>{
   window.__THREE_DEVTOOLS__=new EventTarget();window.__perf={longTasks:[]};
   new PerformanceObserver(list=>window.__perf.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__perf.scene=e.detail;});
  });
  const p=await c.newPage(),client=await c.newCDPSession(p),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
  await client.send('Emulation.setCPUThrottlingRate',{rate:4});await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:500000,uploadThroughput:125000});
  const start=Date.now();await p.goto('http://localhost:3001');
  await p.getByRole('link',{name:'通常表示で読む ↗',exact:true}).waitFor();const readingAvailableMs=Date.now()-start;
  await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');const sceneReadyMs=Date.now()-start;
  await p.getByRole('button',{name:'自由に探索する',exact:true}).tap();
  const results=[];
  for(const quality of ['quality','low']){
   await p.getByLabel('画質・BGM設定').tap();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').tap();
   await p.locator('.worldGuide > summary').tap();await p.getByRole('button',{name:'露天風呂へ歩く ↗',exact:true}).tap();
   const from=await p.evaluate(()=>window.__perf.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const frames=await p.evaluate(()=>new Promise(resolve=>{let last=performance.now(),start=last;const intervals=[];function frame(t){intervals.push(t-last);last=t;if(t-start<5000)requestAnimationFrame(frame);else resolve(intervals);}requestAnimationFrame(frame);}));
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   const to=await p.evaluate(()=>window.__perf.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   frames.sort((a,b)=>a-b);const distance=Math.hypot(to[0]-from[0],to[2]-from[2]);
   if(distance<8)throw Error('measurement did not include sustained walking');
   results.push({quality,samples:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),distance});
  }
  const longTasks=await p.evaluate(()=>window.__perf.longTasks);
  if(errors.length)throw Error(errors.join('\n'));
  if(Math.max(...longTasks)>1200)throw Error('startup blocks interaction for '+Math.max(...longTasks)+'ms');
  return {readingAvailableMs,sceneReadyMs,results,longestTask:Math.max(...longTasks),bgmPlaying:await p.locator('audio').evaluate(a=>!a.paused),errors};
 }finally{await c.close();}
}
