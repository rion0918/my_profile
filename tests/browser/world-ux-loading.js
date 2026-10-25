async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const mode of ['early-reading','context-loss','character-failure']){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
   await c.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__loading={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene){window.__loading.scene=e.detail;if(window.__loseDuringBuild)setTimeout(()=>{window.__loading.lossHallCount=e.detail.children.filter(o=>o.name.startsWith('hall-')).length;window.__loading.renderer.forceContextLoss();},0);}if(e.detail.isWebGLRenderer)window.__loading.renderer=e.detail;});
   });
   if(mode==='context-loss')await c.addInitScript(()=>{window.__loseDuringBuild=true;});
   if(mode==='character-failure')await c.route('**/models/rion-walker.glb',r=>r.abort());
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));const client=await c.newCDPSession(p);await client.send('Emulation.setCPUThrottlingRate',{rate:4});
   await p.goto('http://localhost:3001');
   if(mode==='context-loss'){
    await p.waitForFunction(()=>window.__loading.scene);
    await p.getByText('この環境では3Dを表示できませんでした。',{exact:true}).waitFor();
    if(await p.evaluate(()=>window.__loading.lossHallCount)>=6)throw Error('must exercise loss early in construction');
    await p.waitForFunction(()=>window.__loading.scene.children.length===0);
    if(await p.locator('.worldSurface canvas').count())throw Error('renderer retained after failed construction');
   }else if(mode==='character-failure'){
    await p.getByText('この環境では3Dを表示できませんでした。',{exact:true}).waitFor();
    await p.getByRole('link',{name:'通常表示で読む ↗',exact:true}).first().click();await p.waitForURL('**/profile');
   }else{
    await p.waitForFunction(()=>window.__loading.scene);
    await p.locator('.worldGuide > summary').tap();
    await p.getByRole('link',{name:'経験館 Skyでのインターンと、We部の立ち上げ',exact:true}).tap();await p.getByRole('dialog').waitFor({state:'visible'});
    const title=await p.locator('#detail-title').innerText();if(title!=='経験館')throw Error('cannot read during loading');
    await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
    await p.locator('.worldGuide > summary').tap();
    await p.getByLabel('画質・BGM設定').tap();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').tap();
    await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
    if(await p.evaluate(()=>window.__loading.renderer.shadowMap.enabled))throw Error('quality selection made while loading was lost');
   }
   await client.detach();results.push({mode,passed:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
