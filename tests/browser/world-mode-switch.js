async page=>{
 const browser=page.context().browser(),errors=[];
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  await c.addInitScript(()=>{
   window.__modeQA={};window.__THREE_DEVTOOLS__=new EventTarget();
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__modeQA.scene=e.detail;});
  });
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');
  const welcome=p.getByRole('dialog',{name:'閲覧方法を選択',exact:true});await welcome.waitFor({state:'visible'});
  await welcome.getByRole('link',{name:'通常表示で読む',exact:true}).click();await p.waitForURL('**/profile');
  const normalModes=await p.locator('.modeSwitch').evaluate(nav=>({labels:[...nav.children].map(e=>e.textContent.trim()),active:nav.querySelector('[aria-current="page"]')?.textContent.trim()}));
  if(JSON.stringify(normalModes)!==JSON.stringify({labels:['3Dワールド','通常表示'],active:'通常表示'}))throw Error('normal mode switch is inconsistent '+JSON.stringify(normalModes));
  const timeOrigin=await p.evaluate(()=>performance.timeOrigin);
  await p.getByRole('link',{name:'3Dワールド',exact:true}).click();await p.waitForURL('http://localhost:3001/');
  if(await p.evaluate(()=>performance.timeOrigin)!==timeOrigin)throw Error('switching from normal display to 3D reloaded the document');
  await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  if(await welcome.isVisible())throw Error('mode switch reopened the entry choice');
  const worldModes=await p.locator('.modeSwitch').evaluate(nav=>({labels:[...nav.children].map(e=>e.textContent.trim()),active:nav.querySelector('[aria-current="page"]')?.textContent.trim()}));
  if(JSON.stringify(worldModes)!==JSON.stringify({labels:['3Dワールド','通常表示'],active:'3Dワールド'}))throw Error('world mode switch is inconsistent '+JSON.stringify(worldModes));
  await p.waitForFunction(()=>window.__modeQA.scene?.children.some(o=>o.getObjectByName('Hips')));
  const position=()=>p.evaluate(()=>window.__modeQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
  const before=await position();await p.locator('.worldSurface').focus();await p.keyboard.down('ArrowUp');await p.waitForTimeout(420);await p.keyboard.up('ArrowUp');
  const parked=await position();if(Math.hypot(parked[0]-before[0],parked[2]-before[2])<.3)throw Error('world was not interactive after switching back');
  const savedTime=await p.evaluate(()=>performance.timeOrigin);
  await p.locator('.modeSwitch a[href="/profile"]').click();await p.waitForURL('**/profile');
  if(await p.evaluate(()=>performance.timeOrigin)!==savedTime)throw Error('switching to normal display reloaded the document');
  await p.setViewportSize({width:320,height:568});
  const normalBounds=await p.locator('.modeBar').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,viewport:innerWidth,items:[...el.querySelectorAll('.modeSwitch>*')].map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent.trim(),active:e.getAttribute('aria-current')==='page',x:r.x,right:r.right,width:r.width,height:r.height};}),brand:(()=>{const r=el.querySelector('.wordmark').getBoundingClientRect();return {x:r.x,right:r.right};})()}));
  if(normalBounds.scroll>normalBounds.width+1||normalBounds.items.some(item=>item.x<0||item.right>normalBounds.viewport||item.width<44||item.height<44)||normalBounds.brand.right>normalBounds.items[0].x)throw Error('normal mode switch is cramped on a narrow screen '+JSON.stringify(normalBounds));
  await p.screenshot({path:'output/playwright/mode-switch-profile-320.png'});
  const profileTime=await p.evaluate(()=>performance.timeOrigin);
  await p.getByRole('link',{name:'3Dワールド',exact:true}).click();await p.waitForURL('http://localhost:3001/');
  await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  if(await p.evaluate(()=>performance.timeOrigin)!==profileTime)throw Error('returning to 3D reloaded the document');
  await p.waitForFunction(()=>window.__modeQA.scene?.children.some(o=>o.getObjectByName('Hips')));
  const restored=await position();if(Math.hypot(restored[0]-parked[0],restored[2]-parked[2])>.15)throw Error('world position was lost while reading '+JSON.stringify({parked,restored}));
  await p.screenshot({path:'output/playwright/mode-switch-world-320.png'});
  await p.goBack();await p.waitForURL('**/profile');if(await p.locator('.modeSwitch [aria-current="page"]').innerText()!=='通常表示')throw Error('back did not restore normal mode');
  await p.goForward();await p.waitForURL('http://localhost:3001/');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  if(await p.getByRole('dialog',{name:'閲覧方法を選択',exact:true}).isVisible())throw Error('history navigation reopened the entry choice');
  const bounds=await p.locator('.worldToolbar').evaluate(el=>({width:el.clientWidth,viewport:innerWidth,scroll:el.scrollWidth,items:[...el.querySelectorAll('.modeSwitch>*')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.right,r.height];})}));
  if(bounds.scroll>bounds.width+1||bounds.items.some(([x,right,height])=>x<0||right>bounds.viewport||height<44))throw Error('world mode switch is clipped '+JSON.stringify(bounds));
  await p.goto('http://localhost:3001/?detail=yoin');await p.getByRole('dialog',{name:'Yoin館',exact:true}).waitFor({state:'visible'});
  const hallTime=await p.evaluate(()=>performance.timeOrigin);await p.locator('.hallDialogHeader a').click();await p.waitForURL('**/projects/yoin');
  if(await p.evaluate(()=>performance.timeOrigin)!==hallTime)throw Error('switching from a hall to its normal article reloaded the document');
  const articleModes=await p.locator('.modeSwitch').evaluate(nav=>({labels:[...nav.children].map(e=>e.textContent.trim()),active:nav.querySelector('[aria-current="page"]')?.textContent.trim()}));
  if(JSON.stringify(articleModes)!==JSON.stringify({labels:['3Dワールド','通常表示'],active:'通常表示'}))throw Error('article mode switch is inconsistent '+JSON.stringify(articleModes));
  const articleTime=await p.evaluate(()=>performance.timeOrigin);await p.getByRole('link',{name:'3Dワールド',exact:true}).click();await p.waitForURL('http://localhost:3001/');
  if(await p.evaluate(()=>performance.timeOrigin)!==articleTime)throw Error('switching from a normal article to 3D reloaded the document');
  await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  if(await p.getByRole('dialog',{name:'閲覧方法を選択',exact:true}).isVisible())throw Error('article mode switch reopened the entry choice');
  if(errors.length)throw Error(errors.join('\n'));
  return {entryChoiceRemembered:true,sharedModeSwitch:true,clientNavigation:true,worldPositionRestored:true,articleRoundTrip:true,bounds};
 }finally{await c.close();}
}
