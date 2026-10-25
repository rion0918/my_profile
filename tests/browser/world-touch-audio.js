async page=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  await c.addInitScript(()=>{
   sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:0}));
   window.__touchAudio={released:false,plays:0};
   // Reproduce blocked startup playback, then permit a trusted touch release.
   HTMLMediaElement.prototype.play=function(){window.__touchAudio.plays++;return window.__touchAudio.released?Promise.resolve():Promise.reject(new DOMException('blocked startup','NotAllowedError'));};
   window.addEventListener('pointerup',()=>window.__touchAudio.released=true,{capture:true});
  });
  const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
  const before=await p.evaluate(()=>window.__touchAudio.plays),client=await c.newCDPSession(p);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:450,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:380,id:1}]});await p.waitForTimeout(150);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100);
  const after=await p.evaluate(()=>window.__touchAudio.plays);
  if(after<=before)throw Error('a flick without a click does not unlock BGM '+JSON.stringify({before,after}));
  await p.locator('.bgmToggle').click();const disabledPlays=await p.evaluate(()=>window.__touchAudio.plays);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:450,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:380,id:1}]});await p.waitForTimeout(100);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100);
  if(await p.locator('.bgmToggle').getAttribute('aria-pressed')!=='false'||await p.evaluate(()=>window.__touchAudio.plays)!==disabledPlays)throw Error('touch release reenables disabled BGM');
  return {flickUnlocksPlayback:true,offRemainsOff:true,before,after};
 }finally{await c.close();}
}
