async(page)=>{
 const results=[];
 for(const width of [1440,390]){
  const c=await page.context().browser().newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
  try{
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
   await p.screenshot({path:`output/playwright/bike-initial-${width}.png`});
   const borrow=p.getByRole('button',{name:'自転車に乗る',exact:true});if(width===390)await borrow.tap();else await borrow.click();
   const off=p.getByRole('button',{name:'自転車を降りる',exact:true});await off.waitFor({state:'visible',timeout:10000});
   await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const start=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
   await p.keyboard.down('w');await p.waitForTimeout(800);await p.keyboard.up('w');
   const released=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));await p.waitForTimeout(300);await p.keyboard.press('Escape');
   const moved=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3'))), distance=Math.hypot(moved.x-start.x,moved.z-start.z);
   if(distance<1.2||distance>4.5)throw Error('cycling acceleration incorrect: '+distance);
   if(Math.hypot(moved.x-released.x,moved.z-released.z)<.2)throw Error('no momentum after releasing W');
   await p.screenshot({path:`output/playwright/bike-riding-${width}.png`});
   await p.keyboard.press('Space');await p.waitForTimeout(150);await off.waitFor({state:'visible'});
   if(width===390)await off.tap();else await p.keyboard.press('e');
   await p.getByRole('button',{name:'ジャンプ',exact:true}).waitFor({state:'visible'});
   await p.getByRole('button',{name:'自転車に乗る',exact:true}).click();await off.waitFor({state:'visible'});
   await p.getByRole('button',{name:'街全体を見る',exact:true}).click();await p.getByRole('button',{name:'港の桟橋へ歩く',exact:true}).click();
   await p.waitForTimeout(25000);await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const harbor=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
   if(Math.hypot(harbor.x,harbor.z+46)>.25)throw Error('bike did not reach harbor '+JSON.stringify(harbor));
   await p.keyboard.down('w');await p.waitForTimeout(1000);await p.keyboard.up('w');await p.keyboard.press('Escape');
   const edge=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));if(edge.z < -47.1)throw Error('bike clipped railing');
   await p.screenshot({path:`output/playwright/bike-harbor-${width}.png`});
   if(width===390)await off.tap();else await p.keyboard.press('e');
   await p.getByRole('button',{name:'ジャンプ',exact:true}).waitFor({state:'visible'});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow');
   if(errors.length)throw Error(errors.join('\n'));
   results.push({width,distance,harbor,edge,remount:true,errors});
  }finally{await c.close();}
 }
 return results;
}
