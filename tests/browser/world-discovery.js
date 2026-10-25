async(page)=>{
 const browser=page.context().browser(),c=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Tokyo'}),errors=[];
 try{
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.clock.install({time:new Date('2026-10-24T12:00:00+09:00')});
  await p.goto('http://localhost:3001');await p.getByRole('button',{name:'自由に探索する',exact:true}).waitFor();await p.waitForTimeout(650);
  await p.screenshot({path:'output/playwright/polish-final-welcome-1440.png'});await p.getByRole('button',{name:'自由に探索する',exact:true}).click();
  await p.mouse.click(497,302);await p.waitForFunction(()=>document.querySelector('.worldControls > p').textContent.includes('猫にごあいさつ'),null,{timeout:12000});
  await p.waitForTimeout(600);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+20));await p.screenshot({path:'output/playwright/polish-pet-1440.png'});
  await p.clock.resume();await p.waitForTimeout(1500);await p.getByRole('region').focus();await p.keyboard.press('f');await p.waitForTimeout(500);await p.screenshot({path:'output/playwright/polish-pet-keyboard-1440.png'});
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:'output/playwright/polish-pet-390.png'});
  const width=await p.evaluate(()=>document.documentElement.scrollWidth);if(width>390)throw Error('mobile overflow');
  await p.clock.resume();await p.close();
 }finally{await c.close();}
 for(const[id,x,z]of[['yoin',-12.85,-7.5],['pop-reminder',13,-16]]){
  const context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Tokyo'});
  try{
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   const responses=[];p.on('response',r=>{if(r.url().includes('/images/projects/'))responses.push({url:r.url(),status:r.status()});});
   await p.clock.setFixedTime(new Date('2026-10-24T16:00:00+09:00'));
   await p.addInitScript(({x,z})=>{sessionStorage.setItem('portfolio-welcome-v2','seen');sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x,z}));},{x,z});
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.waitForTimeout(1300);
   await p.screenshot({path:`output/playwright/polish-exhibit-${id}-1440.png`});if(!responses.some(r=>r.status===200))throw Error('display did not request screen '+id);
   await p.setViewportSize({width:390,height:844});await p.screenshot({path:`output/playwright/polish-exhibit-${id}-390.png`});
  }finally{await context.close();}
 }
 return {catClick:true,catKeyboard:true,exhibitions:2,mobile:true,errors};
}
