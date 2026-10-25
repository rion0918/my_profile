async(page)=>{
 const results=[];
 for(const [id,name,x,z] of [['about','アトリエ',-7,10.295],['career','キャリアギャラリー',8,-3.11],['yoin','Yoin',-8,-8.875],['pop-reminder','Pop Reminder',8,-10.79]]){
  const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('button',{name:'自由に探索する',exact:true}).tap();
   await p.screenshot({path:`output/playwright/bike-entry-${id}-ready.png`});
   await p.getByRole('button',{name:'自転車に乗る',exact:true}).tap();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:10000});
   await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const view=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')).view);
   const h=Math.hypot(12,20),vertical=12.4/Math.hypot(h,12.4),scale=10.2/844;
   const vx=x+1-view.x,vz=z+2-view.z;
   const dx=-(vx*20/h-vz*12/h)/scale,dy=(vx*12/h+vz*20/h)*vertical/scale,n=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/150);
   for(let i=0;i<n;i++){await p.mouse.move(195,420);await p.mouse.down();await p.mouse.move(195+dx/n,420+dy/n,{steps:3});await p.mouse.up();}
   const entry=p.getByRole('button',{name:`${name}に入る（入口へ歩く）`,exact:true});
   await p.screenshot({path:`output/playwright/bike-entry-${id}-pan.png`});
   await entry.tap();
   await p.getByRole('dialog').waitFor({state:'visible',timeout:18000});
   await p.screenshot({path:`output/playwright/bike-entry-${id}-dialog.png`});
   if(!p.url().endsWith(`detail=${id}`))throw Error('wrong detail '+id);
   if(await p.getByRole('button',{name:'自転車を降りる',exact:true}).count())throw Error('still riding indoors');
   await p.getByRole('button',{name:'詳細を閉じる'}).tap();await p.waitForTimeout(400);
   const outside=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
   if(await p.getByRole('dialog').isVisible())throw Error('entry reopened');
   if(!Number.isFinite(outside.x)||!Number.isFinite(outside.z))throw Error('invalid return position '+id);
   results.push({id,automaticDismount:true,outside});
  }finally{await c.close();}
 }
 return results;
}
