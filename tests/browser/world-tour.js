async(page)=>{
 const origin='http://localhost:3001',results=[],errors=[];
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Tokyo'});
 try {
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
  // No script execution: the entrance, identity and normal view must already exist in HTML.
  const raw=await(await p.request.get(origin)).text();
  if(!raw.includes('街の入口')||!raw.includes('神戸電子専門学校')||!raw.includes('通常表示で読む'))throw Error('missing pre-3D entry');
  await p.goto(origin);await p.waitForFunction(()=>document.querySelector('.welcomeActions button')?.disabled===false);
  await p.screenshot({path:'output/playwright/tour-entry-desktop.png'});
  const initialHistory=await p.evaluate(()=>history.length);
  await p.getByRole('region',{name:'街の入口',exact:true}).getByRole('button',{name:'案内に沿って見る',exact:false}).click();
  await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('#detail-title').innerText()!=='自己紹介')throw Error('first stop');
  if(await p.getByRole('dialog').locator('.techGrid,.socialList').count())throw Error('profile still overwhelms reader');
  if(!await p.getByRole('button',{name:'← 前へ',exact:true}).isDisabled())throw Error('first previous enabled');
  await p.screenshot({path:'output/playwright/tour-profile-desktop.png'});
  const position=()=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  const before=await position();await p.keyboard.down('w');await p.waitForTimeout(120);await p.keyboard.up('w');
  const after=await position();if(before.x!==after.x||before.z!==after.z)throw Error('movement during reading');
  await p.getByRole('button',{name:'次：実務経験・活動 →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  const titles=await p.getByRole('dialog').locator('.careerItem h3').allTextContents();
  if(!titles[0].includes('Sky')||!titles[1].includes('We部'))throw Error('experience order '+titles);
  await p.screenshot({path:'output/playwright/tour-career-desktop.png'});
  await p.getByRole('button',{name:'← 前へ',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('#detail-title').innerText()!=='自己紹介')throw Error('previous failed');
  for(const title of ['実務経験・活動','Yoin','Pop Reminder','開発記録と、街のつづき']) {
   await p.getByRole('button',{name:`次：${title} →`,exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
   if(await p.locator('#detail-title').innerText()!==title)throw Error('next failed '+title);
   if(['Yoin','Pop Reminder'].includes(title)) {
    await p.getByRole('dialog').locator('.productScreen img').first().waitFor();
    await p.screenshot({path:`output/playwright/tour-${title==='Yoin'?'yoin':'pop'}-desktop.png`});
   }
  }
  if(await p.evaluate(()=>history.length)!==initialHistory+1)throw Error('tour floods history');
  const finish=await position();if(Math.hypot(finish.x,finish.z+22)>.01)throw Error('finish is not at fork '+JSON.stringify(finish));
  await p.getByRole('button',{name:'趣味の街を歩く →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.waitForFunction(()=>!location.search.includes('detail='));
  if(await p.locator('.worldPage').getAttribute('data-tour-phase')!=='exploring')throw Error('cannot explore');
  await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();
  await p.getByRole('dialog').waitFor({state:'visible'});
  await p.getByRole('button',{name:'次：実務経験・活動 →',exact:true}).click();
  await p.getByRole('region',{name:'展示へ移動中'}).getByRole('button',{name:'案内を離れて探索',exact:true}).click();
  await p.waitForTimeout(850);
  if(await p.getByRole('dialog').isVisible()||await p.locator('.worldPage').getAttribute('data-tour-phase')!=='exploring')throw Error('late focus reopened tour');
  if((await position()).view.panned)throw Error('cancel leaves the camera detached from the character');
  await p.locator('.worldGuide > summary').click();await p.locator('.guideTour').click();await p.getByRole('dialog').waitFor({state:'visible'});
  await p.goBack();await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.waitForTimeout(800);if(await p.locator('.worldPage').getAttribute('data-tour-phase')!=='exploring')throw Error('back did not exit tour');
  await p.goForward();await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('.tourFooter').count())throw Error('forward restored stale tour state');
  await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.goto(origin+'/?detail=yoin');await p.getByRole('dialog').waitFor({state:'visible'});
  if(await p.locator('#detail-title').innerText()!=='Yoin'||await p.locator('.tourFooter').count())throw Error('direct URL broken');
  for(const url of ['/profile','/about','/career','/projects/yoin','/projects/pop-reminder','/tech','/social']) {
   const response=await p.goto(origin+url);if(response.status()!==200||await p.locator('h1').count()===0)throw Error('article unavailable '+url);
  }
  results.push({desktopTour:true,experienceOrder:titles,history:true,cancel:true,backForward:true,directUrls:true,pre3D:true});
 } finally {await context.close();}
 const mobile=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try {
  const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
  await p.goto(origin);await p.waitForFunction(()=>document.querySelector('.welcomeActions button')?.disabled===false);
  await p.screenshot({path:'output/playwright/tour-entry-mobile.png'});
  await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
  const start=Date.now();await p.locator('.welcomeActions button').first().click();await p.getByRole('dialog').waitFor({state:'visible'});
  if(Date.now()-start>650)throw Error('reduced motion waited for animation');
  const visible=async()=>{const d=await p.locator('.tourFooter').boundingBox();if(d.x<0||d.x+d.width>390||d.y+d.height>844)throw Error('mobile footer clipped '+JSON.stringify(d));};
  await visible();await p.screenshot({path:'output/playwright/tour-profile-mobile.png'});
  await p.getByRole('button',{name:'次：実務経験・活動 →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  await visible();await p.screenshot({path:'output/playwright/tour-career-mobile.png'});
  await p.getByRole('button',{name:'次：Yoin →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  await visible();await p.screenshot({path:'output/playwright/tour-yoin-mobile.png'});
  await p.getByRole('button',{name:'次：Pop Reminder →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  await visible();await p.screenshot({path:'output/playwright/tour-pop-mobile.png'});
  await p.getByRole('button',{name:'次：開発記録と、街のつづき →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  await visible();await p.getByRole('button',{name:'趣味の街を歩く →',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
  const point=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  if(Math.hypot(point.x,point.z+22)>.01)throw Error('low mode changes destination');
  results.push({mobileTour:true,lowQuality:true,reducedMotionInstant:true,footerVisible:true});
 } finally {await mobile.close();}
 if(errors.length)throw Error(errors.join('\n'));
 return {results,errors};
}
