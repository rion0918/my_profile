async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 const halls=[['history',-8,23],['experience',8,23],['yoin',-8,6],['pop-reminder',8,6],['github',-22,14],['zenn',22,14],['x',-32,7]];
 for(const [width,height] of [[1440,1000],[390,844]])for(const [id,x,z] of halls){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(({x,z})=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x,z:z+7}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__architecture={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     if(e.detail.isScene)window.__architecture.scene=e.detail;
     if(e.detail.isWebGLRenderer){window.__architecture.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(s,c)=>{window.__architecture.camera=c;return render(s,c);};}
    });
   },{x,z});
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});
   await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor().catch(async e=>{throw Error(e.message+' '+JSON.stringify({errors,body:await p.locator('body').innerText()}));});
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   if(width<760)await p.getByRole('button',{name:'景色を縮小',exact:true}).click();
   const framing=await p.evaluate(id=>{
    const q=window.__architecture,hall=q.scene.getObjectByName('hall-'+id),target=hall.position.clone();target.y=2.5;target.project(q.camera);
    const candidates=[];for(const y of [.65,.5,.75])for(const x of [.45,.2,.75])candidates.push({x:innerWidth*x,y:innerHeight*y});
    return {x:(target.x+1)*innerWidth/2,y:(1-target.y)*innerHeight/2,start:candidates.find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')};
   },id);
   await p.mouse.move(framing.start.x,framing.start.y);await p.mouse.down();await p.mouse.move(framing.start.x+width*.5-framing.x,framing.start.y+height*.48-framing.y,{steps:10});await p.mouse.up();
   await p.screenshot({path:`output/playwright/architecture-${id}-${width}.png`});
   const shape=await p.evaluate(id=>{
    const q=window.__architecture,h=q.scene.getObjectByName('hall-'+id),architecture=h.getObjectByName('hall-architecture'),glass=[],geometry=[];
    architecture?.traverse(o=>{if(o.isMesh){geometry.push(o.geometry.uuid);if(o.material.transparent&&o.material.isMeshPhysicalMaterial)glass.push({opacity:o.material.opacity,depthWrite:o.material.depthWrite,texture:!!o.material.map});}});
    q.geometry=geometry;return {architecture:!!architecture,glass,interior:!!h.getObjectByName('hall-interior'),word:h.getObjectByName('hall-word-sign')?.userData.word,renderCalls:q.renderer.info.render.calls};
   },id);
   if(!shape.architecture||!shape.interior||shape.glass.length<3||shape.glass.some(g=>g.opacity>.28||g.depthWrite||!g.texture))throw Error('hall has no furnished glazed architecture '+id+' '+JSON.stringify(shape));
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   const unchanged=await p.evaluate(id=>{const q=window.__architecture,ids=[];q.scene.getObjectByName('hall-'+id).getObjectByName('hall-architecture').traverse(o=>{if(o.isMesh)ids.push(o.geometry.uuid);});return JSON.stringify(ids)===JSON.stringify(q.geometry)&&!q.renderer.shadowMap.enabled;},id);
   if(!unchanged)throw Error('low mode changes the architecture '+id);
   await p.screenshot({path:`output/playwright/architecture-${id}-low-${width}.png`});
   if(['github','yoin','pop-reminder'].includes(id)){
    await p.clock.setFixedTime(new Date('2026-10-25T21:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.worldSurface').dataset.night==='true');
    await p.screenshot({path:`output/playwright/architecture-${id}-night-${width}.png`});
   }
   if(await p.locator('.entryLabel').count())throw Error('entry buttons returned');
   results.push({id,width,...shape,sameLowGeometry:unchanged});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
