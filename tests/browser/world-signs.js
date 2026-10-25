async page=>{
 const results=[],errors=[],browser=page.context().browser();
 for(const [width,height] of [[1440,900],[390,844]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');
    window.__THREE_DEVTOOLS__=new EventTarget();window.__signQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__signQA.scene=e.detail;});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   const inspect=()=>p.evaluate(()=>{
    const scene=window.__signQA.scene,words=[],bathLabels=new Set();let boards=0,screens=0;
    scene.traverse(o=>{
     if(o.name==='hall-word-sign')words.push(o.userData.word);
     if(o.name==='product-screen-front')screens++;
     if(o.isMesh&&!Array.isArray(o.material)&&o.material.color?.getHex()===0x6b638d)boards++;
    });
    scene.getObjectByName('onsen').traverse(o=>{
     const map=o.material?.map;if(map?.image.width===768&&map.image.height===160)bathLabels.add(map);
    });
    return {boards,words,screens,bathLabels:bathLabels.size};
   });
   const initial=await inspect();
   if(initial.boards!==0)throw Error('small roadside boards remain: '+initial.boards);
   if(initial.words.length!==7||initial.screens!==2||initial.bathLabels!==3)throw Error('large hall signs, product screens or bath architecture changed '+JSON.stringify(initial));
   await p.getByRole('button',{name:'街全体を見る',exact:true}).click();
   await p.screenshot({path:`output/playwright/signs-removed-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(JSON.stringify(await inspect())!==JSON.stringify(initial))throw Error('quality modes disagree about signs');
   results.push({width,height,...initial,lowMatches:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
