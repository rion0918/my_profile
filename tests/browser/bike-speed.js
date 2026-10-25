async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height,quality] of [[1440,900,'quality'],[390,844,'quality'],[320,568,'low']]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:19,z:25}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__bikeSpeed={};window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__bikeSpeed.scene=e.detail;});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor().catch(async e=>{throw Error(e.message+' '+JSON.stringify({errors,body:await p.locator('body').innerText()}));});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
   const pos=()=>p.evaluate(()=>window.__bikeSpeed.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
   await p.locator('.worldSurface').focus();const footBefore=await pos();await p.keyboard.down('w');await p.waitForTimeout(600);await p.keyboard.up('w');const footSpeed=distance(await pos(),footBefore)/.6;
   if(footSpeed<4.5||footSpeed>5.7)throw Error('running reference invalid '+footSpeed);
   await p.getByRole('button',{name:'自転車に乗る',exact:true}).click();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:12000});
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   await p.locator('.worldGuide > summary').click();await p.locator('.guideHarbor').click();
   await p.waitForFunction(()=>{const a=window.__bikeSpeed.scene.children.find(o=>o.getObjectByName('Hips')).position;return Math.abs(a.x)<.5&&a.z<14;},null,{timeout:20000});
   const autoBefore=await pos();await p.waitForTimeout(600);const autoSpeed=distance(await pos(),autoBefore)/.6;
   if(autoSpeed<footSpeed*1.3)throw Error('automatic bicycle travel is not faster than running '+JSON.stringify({width,footSpeed,autoSpeed}));
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');await p.keyboard.down('w');await p.waitForTimeout(1000);const keyboardBefore=await pos();await p.waitForTimeout(700);await p.keyboard.up('w');const keyboardSpeed=distance(await pos(),keyboardBefore)/.7;
   if(keyboardSpeed<footSpeed*1.45||keyboardSpeed>9.6)throw Error('keyboard cycling pace '+JSON.stringify({width,footSpeed,keyboardSpeed}));
   const coastBefore=await pos();await p.waitForTimeout(200);const coastDistance=distance(await pos(),coastBefore);if(coastDistance<.7)throw Error('cycling lost momentum');
   await p.keyboard.down('s');await p.waitForTimeout(500);const brakingBefore=await pos();await p.waitForTimeout(200);await p.keyboard.up('s');const brakingDistance=distance(await pos(),brakingBefore);
   if(brakingDistance>coastDistance*.5)throw Error('brake does not slow the faster bicycle');
   await p.keyboard.press('Escape');
   let touchSpeed;
   if(width<760){
    await p.bringToFront();const client=await c.newCDPSession(p),start=await p.evaluate(()=>{for(const y of [.55,.4,.7])for(const x of [.25,.7,.45]){const point={x:innerWidth*x,y:innerHeight*y};if([-32,0,32].every(dx=>[-32,0,32].every(dy=>document.elementFromPoint(point.x+dx,point.y+dy)?.tagName==='CANVAS')))return point;}});
    const dy=-40,dx=-dy*.6/(12.4/Math.hypot(12,12.4,20));
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+dx,y:start.y+dy,id:1}]});
    await p.waitForTimeout(1100);const touchBefore=await pos();await p.waitForTimeout(600);touchSpeed=distance(await pos(),touchBefore)/.6;
    if(touchSpeed<footSpeed*1.45||touchSpeed>9.6){await p.screenshot({path:'output/playwright/bike-speed-touch-failure.png'});throw Error('touch bicycle still brakes for its moving target '+JSON.stringify({width,footSpeed,touchSpeed,touchBefore,after:await pos(),start,dx,dy,riding:await p.getByRole('button',{name:'自転車を降りる',exact:true}).isVisible(),feedback:await p.locator('.worldTouchPad').evaluate(e=>({hidden:e.hidden,style:e.getAttribute('style')}))}));}
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
   }
   const stopped=await pos();await p.waitForTimeout(250);if(distance(await pos(),stopped)>.02)throw Error('bicycle does not stop after cancel/release');
   await p.screenshot({path:`output/playwright/bike-speed-${width}.png`});results.push({width,height,quality,footSpeed,autoSpeed,keyboardSpeed,touchSpeed,brakes:true,stops:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
