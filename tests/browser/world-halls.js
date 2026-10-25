async(page)=>{
 const origin='http://localhost:3001',results=[],errors=[];
 const stops=[['history','キャリア'],['experience','経験館'],['yoin','Yoin館'],['pop-reminder','ふわっと。館']];
 const destinations={github:'https://github.com/rion0918',zenn:'https://zenn.dev/riozenn','pop-reminder':'https://fuwatto.pages.dev/'};
 const browser=page.context().browser();
 const setup=async c=>{
  await c.addInitScript(()=>{
   window.__THREE_DEVTOOLS__=new EventTarget();window.__hallQA={};window.__violations=[];
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__hallQA.scene=e.detail;if(e.detail.isWebGLRenderer)window.__hallQA.renderer=e.detail;});
   document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.effectiveDirective));
  });
 };
 const ready=p=>p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
 const position=p=>p.evaluate(()=>window.__hallQA.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
 const c=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Tokyo'});
 try{
  await setup(c);await c.addInitScript(()=>{sessionStorage.setItem('portfolio-position-v4',JSON.stringify({version:4,x:-7,z:8}));sessionStorage.setItem('portfolio-welcome-v3','seen');});
  await c.route(/^https:\/\/(github.com|zenn.dev|fuwatto.pages.dev)\//,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>External link target</title><p>Link destination verified.</p>'}));
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
  const html=await(await p.request.get(origin)).text();if(!html.includes('街の入口')||!html.includes('通常表示で読む'))throw Error('missing initial HTML');
  await p.goto(origin);await ready(p);const spawn=await position(p);if(Math.hypot(spawn[0],spawn[2]-31)>.01)throw Error('old position restored '+spawn);
  await p.screenshot({path:'output/playwright/halls-entry-desktop.png'});
  const h=await p.evaluate(()=>history.length);await p.locator('.welcomeActions button').first().click();
  for(let i=0;i<stops.length;i++){
   const [id,title]=stops[i];await p.getByRole('dialog').waitFor({state:'visible'});
   if(await p.locator('#detail-title').innerText()!==title)throw Error('incorrect stop '+id);
   if(await p.locator('.hallDialogBody').evaluate(e=>e.scrollTop)!==0)throw Error('new hall did not start at the top');
   const point=await position(p);await p.keyboard.down('w');await p.waitForTimeout(80);await p.keyboard.up('w');const held=await position(p);
   if(point[0]!==held[0]||point[2]!==held[2])throw Error('movement during reading');
   if(id==='experience'){
    const titles=await p.locator('.hallContent .hallCareerCard h3').allTextContents();if(titles.length!==2||!titles[0].includes('Sky')||!titles[1].includes('We部'))throw Error('experience mixed with history '+titles);
   }
   if(id==='history'){
    const titles=await p.locator('.hallContent .hallCareerCard h3').allTextContents();if(titles.length!==3||!titles[0].includes('上宮')||!titles[1].includes('神戸電子')||!titles[2].includes('DMM'))throw Error('history missing facts '+titles);
    const current=await p.getByRole('region',{name:'現在の立場',exact:true}).boundingBox(),footer=await p.locator('.tourFooter').boundingBox();if(current.y+current.height>footer.y)throw Error('current position hidden below tour footer');
    if(!await p.locator('.hallFactNote').innerText().then(t=>t.includes('27卒')&&t.includes('内定')))throw Error('offer misrepresented');
   }
   if(destinations[id]){
    const door=p.locator('.hallProductLinks .hallAction');if(await door.getAttribute('target')!=='_blank'||!await door.getAttribute('rel').then(r=>r.includes('noopener')&&r.includes('noreferrer')))throw Error('unsafe external door');
    const popupPromise=p.waitForEvent('popup');await door.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
    if(popup.url().replace(/\/$/,'')!==destinations[id].replace(/\/$/,''))throw Error('wrong external destination '+popup.url());await popup.close();
    if(!await p.getByRole('dialog').isVisible()||!p.url().includes('detail='+id)||await p.evaluate(()=>history.length)!==h+1)throw Error('external link lost tour');
   }
   if(id==='yoin'||id==='pop-reminder'){
    if(await p.locator('.hallGalleryThumbnails button').count()!==2)throw Error('missing product screens');
    await p.locator('.hallGalleryMain').scrollIntoViewIfNeeded();
    await p.waitForFunction(()=>document.querySelector('.hallGalleryMain img')?.complete&&document.querySelector('.hallGalleryMain img').naturalWidth>300);
    const headings=await p.locator('.hallProductExhibit h3').allTextContents();if(!headings.includes('使用技術')||!headings.includes('画面と機能'))throw Error('product detail missing inside hall');
    await p.locator('.hallGalleryMain').click();await p.locator('.hallImageViewer').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.locator('.hallImageViewer').waitFor({state:'detached'});
    if(!await p.locator('.tourFooter').isVisible()||!await p.locator('.hallGalleryMain').evaluate(e=>e===document.activeElement))throw Error('viewer interrupted tour or lost focus');
    await p.locator('.hallDialogBody').evaluate(d=>d.scrollTop=0);
   }
   await p.screenshot({path:`output/playwright/hall-${id}-desktop.png`});
   if(i===0){await p.getByRole('button',{name:`次：${stops[1][1]} →`,exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});await p.getByRole('button',{name:'← 前へ',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});}
   if(i<stops.length-1)await p.getByRole('button',{name:`次：${stops[i+1][1]} →`,exact:true}).click();
  }
  await p.getByRole('button',{name:'案内のまとめへ →',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.worldPage').dataset.tourPhase==='complete');
  if(await p.locator('#detail-title').innerText()!=='採用向けの案内はここまで'||new URL(p.url()).searchParams.has('detail'))throw Error('completion missing or has private URL');
  const finish=await position(p);if(Math.hypot(finish[0],finish[2])>.01)throw Error('not at central plaza '+finish);
  await p.keyboard.down('w');await p.waitForTimeout(120);await p.keyboard.up('w');if(JSON.stringify(finish)!==JSON.stringify(await position(p)))throw Error('completion did not pause actor');
  for(const id of ['github','zenn']){
   const a=p.locator('.tourCompleteLinks a').filter({hasText:id==='github'?'GitHubへ':'Zennへ'});if(await a.getAttribute('target')!=='_blank')throw Error('completion link not blank');
   const popupPromise=p.waitForEvent('popup');await a.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');if(popup.url().replace(/\/$/,'')!==destinations[id])throw Error('completion destination');await popup.close();
   if(!await p.getByRole('dialog').isVisible()||await p.evaluate(()=>history.length)!==h+1)throw Error('completion link lost state');
  }
  await p.screenshot({path:'output/playwright/tour-complete-desktop.png'});
  await p.goBack();await p.waitForFunction(()=>!document.querySelector('dialog').open);if(new URL(p.url()).searchParams.has('detail'))throw Error('back did not return before tour');
  await p.goForward();await p.waitForFunction(()=>document.querySelector('.worldPage').dataset.tourPhase==='exploring');
  await p.reload();await ready(p);if(await p.getByRole('dialog').isVisible()||Math.hypot(...(await position(p)).filter((_,i)=>i!==1))>.01)throw Error('reload did not resume plaza exploration');
  await p.getByRole('button',{name:'街全体を見る',exact:true}).click();await p.screenshot({path:'output/playwright/halls-overview-desktop.png'});
  const models=await p.evaluate(()=>window.__hallQA.scene.children.filter(o=>o.name.startsWith('hall-')).map(o=>[o.name,o.userData.hallModel]));if(models.length!==6||new Set(models.map(m=>m[1])).size!==6)throw Error('missing distinctive models '+models);
  await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});
  await p.locator('.tourNext').click();await p.getByRole('region',{name:'展示へ移動中'}).getByRole('button',{name:'案内を離れて探索',exact:true}).click();await p.waitForTimeout(850);
  if(await p.getByRole('dialog').isVisible())throw Error('cancelled focus reopened tour');
  const camera=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v5')).view);if(camera.panned)throw Error('camera detached after exit');
  await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});await p.locator('.tourNext').click();await p.goBack();await p.waitForTimeout(800);
  if(await p.getByRole('dialog').isVisible())throw Error('back during focus failed');await p.goForward();await p.getByRole('dialog').waitFor({state:'visible'});if(await p.locator('.tourFooter').count())throw Error('forward retained stale tour');await p.keyboard.press('Escape');
  for(const id of ['about','career','social','tech',...stops.map(s=>s[0]),'github','zenn']){
   await p.goto(origin+'/?detail='+id);await p.getByRole('dialog').waitFor({state:'visible'});if(!await p.locator('#detail-title').innerText())throw Error('direct detail missing '+id);
  }
  for(const url of ['/about','/tech','/profile','/projects/yoin','/projects/pop-reminder','/career#experience','/career#history','/social#github','/social#zenn']){
   const response=await p.goto(origin+url);if(response&&response.status()!==200)throw Error('article unavailable '+url);if(url.includes('#')&&!await p.locator('#'+url.split('#')[1]).count())throw Error('missing article anchor '+url);
   if(url.includes('pop-reminder')&&(await p.locator('h1').innerText()!=='ふわっと。'||!await p.locator('title').innerText().then(t=>t.includes('ふわっと。'))))throw Error('old product name');
  }
  results.push({desktopTour:true,externalDoors:true,backForward:true,cancel:true,legacyUrls:true,resetOldSave:true,models});
 }finally{await c.close();}
 for(const [width,height] of [[390,844],[375,667],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:true,reducedMotion:'reduce'});try{
   await setup(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await ready(p);
   await p.screenshot({path:`output/playwright/halls-entry-${width}.png`});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('entry overflow');
   await p.getByRole('button',{name:'自由に探索する',exact:true}).click();
   const geometry=()=>p.evaluate(()=>{const ids=[];window.__hallQA.scene.children.filter(o=>o.name.startsWith('hall-')).forEach(o=>o.traverse(c=>{if(c.isMesh)ids.push(c.geometry.uuid)}));return ids;});
   const before=await geometry();await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
   if(JSON.stringify(before)!==JSON.stringify(await geometry()))throw Error('quality changes hall geometry');
   if(await p.evaluate(()=>window.__hallQA.renderer.shadowMap.enabled))throw Error('low shadows not disabled');
   await p.locator('.worldGuide > summary').click();const started=Date.now();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});if(Date.now()-started>650)throw Error('reduced motion animates');
   for(let i=0;i<stops.length;i++){
    await p.getByRole('dialog').waitFor({state:'visible'});if(await p.locator('#detail-title').innerText()!==stops[i][1])throw Error('mobile stop');
    const box=await p.locator('.tourFooter').boundingBox();if(box.x<0||box.x+box.width>width||box.y<0||box.y+box.height>height)throw Error('footer clipped '+JSON.stringify({width,height,box}));
    if(await p.getByRole('dialog').evaluate(d=>d.scrollWidth>d.clientWidth))throw Error('dialog overflows');
    await p.screenshot({path:`output/playwright/hall-${stops[i][0]}-${width}.png`});
    if(i<stops.length-1)await p.locator('.tourNext').click();
   }
   await p.getByRole('dialog').getByRole('link',{name:'通常表示で読む ↗',exact:true}).focus();await p.keyboard.press('Shift+Tab');if(!await p.locator('.tourNext').evaluate(e=>e===document.activeElement))throw Error('keyboard reverse tab escapes');await p.keyboard.press('Tab');
   if(!await p.getByRole('dialog').getByRole('link',{name:'通常表示で読む ↗',exact:true}).evaluate(e=>e===document.activeElement))throw Error('keyboard tab escapes');
   await p.locator('.tourNext').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('.worldPage').dataset.tourPhase==='complete');
   await p.screenshot({path:`output/playwright/tour-complete-${width}.png`});
   if(width===390){await p.reload();await ready(p);if(await p.getByRole('dialog').isVisible())throw Error('completion restored after reload');}
   else await p.locator('.tourCompleteFooter button').click();
   await p.waitForFunction(()=>document.querySelector('.worldPage').dataset.tourPhase==='exploring');
   const point=await position(p);if(Math.hypot(point[0],point[2])>.01)throw Error('low quality fork differs');
   if((await p.evaluate(()=>window.__violations)).length)throw Error('security policy violations');
   results.push({width,height,tour:true,reducedMotion:true,keyboard:true,sameGeometry:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
