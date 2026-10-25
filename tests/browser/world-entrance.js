async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<900,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__entranceQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__entranceQA.scene=e.detail;if(e.detail.isWebGLRenderer)window.__entranceQA.renderer=e.detail;});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   const floor=await p.evaluate(()=>{
    const scene=window.__entranceQA.scene,entry=scene.getObjectByName('entrance-mosaic'),central=scene.getObjectByName('central-mosaic');
    window.__entranceQA.floor=entry;window.__entranceQA.geometry=entry.geometry;
    return {position:entry.position.toArray(),radius:entry.geometry.parameters.radius,sharedMaterial:entry.material===central.material};
   });
   if(floor.position[0]!==0||floor.position[2]!==31||floor.radius<4.4||!floor.sharedMaterial)throw Error('incorrect entrance mosaic '+JSON.stringify(floor));
   const cta=await p.locator('.welcomeActions button').first().boundingBox();if(cta.x<0||cta.x+cta.width>width||cta.y+cta.height>height)throw Error('welcome action clipped');
   await p.screenshot({path:`output/playwright/entrance-welcome-${width}.png`});
   await p.getByRole('button',{name:'自由に探索する',exact:true}).click();
   await p.screenshot({path:`output/playwright/entrance-day-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(!await p.evaluate(()=>window.__entranceQA.scene.getObjectByName('entrance-mosaic')===window.__entranceQA.floor&&window.__entranceQA.floor.geometry===window.__entranceQA.geometry&&!window.__entranceQA.renderer.shadowMap.enabled))throw Error('low quality changes entry');
   await p.screenshot({path:`output/playwright/entrance-low-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('quality');await p.getByLabel('画質・BGM設定').click();
   await p.clock.setFixedTime(new Date('2026-10-24T21:00:00+09:00'));
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.worldSurface').dataset.night==='true');
   await p.screenshot({path:`output/playwright/entrance-night-${width}.png`});
   await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});
   if(await p.locator('#detail-title').innerText()!=='キャリア')throw Error('tour lost its starting point');
   results.push({width,height,floor,qualityKeepsFloor:true,welcomeReadable:true,tour:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
