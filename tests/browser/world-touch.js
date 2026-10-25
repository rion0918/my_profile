async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height,quality,reducedMotion] of [[390,844,'quality','no-preference'],[320,568,'low','reduce'],[844,390,'quality','reduce']]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:0}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__touchQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__touchQA.scene=e.detail;if(e.detail.isWebGLRenderer){const render=e.detail.render.bind(e.detail);e.detail.render=(scene,camera)=>{window.__touchQA.camera=camera;return render(scene,camera);};}});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption(quality);await p.getByLabel('画質・BGM設定').click();
   const client=await c.newCDPSession(p),position=()=>p.evaluate(()=>window.__touchQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const start=await p.evaluate(()=>{for(const y of [.55,.45,.65])for(const x of [.4,.6,.2,.8])if(document.elementFromPoint(innerWidth*x,innerHeight*y)?.tagName==='CANVAS')return {x:innerWidth*x,y:innerHeight*y};});
   const touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points});
   const planarDistance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
   const before=await position();await touch('touchStart',[{...start,id:1}]);await touch('touchMove',[{x:start.x,y:start.y-65,id:1}]);await p.waitForTimeout(550);
   const moving=await position(),distance=Math.hypot(moving[0]-before[0],moving[2]-before[2]);
   if(distance<1.3||moving[0]>=before[0]||moving[2]>=before[2])throw Error('one-finger flick does not move forward '+JSON.stringify({width,distance,before,moving}));
   if(await p.getByRole('dialog').isVisible())throw Error('drag selected a hall');
   await touch('touchEnd',[]);const released=await position();await p.waitForTimeout(250);
   if(planarDistance(await position(),released)>.01)throw Error('keeps walking after release');
   if(!await p.locator('.worldTouchPad').evaluate(el=>el.hidden))throw Error('touch feedback remains after release');
   const dash=p.getByRole('button',{name:/^常ダッシュ (ON|OFF)$/});await dash.click();const dashStart=await position();
   await touch('touchStart',[{...start,id:1}]);await touch('touchMove',[{x:start.x,y:start.y+65,id:1}]);await p.waitForTimeout(450);
   const dashDistance=planarDistance(await position(),dashStart);if(dashDistance<1.9||dashDistance>3)throw Error('touch ignores always dash '+dashDistance);
   await touch('touchEnd',[]);await dash.click();
   await p.screenshot({path:`output/playwright/touch-after-${width}.png`});
   results.push({width,height,quality,reducedMotion,distance,dashDistance,releaseStops:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
