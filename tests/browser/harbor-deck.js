async(page)=>{
 const results=[];
 for(const width of [1440,390]){
  const height=width===390?844:900;
  const c=await page.context().browser().newContext({viewport:{width,height},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
  await c.addInitScript(()=>sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:0,z:-39,view:{x:0,z:-43,overview:false,panned:true}})));
  try{
   const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('button',{name:'ダッシュ',exact:true}).click();
   const span=width===390?5.1:6.3,scale=height/(2*span),h=Math.hypot(12,20),d=Math.hypot(12,12.4,20),point={x:-1,y:.42,z:-46};
   const x=width/2+(point.x*20/h-(point.z+43)*12/h)*scale;
   const y=height/2-(-point.x*12/h*12.4/d+(point.y-.4)*h/d-(point.z+43)*20/h*12.4/d)*scale;
   await p.screenshot({path:`output/playwright/harbor-tap-before-${width}.png`});
   if(width===390)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);
   await p.waitForTimeout(2700);await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const pos=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
   if(Math.hypot(pos.x+1,pos.z+46)>.1)throw Error('deck tap missed raised surface '+JSON.stringify({width,x,y,pos}));
   // Keep a fixed view while comparing the jump and its landing on the raised deck.
   await p.addInitScript(()=>sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:0,z:-42.2,view:{x:1.14,z:-42,overview:false,panned:true}})));
   await p.reload();await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const clip=width===390?{x:65,y:170,width:115,height:320}:{x:580,y:170,width:180,height:320};const ground=await p.screenshot({clip});
   if(width===390)await p.getByRole('button',{name:'ジャンプ',exact:true}).tap();else await p.keyboard.press('Space');
   await p.waitForTimeout(220);const air=await p.screenshot({clip});await p.screenshot({path:`output/playwright/harbor-jump-${width}.png`});await p.waitForTimeout(900);const landed=await p.screenshot({clip});
   if(ground.equals(air)||!ground.equals(landed))throw Error('jump or deck landing failed '+width);
   results.push({width,deckTap:true,jump:true,landing:true});
  }finally{await c.close();}
 }
 return results;
}
