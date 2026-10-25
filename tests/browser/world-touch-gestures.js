async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const mode of ['gestures','bicycle','hall-tap']){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
   await c.addInitScript(({mode})=>{
    const point=mode==='bicycle'?{x:16.15,z:25}:mode==='hall-tap'?{x:8,z:29.5}:{x:0,z:0};
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,...point}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__touchQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__touchQA.scene=e.detail;if(e.detail.isWebGLRenderer){const render=e.detail.render.bind(e.detail);e.detail.render=(scene,camera)=>{window.__touchQA.camera=camera;return render(scene,camera);};}});
    document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')window.__touchQA.pointerId=e.pointerId;});
   },{mode});
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   const client=await c.newCDPSession(p),touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points});
   const position=()=>p.evaluate(()=>window.__touchQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
   const ground=()=>p.evaluate(()=>{for(const y of [.6,.5,.4])for(const x of [.4,.6,.2,.8])if(document.elementFromPoint(innerWidth*x,innerHeight*y)?.tagName==='CANVAS')return {x:innerWidth*x,y:innerHeight*y};});
   const stopped=async note=>{await p.waitForFunction(()=>document.querySelector('.worldTouchPad').hidden,{},{timeout:2500}).catch(error=>{throw Error('touch feedback remains after '+note+' '+error.message);});const before=await position();await p.waitForTimeout(200);const after=await position();if(distance(before,after)>.015)throw Error('movement after '+note+' '+JSON.stringify({before,after,distance:distance(before,after)}));};
   const begin=async(dx,dy)=>{const point=await ground();await touch('touchStart',[{...point,id:1}]);await touch('touchMove',[{x:point.x+dx,y:point.y+dy,id:1}]);return point;};
   if(mode==='gestures'){
    // Reverse while held: the character follows the new direction immediately.
    let point=await begin(65,0),before=await position();await p.waitForTimeout(300);const right=await position();
    if(right[0]-before[0]<.6||right[2]>=before[2])throw Error('rightward flick mapping');
    await touch('touchMove',[{x:point.x-65,y:point.y,id:1}]);await p.waitForTimeout(300);const left=await position();
    if(left[0]>right[0]-.6||left[2]<=right[2])throw Error('held flick cannot reverse');
    await touch('touchMove',[{...point,id:1}]);await p.waitForFunction(()=>document.querySelector('.worldTouchPad>span').style.transform.replaceAll(' ','')==='translate(0px,0px)');before=await position();await p.waitForTimeout(180);if(distance(before,await position())>.01)throw Error('returning finger to center does not stop');
    await p.screenshot({path:'output/playwright/touch-active.png'});await touch('touchEnd',[]);await stopped('release');
    // A second finger changes to camera control; locomotion must stop.
    point=await begin(0,-60);await p.waitForTimeout(200);
    const first={x:point.x,y:point.y-60,id:1},second={x:point.x+65,y:point.y-60,id:2};
    await touch('touchStart',[first,second]);const atPinch=await position();
    const span=await p.evaluate(()=>window.__touchQA.camera.right-window.__touchQA.camera.left);
    await touch('touchMove',[{...first,x:first.x-15,y:first.y+20},{...second,x:second.x+30,y:second.y+20}]);await p.waitForTimeout(200);
    if(distance(atPinch,await position())>.015)throw Error('pinch also moves actor');
    if(!await p.evaluate(w=>window.__touchQA.camera.right-window.__touchQA.camera.left<w,span))throw Error('pinch cannot zoom');
    const cameraBefore=await p.evaluate(()=>window.__touchQA.camera.position.toArray());
    const zoomedSpan=await p.evaluate(()=>window.__touchQA.camera.right-window.__touchQA.camera.left);
    await touch('touchMove',[{...first,x:first.x+5,y:first.y+20},{...second,x:second.x+50,y:second.y+20}]);await p.waitForTimeout(150);
    const cameraAfter=await p.evaluate(()=>window.__touchQA.camera.position.toArray());
    if(distance(cameraBefore,cameraAfter)<.2)throw Error('two fingers cannot pan');
    if(Math.abs(await p.evaluate(()=>window.__touchQA.camera.right-window.__touchQA.camera.left)-zoomedSpan)>.01)throw Error('two-finger pan unexpectedly zooms');
    await touch('touchEnd',[]);await stopped('pinch');
    // Cancellation, loss of capture, and focus changes must not leave held input.
    await begin(0,-60);await p.waitForTimeout(150);await touch('touchCancel',[]);await stopped('pointer cancellation');
    point=await begin(65,0);await p.waitForTimeout(150);
    await p.evaluate(()=>document.querySelector('.worldSurface canvas').releasePointerCapture(window.__touchQA.pointerId));
    await touch('touchMove',[{x:point.x+66,y:point.y,id:1}]);await stopped('lost capture');await touch('touchEnd',[]);
    point=await begin(0,-60);await p.waitForTimeout(150);await p.locator('.bgmSettings>summary').focus();
    await touch('touchMove',[{x:point.x,y:point.y-70,id:1}]);await stopped('focus loss');await touch('touchEnd',[]);
    // Pointer jitter stays a tap. A ground tap still starts the original route.
    point=await ground();before=await position();await touch('touchStart',[{...point,id:1}]);await touch('touchMove',[{x:point.x+6,y:point.y+6,id:1}]);await p.waitForTimeout(150);
    if(distance(before,await position())>.01)throw Error('tap jitter starts walking');await touch('touchCancel',[]);
    const target=await p.evaluate(()=>{
     const q=window.__touchQA,actor=q.scene.children.find(o=>o.getObjectByName('Hips'));
     for(const [dx,dz] of [[1.5,0],[0,1.5],[-1.5,0],[0,-1.5]]){
      const v=actor.position.clone();v.x+=dx;v.z+=dz;v.y=0;v.project(q.camera);const point={x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
      if(document.elementFromPoint(point.x,point.y)?.tagName==='CANVAS')return point;
     }
    });
    before=await position();await p.touchscreen.tap(target.x,target.y);await p.waitForTimeout(300);
    if(distance(before,await position())<.5)throw Error('ground tap navigation lost');await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
    // Reading pauses motion, and releasing an old touch cannot resume it.
    point=await begin(0,-60);await p.waitForTimeout(100);await p.locator('.worldGuide>summary').click();
    await p.getByRole('link',{name:'経験館 Skyでのインターンと、We部の立ち上げ',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
    await touch('touchMove',[{x:point.x,y:point.y-70,id:1}]);await stopped('reading');await touch('touchEnd',[]);
    await p.keyboard.press('Escape');await stopped('closing reader');
    results.push({mode,reverse:true,pinch:true,cancel:true,captureLoss:true,focusLoss:true,tap:true,readingPauses:true});
   }else if(mode==='bicycle'){
    await p.getByRole('button',{name:'自転車に乗る',exact:true}).tap();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:20000});
    const vector=await p.evaluate(()=>{
     const q=window.__touchQA,a=q.scene.children.find(o=>o.getObjectByName('Hips')),start=a.position.clone().project(q.camera),end=a.position.clone();
     end.x+=Math.sin(a.rotation.y);end.z+=Math.cos(a.rotation.y);end.project(q.camera);
     const dx=(end.x-start.x)*innerWidth,dy=(start.y-end.y)*innerHeight,length=Math.hypot(dx,dy);return {x:dx/length*65,y:dy/length*65};
    });
    const before=await position();await begin(vector.x,vector.y);await p.waitForTimeout(900);const moving=await position();
    if(distance(before,moving)<.5)throw Error('flick does not drive bicycle');await touch('touchEnd',[]);await stopped('bicycle release');
    results.push({mode,distance:distance(before,moving),releaseStops:true});
   }else{
    const hallPoint=()=>p.evaluate(()=>{const q=window.__touchQA,h=q.scene.getObjectByName('hall-experience'),v=h.position.clone();v.x+=2.3;v.y=1.5;v.z+=2.55;v.project(q.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
    let point=await hallPoint();const before=await position();await touch('touchStart',[{...point,id:1}]);await touch('touchMove',[{x:point.x-45,y:point.y,id:1}]);await p.waitForTimeout(150);await touch('touchEnd',[]);
    if(distance(before,await position())<.25||await p.getByRole('dialog').isVisible())throw Error('drag over a hall does not move safely');
    point=await hallPoint();await p.touchscreen.tap(point.x,point.y);await p.getByRole('dialog').waitFor({state:'visible'});
    if(await p.locator('#detail-title').innerText()!=='経験館')throw Error('touch tap selects wrong hall');results.push({mode,selection:true});
   }
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
