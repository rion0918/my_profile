async(page)=>{
 const origin='http://localhost:3001',results=[];
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const p=await c.newPage();await p.goto(origin);await p.waitForFunction(()=>document.querySelector('.welcomeActions button')?.disabled===false);
  await p.locator('.welcomeActions button').first().focus();await p.keyboard.press('Enter');await p.getByRole('dialog').waitFor({state:'visible'});
  const first=p.getByRole('dialog').getByRole('link',{name:'通常表示で読む ↗',exact:true}),next=p.locator('.tourNext');
  await first.focus();await p.keyboard.press('Shift+Tab');if(!await next.evaluate(el=>el===document.activeElement))throw Error('reverse tab escaped modal');
  await p.keyboard.press('Tab');if(!await first.evaluate(el=>el===document.activeElement))throw Error('forward tab escaped modal');
  await next.focus();await p.keyboard.press('Enter');await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('#detail-title').innerText()!=='実務経験・活動')throw Error('keyboard next failed');
  await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.locator('.worldSurface').focus();await p.keyboard.down('w');await p.waitForTimeout(250);await p.keyboard.up('w');await p.keyboard.press('Escape');
  const moved=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  if(Math.hypot(moved.x-8,moved.z+1.61)<.1)throw Error('cannot move after leaving tour');
  await p.setViewportSize({width:844,height:390});await p.goto(origin);await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});
  const footer=await p.locator('.tourFooter').boundingBox();if(footer.y<0||footer.y+footer.height>390)throw Error('landscape footer clipped');
  await p.screenshot({path:'output/playwright/tour-landscape.png'});
  results.push({keyboard:true,focusTrap:true,escape:true,walkAfterExit:true,landscape:true});
 }finally{await c.close();}
 const disabled=await page.context().browser().newContext({viewport:{width:390,height:844}});
 try{
  await disabled.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
  const p=await disabled.newPage();await p.goto(origin);await p.locator('.worldFallback').waitFor({state:'visible'});
  await p.locator('.welcomeActions button').first().click();await p.getByRole('dialog').waitFor({state:'visible'});
  await p.getByRole('button',{name:'次：実務経験・活動 →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('#detail-title').innerText()!=='実務経験・活動')throw Error('fallback tour stuck');
  results.push({webglFallbackReading:true});
 }finally{await disabled.close();}
 return results;
}
