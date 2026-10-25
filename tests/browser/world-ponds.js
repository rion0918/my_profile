async page=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,1000],[390,844]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:34,z:-10,view:{x:28,z:-10,overview:false,panned:true}}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__pondQA={};window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__pondQA.scene=e.detail;});
   });
   const p=await c.newPage();await p.bringToFront();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   const surfaces=()=>p.evaluate(()=>{const result=[];window.__pondQA.scene.traverse(o=>{if(o.isMesh&&o.material.uniforms?.ocean?.value===0)result.push({geometry:o.geometry.uuid,position:o.position.toArray(),basin:o.material.uniforms.basin.value.toArray(),reflections:o.material.uniforms.reflectionsEnabled.value});});return result;});
   const before=await surfaces();if(before.length!==2)throw Error('missing lake surfaces');
   await p.screenshot({path:`output/playwright/lake-after-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   const low=await surfaces();if(low.some((s,i)=>s.geometry!==before[i].geometry||JSON.stringify(s.position)!==JSON.stringify(before[i].position)||s.reflections))throw Error('low mode changes the lake shape or position');
   await p.screenshot({path:`output/playwright/lake-after-low-${width}.png`});
   await p.getByRole('button',{name:'街全体を見る',exact:true}).click();await p.screenshot({path:`output/playwright/lake-overview-${width}.png`});
   results.push({width,height,surfaces:before,sameLowGeometry:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
