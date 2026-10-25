async page=>{
 const browser=page.context().browser(),results=[],errors=[],origin='http://localhost:3001';
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:-32,z:12}));
    window.__THREE_DEVTOOLS__=new EventTarget();window.__xQA={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__xQA.scene=e.detail;if(e.detail.isWebGLRenderer)window.__xQA.renderer=e.detail;});
   });
   await c.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>X destination</title>'}));
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
   await p.goto(origin);await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   const exterior=await p.evaluate(()=>{
    const q=window.__xQA,hall=q.scene.getObjectByName('hall-x'),icon=q.scene.getObjectByName('service-icon-x'),sign=hall.getObjectByName('hall-word-sign');
    q.geometry=sign.geometry;q.icon=icon;
    return {model:hall.userData.hallModel,word:sign.userData.word,lit:sign.material.every(m=>m.emissiveIntensity>=.8),iconHeight:icon.position.y,texture:icon.getObjectByName('hall-icon-front').material.map.image.src,halls:q.scene.children.filter(o=>o.name.startsWith('hall-')).length};
   });
   if(exterior.model!=='workshop'||exterior.word!=='X'||!exterior.lit||exterior.iconHeight>1||!exterior.texture.endsWith('/images/brands/x-logo-white.png')||exterior.halls!==7)throw Error('X exterior incomplete '+JSON.stringify(exterior));
   await p.screenshot({path:`output/playwright/x-hall-exterior-${width}.png`});
   await p.clock.setFixedTime(new Date('2026-10-25T21:00:00+09:00'));await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
   await p.waitForFunction(()=>document.querySelector('.worldSurface')?.dataset.night==='true');
   await p.screenshot({path:`output/playwright/x-hall-night-${width}.png`});
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(!await p.evaluate(()=>{const q=window.__xQA;return q.scene.getObjectByName('hall-x').getObjectByName('hall-word-sign').geometry===q.geometry&&q.scene.getObjectByName('service-icon-x')===q.icon&&!q.renderer.shadowMap.enabled;}))throw Error('low mode changes X hall');
   await p.locator('.worldGuide>summary').click();
   if(!await p.locator('.guideMap').getAttribute('aria-label').then(t=>t.includes('キャリア館')&&t.includes('XはX館'))||await p.locator('.guideMap text').filter({hasText:/^X$/}).count()!==1)throw Error('X or career missing on the map');
   if(!await p.locator('.worldDirectory a').filter({hasText:'X館 · 寄り道'}).isVisible())throw Error('X is missing from optional halls');
   await p.getByRole('button',{name:'X館へ歩く',exact:true}).click();const hall=p.getByRole('dialog',{name:'X館',exact:true});await hall.waitFor({state:'visible',timeout:15000});
   if(!p.url().endsWith('?detail=x')||await p.locator('.tourFooter').count()||await hall.locator('.hallAccount').innerText()!=='x.com/rioi7_0918')throw Error('X entry or account incorrect');
   const logo=hall.getByRole('img',{name:'Xの公式アイコン',exact:true});await logo.waitFor({state:'visible'});if(!await logo.evaluate(e=>e.complete&&e.naturalWidth===2400))throw Error('X official icon did not load');
   const a=hall.getByRole('link',{name:'Xへ',exact:true});await a.scrollIntoViewIfNeeded();
   if(await a.getAttribute('href')!=='https://x.com/rioi7_0918'||await a.getAttribute('target')!=='_blank'||!await a.getAttribute('rel').then(r=>r.includes('noopener')&&r.includes('noreferrer')))throw Error('wrong or unsafe X profile destination');
   const scroll=await hall.locator('.hallDialogBody').evaluate(e=>e.scrollTop),history=await p.evaluate(()=>window.history.length);
   const popupPromise=p.waitForEvent('popup');await a.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');if(popup.url()!=='https://x.com/rioi7_0918')throw Error('X link opened the wrong account');await popup.close();
   if(!await hall.isVisible()||await hall.locator('.hallDialogBody').evaluate(e=>e.scrollTop)!==scroll||await p.evaluate(()=>window.history.length)!==history)throw Error('X external link lost hall state');
   await p.screenshot({path:`output/playwright/x-hall-interior-${width}.png`});
   await p.keyboard.press('Escape');await hall.waitFor({state:'hidden'});await p.waitForTimeout(250);if(await hall.isVisible())throw Error('X reopens immediately after exit');
   await p.goForward();await hall.waitFor({state:'visible'});await p.reload();await hall.waitFor({state:'visible'});
   await hall.getByRole('link',{name:'通常表示で読む ↗',exact:true}).click();await p.waitForURL('**/social#x');
   if(!await p.locator('#x').isVisible())throw Error('X normal display anchor missing');
   results.push({width,height,exterior,walk:true,entry:true,externalState:true,history:true,sameLowGeometry:true,normalDisplay:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:390,height:844}});
 try{
  await c.addInitScript(()=>{const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:context.call(this,type,...args);};});
  const p=await c.newPage();await p.goto(origin+'/?detail=x');const hall=p.getByRole('dialog',{name:'X館',exact:true});await hall.waitFor({state:'visible'});
  await p.getByText('この環境では3Dを表示できませんでした。',{exact:true}).waitFor({state:'attached'});
  if(!await hall.getByRole('link',{name:'Xへ',exact:true}).isVisible())throw Error('X information depends on WebGL');results.push({withoutWebGL:true});
 }finally{await c.close();}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
