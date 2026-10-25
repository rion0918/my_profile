async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [id,x,z,width,height,reduced] of [
  ['experience',7,18,1440,900,false],['history',-9,17.5,1440,900,true],
  ['yoin',-9,.3,1440,900,true],['pop-reminder',7,.3,1440,900,true],
  ['github',-23,8,1440,900,true],['zenn',21,9,1440,900,true],['x',-33,1.5,1440,900,true],
  ['experience',7,18,390,844,false]
 ]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:reduced?'reduce':'no-preference',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(({x,z})=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x,z}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__fadeQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__fadeQA.scene=e.detail;});
   },{x,z});
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});
   p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.waitForFunction(id=>{
    const hall=window.__fadeQA.scene.getObjectByName('hall-'+id),materials=new Set();
    hall.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    const solid=[...materials].filter(m=>m.isMeshStandardMaterial&&Math.abs(m.opacity-.38)<.005);
    if(solid.length<3)return false;window.__fadeQA.solid=solid;window.__fadeQA.hall=hall;return true;
   },id);
   const geometry=await p.evaluate(()=>{const result=[];window.__fadeQA.hall.traverse(o=>{if(o.isMesh)result.push(o.geometry.uuid)});return result;});
   if(!await p.evaluate(()=>window.__fadeQA.solid.every(m=>m.transparent&&!m.depthWrite)))throw Error('faded roof still writes opaque depth');
   await p.screenshot({path:`output/playwright/translucent-${id}-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(JSON.stringify(geometry)!==JSON.stringify(await p.evaluate(()=>{const result=[];window.__fadeQA.hall.traverse(o=>{if(o.isMesh)result.push(o.geometry.uuid)});return result;})))throw Error('quality mode changes building geometry');
   if(!await p.evaluate(()=>window.__fadeQA.solid.every(m=>Math.abs(m.opacity-.38)<.005)))throw Error('low mode lost translucency');
   await p.screenshot({path:`output/playwright/translucent-${id}-low-${width}.png`});
   await p.evaluate(()=>{const q=window.__fadeQA,person=q.scene.children.find(o=>o.getObjectByName('Hips'));person.position.set(0,.08,31);});
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   await p.waitForFunction(()=>window.__fadeQA.solid.every(m=>m.opacity===1&&!m.transparent),null,{timeout:3000});
   results.push({id,width,reduced,translucent:true,lowMode:true,restoresWhileIdle:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
