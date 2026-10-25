async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const[id,name,x,z]of[['about','アトリエ',-7,13],['career','キャリアギャラリー',8,0],['yoin','Yoin',-8,-6],['pop-reminder','Pop Reminder',8,-9.5]]){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:id==='about'?'reduce':'no-preference'});
  try{
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T18:00:00+09:00'));
   await p.addInitScript(({x,z})=>{sessionStorage.setItem('portfolio-welcome-v2','seen');sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x,z}));},{x,z});
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.locator('.worldGuide > summary').tap();
   await p.getByRole('button',{name:`${name}へ歩く`,exact:true}).tap();await p.getByRole('dialog').waitFor({state:'visible',timeout:10000});
   if(!p.url().includes(`detail=${id}`))throw Error('wrong destination '+id);
   await p.getByRole('button',{name:'詳細を閉じる'}).tap();await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForTimeout(300);
   if(await p.getByRole('dialog').isVisible())throw Error('reopened '+id);results.push({id,walk:true,entry:true,closed:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:1440,height:900}});
 try{
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{sessionStorage.setItem('portfolio-welcome-v2','seen');sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:0,z:-28}));});
  await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.locator('.worldGuide > summary').click();await p.locator('.guideHarbor').click();
  await p.waitForTimeout(9500);await p.getByRole('region').focus();await p.keyboard.press('Escape');const harbor=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  if(Math.hypot(harbor.x,harbor.z+46)>.25)throw Error('harbor not reached '+JSON.stringify(harbor));
  results.push({id:'harbor',walk:true,position:harbor});
 }finally{await c.close();}
 for(const [w,h]of[[1920,1080],[390,844],[844,390]]){
  const c=await browser.newContext({viewport:{width:w,height:h},timezoneId:'Asia/Tokyo'});
  try{
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T18:00:00+09:00'));
   await p.goto('http://localhost:3001');await p.getByRole('button',{name:'自由に探索する',exact:true}).waitFor();await p.waitForTimeout(600);await p.screenshot({path:`output/playwright/polish-final-${w}x${h}.png`});
   if(await p.evaluate(()=>document.documentElement.scrollWidth)>w)throw Error('horizontal overflow '+w);
   const card=await p.locator('.worldWelcome').boundingBox();if(card.x<0||card.y<0||card.y+card.height>h)throw Error('welcome outside view '+w);
   await p.getByRole('button',{name:'自由に探索する'}).click();await p.locator('.worldGuide > summary').click();await p.screenshot({path:`output/playwright/polish-final-map-${w}x${h}.png`});
   results.push({width:w,height:h,overflow:false});
  }finally{await c.close();}
 }
 const direct=await browser.newContext({viewport:{width:390,height:844}});
 try{const p=await direct.newPage();await p.goto('http://localhost:3001/?detail=yoin');await p.getByRole('dialog').waitFor({state:'visible'});if(await p.locator('.worldWelcome').count())throw Error('welcome blocks direct detail');results.push({directDetail:true});}finally{await direct.close();}
 return {results,errors};
}
