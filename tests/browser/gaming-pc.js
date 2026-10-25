async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width!==1440,hasTouch:width!==1440,timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:0}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__pcQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     if(e.detail.isScene)window.__pcQA.scene=e.detail;
     if(e.detail.isWebGLRenderer){window.__pcQA.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(s,c)=>{if(!e.detail.getRenderTarget())window.__pcQA.camera=c;return render(s,c);};}
    });
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|mergeGeometries/i.test(m.text()))errors.push(m.text());});
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.locator('.worldGuide>summary').click();
   const specs=await p.locator('.guidePCSpecs').innerText();
   for(const value of ['Ryzen 7 5700X','RTX 3070 Ti','32 GB','1 TB'])if(!specs.includes(value))throw Error('missing PC specification '+value);
   if(width===390){await p.locator('.guidePCSpecs').scrollIntoViewIfNeeded();await p.screenshot({path:'output/playwright/pc-spec-guide-mobile.png'});}
   const destination=p.getByRole('button',{name:/ゲーミングPCを見に行く/});
   if(width===1440){await destination.focus();await p.keyboard.press('Enter');}else await destination.click();
   await p.waitForFunction(()=>{const p=window.__pcQA.scene.children.find(o=>o.getObjectByName('Hips')).position;return Math.hypot(p.x-11.8,p.z+6.6)<.1;},null,{timeout:20000});
   await p.keyboard.press('Escape');
   const model=await p.evaluate(()=>{
    const q=window.__pcQA,root=q.scene.getObjectByName('gaming-pc'),parts={};q.geometry=[];q.rotors=[];
    root.traverse(o=>{if(o.isMesh)q.geometry.push(o.geometry.uuid);if(o.name.startsWith('pc-fan-rotor-'))q.rotors.push(o);});
    for(const name of ['motherboard','gpu','cpu-cooler','memory','radiator','cables'])parts[name]=!!root.getObjectByName('pc-'+name);
    const points=[];for(const x of [-3.39,3.39])for(const y of [.48,7.68])for(const z of [-2.11,2.11]){
     const p=root.position.clone().set(10+x,y,-11+z).project(q.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});
    }
    const sign=root.getObjectByName('pc-spec-board'),signPoints=[];
    if(!sign?.getObjectByName('pc-spec-screen'))throw Error('specification sign missing');
    for(const x of [-1.6,1.6])for(const y of [0,4.4])for(const z of [-.375,.375]){
     const p=sign.position.clone().set(x,y,z);sign.localToWorld(p);p.project(q.camera);signPoints.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});
    }
    return {parts,meshes:q.geometry.length,fans:q.rotors.length,frame:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},signFrame:{left:Math.min(...signPoints.map(p=>p.x)),right:Math.max(...signPoints.map(p=>p.x)),top:Math.min(...signPoints.map(p=>p.y)),bottom:Math.max(...signPoints.map(p=>p.y))}};
   });
   if(model.fans!==13||Object.values(model.parts).some(v=>!v))throw Error('incomplete PC '+JSON.stringify(model));
   if(model.frame.left<8||model.frame.right>width-8||model.frame.top<8||model.frame.bottom>height-70)throw Error('PC does not fit the viewing point '+JSON.stringify({width,height,model}));
   if(model.signFrame.left<8||model.signFrame.right>width-8||model.signFrame.top<65||model.signFrame.bottom>height-70)throw Error('specification board does not fit the viewing point '+JSON.stringify({width,height,model}));
   await p.screenshot({path:`output/playwright/pc-day-${width}.png`});
   const before=await p.evaluate(()=>window.__pcQA.rotors.map(r=>r.rotation.z));
   await p.locator('.worldSurface').focus();await p.waitForTimeout(250);
   if(!await p.evaluate(before=>window.__pcQA.rotors.some((r,i)=>r.rotation.z!==before[i]),before))throw Error('quality fans do not animate');
   await p.clock.setFixedTime(new Date('2026-10-25T21:00:00+09:00'));await p.keyboard.press('Escape');
   await p.waitForFunction(()=>document.querySelector('.worldSurface')?.dataset.night==='true');await p.locator('.worldSurface').evaluate(el=>el.blur());
   await p.screenshot({path:`output/playwright/pc-night-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   const low=await p.evaluate(()=>{
    const q=window.__pcQA,g=[];q.scene.getObjectByName('gaming-pc').traverse(o=>{if(o.isMesh)g.push(o.geometry.uuid);});
    return {same:JSON.stringify(g)===JSON.stringify(q.geometry),rotations:q.rotors.map(r=>r.rotation.z)};
   });
   await p.waitForTimeout(200);
   if(!low.same||!await p.evaluate(rot=>JSON.stringify(window.__pcQA.rotors.map(r=>r.rotation.z))===JSON.stringify(rot),low.rotations))throw Error('low mode changes PC or keeps fans moving');
   await p.screenshot({path:`output/playwright/pc-low-${width}.png`});
   results.push({width,height,...model,night:true,sameLowModel:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await c.addInitScript(()=>{
   sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:16.15,z:25}));
   window.__THREE_DEVTOOLS__=new EventTarget();window.__pcBike={};window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__pcBike.scene=e.detail;});
  });
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
  await p.getByRole('button',{name:'自転車に乗る',exact:true}).click();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({timeout:20000});
  await p.locator('.worldGuide>summary').click();await p.getByRole('button',{name:/ゲーミングPCを見に行く/}).click();
  await p.waitForFunction(()=>{const p=window.__pcBike.scene.children.find(o=>o.getObjectByName('Hips')).position;return Math.hypot(p.x-11.8,p.z+6.6)<1;},null,{timeout:40000});
  await p.keyboard.press('Escape');if(!await p.getByRole('button',{name:'自転車を降りる',exact:true}).isVisible())throw Error('PC visit unexpectedly dismounts the bicycle');
  results.push({cyclingToPC:true,keyboardDestination:true});
 }finally{await c.close();}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
