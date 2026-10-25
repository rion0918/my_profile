async(page)=>{
 const results=[];
 for(const reducedMotion of ['no-preference','reduce']){
  const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion});
  try{
   const p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
   await p.addInitScript(()=>{sessionStorage.setItem('portfolio-welcome-v2','seen');sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:-4.6717,z:4.363}));});
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('button',{name:'猫をなでる',exact:true}).tap();
   await p.waitForFunction(()=>document.querySelector('.worldControls>p').textContent.includes('猫にごあいさつ'));
   await p.waitForTimeout(450);await p.screenshot({path:`output/playwright/polish-pet-mobile-${reducedMotion}.png`});
   await p.waitForTimeout(1800);await p.getByRole('region').focus();await p.keyboard.down('s');await p.waitForTimeout(350);await p.keyboard.up('s');
   if(await p.getByRole('dialog').isVisible())throw Error('pet opened a detail');results.push({reducedMotion,tap:true});
  }finally{await c.close();}
 }
 return results;
}
