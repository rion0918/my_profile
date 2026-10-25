async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 const halls=[['experience','経験館',8,25.55],['yoin','Yoin館',-8,8.125],['pop-reminder','ふわっと。館',8,8.21],['history','Background',-8,25.89],['github','GitHub館',-22,16.295],['zenn','Zenn館',22,16.295],['x','X館',-32,9.295]];
 for(const [id,name,x,z] of halls){
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});try{
   await c.addInitScript(({x,z})=>{sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x,z:z+3}));},{x,z});
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
   if(await p.locator('.entryLabel').count()||await p.getByRole('button',{name:/に入る（入口へ歩く）/}).count())throw Error('entry prompt remains near '+id);
   const sign=p.locator('.buildingLabel').filter({hasText:name});await sign.click();await p.getByRole('dialog').waitFor({state:'visible'});
   if(await p.locator('#detail-title').innerText()!==name)throw Error('hall sign opens the wrong exhibit '+id);
   await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
   await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:`${name}へ歩く`,exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible',timeout:15000});
   if(!p.url().includes('detail='+id)||await p.locator('#detail-title').innerText()!==name)throw Error('wrong entry '+id);
   await p.getByRole('button',{name:'詳細を閉じる',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForTimeout(250);
   if(await p.getByRole('dialog').isVisible())throw Error('reopens after leaving '+id);
   await p.screenshot({path:`output/playwright/hall-${id}-exterior-mobile.png`});results.push({id,walk:true,entry:true,exit:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});try{
  await c.addInitScript(()=>{sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:16.15,z:25}));});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
  await p.getByRole('button',{name:'自転車に乗る',exact:true}).click();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:15000});
  await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:'Zenn館へ歩く',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible',timeout:45000});
  if(await p.locator('#detail-title').innerText()!=='Zenn館')throw Error('cycling entry failed');
  await p.getByRole('button',{name:'詳細を閉じる',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.locator('.worldSurface').focus();await p.keyboard.down('w');await p.waitForTimeout(300);await p.keyboard.up('w');await p.keyboard.press('Escape');
  await p.screenshot({path:'output/playwright/hall-zenn-exterior-desktop.png'});results.push({cyclingToOptionalHall:true,automaticDismount:true});
 }finally{await c.close();}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
