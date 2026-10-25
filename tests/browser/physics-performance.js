async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
 try{
  const p=await c.newPage(),cdp=await c.newCDPSession(p),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:500000,uploadThroughput:125000});
  const start=Date.now();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});const readyMs=Date.now()-start;
  await p.getByRole('button',{name:'BGMを再生',exact:true}).tap();
  const borrowStart=Date.now();await p.getByRole('button',{name:'自転車に乗る',exact:true}).tap();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:30000});const rideReadyMs=Date.now()-borrowStart;
  await p.getByRole('button',{name:'街全体を見る',exact:true}).tap();await p.getByRole('button',{name:'港の桟橋へ歩く',exact:true}).tap();await p.waitForTimeout(6000);
  await p.keyboard.up('Shift');const from=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  const frames=await p.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now(),start=last;function frame(t){if(t>last)frames.push(t-last);last=t;if(t-start<5000)requestAnimationFrame(frame);else resolve(frames);}requestAnimationFrame(frame);}));
  await p.keyboard.press('Escape');const position=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3'))),distance=Math.hypot(position.x-from.x,position.z-from.z);
  if(distance<12)throw Error('vehicle did not keep moving '+distance);frames.sort((a,b)=>a-b);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  return {readyMs,rideReadyMs,count:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),distance,from,position,bgmPlaying:await p.locator('audio').evaluate(a=>!a.paused),errors};
 }finally{await c.close();}
}
