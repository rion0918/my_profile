async(page)=>{
 const results=[];
 for(const reducedMotion of ['no-preference','reduce']){
  const c=await page.context().browser().newContext({viewport:{width:1440,height:900},reducedMotion});
  await c.addInitScript(()=>sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:0,z:-44.8,view:{x:-3,z:-47,overview:false,panned:true}})));
  try{
   const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
   await p.mouse.move(720,650);await p.mouse.down();await p.mouse.move(780,610,{steps:10});await p.mouse.up();await p.waitForTimeout(300);
   const a=await p.locator('canvas').screenshot();await p.waitForTimeout(800);const b=await p.locator('canvas').screenshot();const changed=!a.equals(b);
   if(changed!==(reducedMotion==='no-preference'))throw Error('port animation did not resume after panning: '+reducedMotion);
   results.push({reducedMotion,afterPanAnimated:changed});
  }finally{await c.close();}
 }
 return results;
}
