async(page)=>{
 const results=[];
 for(const width of [1440,390]){
  const c=await page.context().browser().newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
  try{
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
   await p.getByRole('button',{name:'ダッシュ',exact:true}).click();await p.getByRole('button',{name:'街全体を見る',exact:true}).click();
   const port=p.getByRole('button',{name:'港の桟橋へ歩く',exact:true});await port.waitFor({state:'visible'});
   if(width===390)await port.tap();else await port.click();
   await p.waitForTimeout(14500);await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const arrived=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
   if(Math.hypot(arrived.x,arrived.z+46)>.12)throw Error('did not reach harbor '+JSON.stringify(arrived));
   if(await p.getByRole('dialog').isVisible())throw Error('harbor should not open a portfolio dialog');
   await p.screenshot({path:`output/playwright/harbor-arrival-${width}.png`});
   await p.keyboard.down('w');await p.keyboard.down('d');await p.waitForTimeout(1500);await p.keyboard.up('w');await p.keyboard.up('d');await p.keyboard.press('Escape');
   const edge=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));if(edge.z < -47.5)throw Error('walked through railing');
   await p.reload();await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');
   const restored=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));if(Math.hypot(restored.x-edge.x,restored.z-edge.z)>.001||Math.abs(restored.view.z-edge.view.z)>.01)throw Error('harbor restore mismatch');
   results.push({width,arrived,edge,restore:true,errors});
  }finally{await c.close();}
 }
 return results;
}
