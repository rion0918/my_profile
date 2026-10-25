async(page)=>{
 const results=[];
 for(const reducedMotion of ['no-preference','reduce']){
  const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion});
  try{
   await c.addInitScript(()=>sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,x:34,z:-7,view:{x:28,z:-7,overview:false,panned:true}})));
   const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.waitForTimeout(500);
   const a=await p.screenshot({clip:{x:175,y:402,width:40,height:40}});await p.waitForTimeout(800);
   const b=await p.screenshot({clip:{x:175,y:402,width:40,height:40}});const changed=!a.equals(b);
   await p.screenshot({path:`output/playwright/water-pond-${reducedMotion}.png`});
   if(changed!==(reducedMotion==='no-preference'))throw Error(`pond motion is ${changed} with ${reducedMotion}`);
   results.push({reducedMotion,changed});
  }finally{await c.close();}
 }
 return results;
}
