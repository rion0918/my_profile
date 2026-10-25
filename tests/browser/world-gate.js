async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:width!==1440,isMobile:width!==1440,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:0}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__gateQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     if(e.detail.isScene)window.__gateQA.scene=e.detail;
     if(e.detail.isWebGLRenderer){window.__gateQA.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(s,c)=>{window.__gateQA.camera=c;return render(s,c);};}
    });
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|mergeGeometries/i.test(m.text()))errors.push(m.text());});
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   const data=await p.evaluate(()=>{
    const qa=window.__gateQA,root=qa.scene.getObjectByName('area-gate');if(!root)throw Error('no area gate');
    qa.geometry=[];root.traverse(o=>{if(o.isMesh)qa.geometry.push(o.geometry.uuid);});
    const front=root.getObjectByName('area-gate-label-north'),back=root.getObjectByName('area-gate-label-south');
    front.geometry.computeBoundingBox();const bounds=front.geometry.boundingBox,center=front.localToWorld(front.position.clone().copy(bounds.getCenter(front.position.clone()))).project(qa.camera);
    const a=front.localToWorld(front.position.clone().set(-4.175,0,0)).project(qa.camera),b=front.localToWorld(front.position.clone().set(4.175,0,0)).project(qa.camera);
    const glass=root.getObjectByName('area-gate-glass'),canopy=root.getObjectByName('area-gate-canopy');
    return {meshes:qa.geometry.length,front:front.geometry.type==='TextGeometry',back:back.geometry.type==='TextGeometry',backRotation:back.rotation.y,noMirroredWord:front.material.every(m=>m.opacity===1)&&back.material.every(m=>m.opacity===0),glass:!!glass&&glass.material.transparent&&glass.material.opacity<.3,canopy:!!canopy&&canopy.material.transparent&&canopy.material.opacity<.6,x:(center.x+1)*innerWidth/2,y:(1-center.y)*innerHeight/2,left:(a.x+1)*innerWidth/2,right:(b.x+1)*innerWidth/2};
   });
   if(!data.front||!data.back||!data.noMirroredWord||!data.glass||!data.canopy||data.meshes>12||data.backRotation!==Math.PI)throw Error('gate faces, glass or batching broken '+JSON.stringify(data));
   if(data.x<0||data.x>width||data.y<65||data.y>height-75)throw Error('gate label outside usable viewport '+JSON.stringify({width,height,data}));
   if(data.left<8||data.right>width-8)throw Error('gate lettering clipped at the central plaza '+JSON.stringify({width,height,data}));
   await p.screenshot({path:`output/playwright/gate-day-${width}.png`});
   if(width===1440)await p.screenshot({path:'output/playwright/gate-glass-detail.png',clip:{x:535,y:50,width:620,height:540}});
   await p.clock.setFixedTime(new Date('2026-10-25T21:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   await p.waitForFunction(()=>document.querySelector('.worldSurface')?.dataset.night==='true');
   await p.locator('.worldSurface').evaluate(el=>el.blur());
   await p.screenshot({path:`output/playwright/gate-night-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(!await p.evaluate(()=>{const q=window.__gateQA,g=[];q.scene.getObjectByName('area-gate').traverse(o=>{if(o.isMesh)g.push(o.geometry.uuid);});return JSON.stringify(g)===JSON.stringify(q.geometry)&&!q.renderer.shadowMap.enabled;}))throw Error('low mode changes the gate');
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   await p.keyboard.down('w');await p.keyboard.down('d');await p.waitForTimeout(3100);await p.keyboard.up('w');await p.keyboard.up('d');
   const position=await p.evaluate(()=>window.__gateQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   if(position[2]>-6||Math.abs(position[0])>3)throw Error('walking under gate failed '+position);
   results.push({width,height,...data,lowMatches:true,walkedUnder:position});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
