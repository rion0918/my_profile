async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,1000],[390,844],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width!==1440,hasTouch:width!==1440,timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(desktop=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:desktop?16.15:0,z:desktop?25:0}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__onsenQA={};window.__onsenViolations=[];
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__onsenQA.scene=e.detail;if(e.detail.isWebGLRenderer){const r=e.detail,render=r.render.bind(r);window.__onsenQA.renderer=r;r.render=(s,c)=>{if(!r.getRenderTarget())window.__onsenQA.camera=c;return render(s,c);};}});
    document.addEventListener('securitypolicyviolation',e=>window.__onsenViolations.push(e.effectiveDirective));
   },width===1440);
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url());});
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.evaluate(()=>{const q=window.__onsenQA;q.person=q.scene.children.find(o=>o.getObjectByName('Hips'));q.geometry=[];q.scene.getObjectByName('onsen').traverse(o=>{if(o.isMesh)q.geometry.push(o.geometry.uuid);});});
   if(width===1440){await p.getByRole('button',{name:'自転車に乗る',exact:true}).click();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({timeout:20000});}
   const visits=[];
   for(const [id,label,x,z] of [['outdoor','露天風呂へ歩く ↗',-19,-22.1],['indoor','内湯へ歩く ↗',-19.9,-28.2],['pots','壺湯の庭へ歩く ↗',-13,-25.8]]){
    await p.locator('.worldGuide>summary').click();
    if(await p.locator('.guideOnsen').evaluate(e=>e.scrollWidth>e.clientWidth))throw Error('onsen guide overflow');
    if(!await p.locator('.guideOnsen').innerText().then(t=>t.includes('岩滝')&&t.includes('壺湯')))throw Error('missing garden explanation');
    const b=p.getByRole('button',{name:label,exact:true});if(width===1440){await b.focus();await p.keyboard.press('Enter');}else await b.click();
    await p.waitForFunction(([x,z])=>{const p=window.__onsenQA.person.position;return Math.hypot(p.x-x,p.z-z)<.1;},[x,z],{timeout:60000});
    const state=await p.evaluate(()=>{const q=window.__onsenQA,r=q.scene.getObjectByName('onsen'),water=[];r.traverse(o=>{if(o.isMesh&&o.material.uniforms?.time)water.push(o);});return {roof:q.scene.getObjectByName('onsen-roof').visible,frontWalls:q.scene.getObjectByName('onsen-cutaway').visible,water:water.length,geometry:water.map(o=>o.geometry.uuid)};});
    if(await p.getByRole('button',{name:'木もれびの湯の露天風呂へ歩く',exact:true}).isVisible())throw Error('floating onsen label obscures the garden at close range');
    if(state.roof!==(id!=='indoor')||state.frontWalls!==(id!=='indoor')||state.water<8)throw Error('incorrect cutaway or missing bath water '+JSON.stringify(state));
    if(width===1440&&await p.getByRole('button',{name:'自転車を降りる',exact:true}).isVisible())throw Error('did not dismount before entering garden');
    await p.keyboard.press('Escape');await p.locator('.worldSurface').evaluate(e=>e.blur());await p.screenshot({path:`output/playwright/onsen/${id}-${width}-day.png`});
    await p.clock.setFixedTime(new Date('2026-10-25T21:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.dataset.night==='true');await p.locator('.worldSurface').evaluate(e=>e.blur());await p.screenshot({path:`output/playwright/onsen/${id}-${width}-night.png`});
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
    const low=await p.evaluate(()=>{const q=window.__onsenQA,g=[],times=[];q.scene.getObjectByName('onsen').traverse(o=>{if(o.isMesh)g.push(o.geometry.uuid);if(o.material?.uniforms?.time)times.push(o.material.uniforms.time.value);});return {same:JSON.stringify(g)===JSON.stringify(q.geometry),frozen:times.every(t=>t===0),steam:q.scene.getObjectByName('onsen-steam').visible,shadows:q.renderer.shadowMap.enabled};});
    if(!low.same||!low.frozen||low.steam||low.shadows)throw Error('low settings changed garden or continue costly animation '+JSON.stringify(low));
    await p.screenshot({path:`output/playwright/onsen/${id}-${width}-low.png`});
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('quality');await p.getByLabel('画質・BGM設定').click();await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
    visits.push({id,...state,low});
   }
   if((await p.evaluate(()=>window.__onsenViolations)).length)throw Error('CSP violations');
   results.push({width,height,visits,keyboard:width===1440,automaticDismount:width===1440});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
