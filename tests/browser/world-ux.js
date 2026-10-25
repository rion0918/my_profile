async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height,touch] of [[1440,900,false],[320,568,true],[390,844,true],[375,667,true],[844,390,true]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__ux={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     if(e.detail.isScene)window.__ux.scene=e.detail;
     if(e.detail.isWebGLRenderer){const render=e.detail.render.bind(e.detail);e.detail.render=(scene,camera)=>{window.__ux.camera=camera;return render(scene,camera);};}
    });
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   await p.getByRole('button',{name:'自由に探索する',exact:true}).click();
   const metrics=()=>p.evaluate(()=>{
    const q=window.__ux,person=q.scene.children.find(o=>o.getObjectByName('Hips')),v=person.position.clone().project(q.camera);
    return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2,position:person.position.toArray(),viewWidth:q.camera.right-q.camera.left};
   });
   const zoomOutByWheel=async()=>{
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const before=(await metrics()).viewWidth;
    const point=await p.evaluate(()=>{
     const points=[];for(const y of [.5,.6,.7,.35])for(const x of [.4,.2,.7,.1,.8])points.push({x:innerWidth*x,y:innerHeight*y});
     return points.find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS');
    });
    if(!point)throw Error('no visible ground for wheel');
    await p.mouse.move(point.x,point.y);await p.mouse.wheel(0,130);
    await p.waitForFunction(w=>window.__ux.camera.right-window.__ux.camera.left>w,before,{timeout:3000}).catch(async error=>{
     throw Error('wheel zoom did not update '+JSON.stringify({width,height,before,after:await metrics(),point,target:await p.evaluate(point=>document.elementFromPoint(point.x,point.y)?.outerHTML,point)})+' '+error.message);
    });
   };
   const before=await metrics();
   await p.mouse.move(width*.42,height*.5);await p.mouse.down();await p.mouse.move(width*.42+35,height*.5-45,{steps:8});await p.mouse.up();
   const dragged=await metrics();
   if(Math.abs(dragged.x-before.x-35)>2||Math.abs(dragged.y-before.y+45)>2)throw Error('drag is not direct manipulation '+JSON.stringify({width,before,dragged}));
   if(before.viewWidth<12.39)throw Error('portrait view cuts off halls '+before.viewWidth);
   await p.locator('.worldSurface').focus();await p.keyboard.press('0');
   const reset=await metrics();if(Math.abs(reset.x-width/2)>2||reset.y<height*.55||reset.y>height*.7)throw Error('unhelpful character framing '+JSON.stringify(reset));
   await p.getByRole('button',{name:'景色を拡大',exact:true}).click();if((await metrics()).viewWidth>=reset.viewWidth)throw Error('zoom in failed');
   await p.getByRole('button',{name:'景色を縮小',exact:true}).click();
   await zoomOutByWheel();
   await p.locator('.worldSurface').focus();await p.keyboard.press('0');
   if(touch){
    const client=await c.newCDPSession(p);const center={x:width*.4,y:height*.5};
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-35,y:center.y,id:1},{x:center.x+35,y:center.y,id:2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-60,y:center.y,id:1},{x:center.x+60,y:center.y,id:2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if((await metrics()).viewWidth>=reset.viewWidth*.9)throw Error('pinch did not zoom');
    if(JSON.stringify((await metrics()).position)!==JSON.stringify(reset.position))throw Error('pinch accidentally walked');
    await client.detach();await p.locator('.worldSurface').focus();await p.keyboard.press('0');
   }
   if(!touch){
    await p.getByRole('button',{name:'景色を拡大',exact:true}).click();const zoomed=await metrics();
    await p.reload();await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
    if(Math.abs((await metrics()).viewWidth-zoomed.viewWidth)>.01)throw Error('zoom was not restored');
    await p.locator('.worldSurface').focus();await p.keyboard.press('0');
    if(Math.abs((await metrics()).viewWidth-reset.viewWidth)>.01)throw Error('keyboard recenter failed');
    await p.keyboard.press('+');if((await metrics()).viewWidth>=reset.viewWidth)throw Error('keyboard zoom failed');
    await p.keyboard.press('0');
   }
   await p.getByRole('button',{name:'街全体を見る',exact:true}).click();
   await zoomOutByWheel();
   await p.locator('.worldSurface').focus();await p.keyboard.press('0');
   await p.locator('.worldSurface').focus();const still=await metrics();await p.keyboard.down('ArrowUp');await p.waitForTimeout(500);await p.keyboard.up('ArrowUp');
   const moved=await metrics(),distance=Math.hypot(moved.position[0]-still.position[0],moved.position[2]-still.position[2]);
   if(distance<1.2||distance>2.2)throw Error('walking pace '+distance);
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');const stopped=await metrics();await p.waitForTimeout(200);
   if(JSON.stringify((await metrics()).position)!==JSON.stringify(stopped.position))throw Error('stop failed');
   await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:'Yoin館へ歩く',exact:true}).click();await p.waitForTimeout(250);
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');const cancelled=await metrics();await p.waitForTimeout(250);
   if(JSON.stringify((await metrics()).position)!==JSON.stringify(cancelled.position)||await p.getByRole('dialog').isVisible())throw Error('cannot cancel tap travel');
   await p.screenshot({path:`output/playwright/ux-after-explore-${width}.png`});
   const groups=await p.evaluate(()=>{
    const a=document.querySelector('.worldCameraControls').getBoundingClientRect(),b=document.querySelector('.worldControlButtons').getBoundingClientRect();
    return {overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top};
   });
   if(groups.overlap)throw Error('camera controls overlap movement controls at '+width);
   const obscured=await p.evaluate(()=>{
    const controls=document.querySelector('.worldCameraControls').getBoundingClientRect();
    return [...document.querySelectorAll('.buildingLabel:not([hidden]),.entryLabel:not([hidden])')].filter(b=>{const r=b.getBoundingClientRect();return r.left<controls.right&&r.right>controls.left&&r.top<controls.bottom&&r.bottom>controls.top;}).map(b=>b.textContent);
   });
   if(obscured.length)throw Error('camera controls cover a hall action '+width+': '+obscured);

   const outside=await p.locator('.worldControls button:visible, .worldCameraControls button:visible').evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.x<0||r.right>innerWidth+.5||r.y<0||r.bottom>innerHeight+.5||r.height<44||r.width<44;}).map(b=>b.textContent));
   if(outside.length)throw Error('unreachable controls '+outside);
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal page overflow');
   results.push({width,height,drag:true,framing:true,zoom:true,pinch:touch,pace:distance,stop:true,controls:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
