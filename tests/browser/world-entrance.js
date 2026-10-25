async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [width,height] of [[1440,900],[390,844],[375,667],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<900,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__entranceQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__entranceQA.scene=e.detail;if(e.detail.isWebGLRenderer)window.__entranceQA.renderer=e.detail;});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
   await p.goto('http://localhost:3001');
   const choice=p.getByRole('dialog',{name:'閲覧方法を選択',exact:true});await choice.waitFor({state:'visible',timeout:2500});
   const box=await choice.locator('.worldWelcome').boundingBox();if(Math.abs(box.x+box.width/2-width/2)>2||Math.abs(box.y+box.height/2-height/2)>2||box.y<0||box.y+box.height>height)throw Error('entry choice is not centered or clipped');
   if((await choice.innerText()).length>120||!await choice.getByRole('heading',{name:'橋本怜苑',exact:true}).isVisible())throw Error('entry is too wordy or identity missing');
   if(!await p.locator('.worldMain').evaluate(e=>e.inert))throw Error('world is interactive before a choice');
   const guide=choice.getByRole('button',{name:'案内を見る',exact:true}),explore=choice.getByRole('button',{name:'自由に探索する',exact:true}),read=choice.getByRole('link',{name:'通常表示で読む',exact:true});
   for(const control of [guide,read,explore]){const b=await control.boundingBox();if(b.height<44||b.x<0||b.x+b.width>width||b.y<0||b.y+b.height>height)throw Error('entry option clipped or too small');}
   await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   await guide.focus();await p.keyboard.press('Shift+Tab');if(!await explore.evaluate(e=>e===document.activeElement))throw Error('entry reverse tab escaped');await p.keyboard.press('Tab');if(!await guide.evaluate(e=>e===document.activeElement))throw Error('entry tab escaped');
   const position=()=>p.evaluate(()=>window.__entranceQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const waiting=await position();await p.keyboard.down('w');await p.waitForTimeout(150);await p.keyboard.up('w');await p.keyboard.press('Escape');if(JSON.stringify(waiting)!==JSON.stringify(await position())||!await choice.isVisible())throw Error('entry moved or dismissed without a choice');
   const floor=await p.evaluate(()=>{
    const scene=window.__entranceQA.scene,entry=scene.getObjectByName('entrance-mosaic'),central=scene.getObjectByName('central-mosaic');
    window.__entranceQA.floor=entry;window.__entranceQA.geometry=entry.geometry;
    return {position:entry.position.toArray(),radius:entry.geometry.parameters.radius,sharedMaterial:entry.material===central.material};
   });
   if(floor.position[0]!==0||floor.position[2]!==31||floor.radius<4.4||!floor.sharedMaterial)throw Error('incorrect entrance mosaic '+JSON.stringify(floor));
   const cta=await p.locator('.welcomeActions button').first().boundingBox();if(cta.x<0||cta.x+cta.width>width||cta.y+cta.height>height)throw Error('welcome action clipped');
   await p.screenshot({path:`output/playwright/entrance-welcome-${width}.png`});
   await explore.click();if(await p.locator('.worldMain').evaluate(e=>e.inert))throw Error('world stayed inert after exploration choice');
   await p.waitForFunction(()=>document.activeElement===document.querySelector('.worldSurface'));
   await p.keyboard.down('w');try{await p.waitForFunction(before=>Math.hypot(...window.__entranceQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray().map((n,i)=>n-before[i]))>.1,waiting,{timeout:3000});}finally{await p.keyboard.up('w');}
   await p.screenshot({path:`output/playwright/entrance-day-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(!await p.evaluate(()=>window.__entranceQA.scene.getObjectByName('entrance-mosaic')===window.__entranceQA.floor&&window.__entranceQA.floor.geometry===window.__entranceQA.geometry&&!window.__entranceQA.renderer.shadowMap.enabled))throw Error('low quality changes entry');
   await p.screenshot({path:`output/playwright/entrance-low-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('quality');await p.getByLabel('画質・BGM設定').click();
   await p.clock.setFixedTime(new Date('2026-10-24T21:00:00+09:00'));
   await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.worldSurface').dataset.night==='true');
   await p.screenshot({path:`output/playwright/entrance-night-${width}.png`});
   await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});
   if(await p.locator('#detail-title').innerText()!=='Background')throw Error('tour lost its starting point');
   results.push({width,height,floor,qualityKeepsFloor:true,welcomeReadable:true,choice:true,keyboard:true,tour:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:320,height:568},javaScriptEnabled:false});
 try{const p=await c.newPage();await p.goto('http://localhost:3001');const choice=p.getByRole('dialog',{name:'閲覧方法を選択',exact:true});await choice.waitFor({state:'visible'});if(!await choice.getByRole('heading',{name:'橋本怜苑',exact:true}).isVisible())throw Error('identity waits for JavaScript');await choice.getByRole('link',{name:'通常表示で読む',exact:true}).click();await p.waitForURL('**/profile');if(!await p.getByRole('heading',{level:1}).isVisible())throw Error('normal display cannot be opened before 3D');results.push({withoutJavaScript:true});}finally{await c.close();}
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});const p=await fallback.newPage();await p.goto('http://localhost:3001');await p.getByText('この環境では3Dを表示できませんでした。',{exact:true}).waitFor({state:'attached'});const choice=p.getByRole('dialog',{name:'閲覧方法を選択',exact:true});await choice.waitFor({state:'visible',timeout:2500});await choice.getByRole('button',{name:'案内を見る',exact:true}).click();await p.getByRole('dialog',{name:'Background',exact:true}).waitFor({state:'visible'});if(await choice.count())throw Error('choice did not close for fallback tour');results.push({webglFallbackChoice:true});}finally{await fallback.close();}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
