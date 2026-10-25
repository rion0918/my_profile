async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Tokyo'}),errors=[];
 try{
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
  await p.goto('http://localhost:3001');await p.getByRole('button',{name:'自由に探索する',exact:true}).waitFor();await p.screenshot({path:'output/playwright/polish-welcome-1440.png'});
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:'output/playwright/polish-welcome-390.png'});
  await p.getByRole('button',{name:'自由に探索する',exact:true}).click();
  if(await p.locator('.worldWelcome').count())throw Error('welcome not dismissed');
  await p.locator('.worldGuide > summary').click();await p.screenshot({path:'output/playwright/polish-map-390.png'});
  const from=await p.locator('.guideCurrentPosition').getAttribute('cy');
  await p.getByRole('button',{name:'アトリエへ歩く',exact:true}).click();await p.waitForTimeout(6500);await p.getByRole('dialog').waitFor({state:'visible'});
  if(!p.url().includes('detail=about'))throw Error('incorrect entry');await p.getByRole('button',{name:'詳細を閉じる'}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.locator('.worldGuide > summary').click();const to=await p.locator('.guideCurrentPosition').getAttribute('cy');if(from===to)throw Error('map did not track player');
  await p.getByRole('navigation',{name:'探索せずに情報を読む'}).getByRole('link',{name:'Yoin',exact:false}).click();await p.getByRole('dialog').waitFor({state:'visible'});
  await p.screenshot({path:'output/playwright/polish-product-yoin-390.png'});await p.setViewportSize({width:1440,height:900});await p.screenshot({path:'output/playwright/polish-product-yoin-1440.png'});
  const media=await p.locator('.productScreen img').evaluateAll(images=>images.map(img=>({width:img.naturalWidth,height:img.naturalHeight})));if(media.some(m=>m.width<320||m.height<640))throw Error('screen images missing');
  await p.getByRole('button',{name:'詳細を閉じる'}).click();await p.getByRole('dialog').waitFor({state:'hidden'});await p.getByRole('navigation',{name:'探索せずに情報を読む'}).getByRole('link',{name:'Pop Reminder',exact:false}).click();await p.getByRole('dialog').waitFor({state:'visible'});await p.screenshot({path:'output/playwright/polish-product-pop-1440.png'});
  await p.getByRole('button',{name:'詳細を閉じる'}).click();await p.getByRole('dialog').waitFor({state:'hidden'});await p.reload();await p.locator('.worldLoading').waitFor({state:'hidden'});if(await p.locator('.worldWelcome').count())throw Error('welcome returns on reload');
  return {welcome:true,mapWalk:true,currentPosition:true,media,errors};
 }finally{await c.close();}
}
