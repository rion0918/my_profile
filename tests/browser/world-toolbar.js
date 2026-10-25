async(page)=>{
 const results=[];
 for(const width of [1440,390]){
  const c=await page.context().browser().newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:true});
  try{
   const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
   await p.getByRole('button',{name:'BGMを再生',exact:true}).tap();await p.getByRole('button',{name:'BGMを停止',exact:true}).waitFor();
   await p.locator('.worldGuide>summary').tap();await p.getByRole('button',{name:'BGMを停止',exact:true}).tap();
   await p.getByRole('button',{name:'BGMを再生',exact:true}).waitFor();await p.locator('.worldGuide>summary').tap();
   results.push({width,bgmTap:true,guideTap:true});
  }finally{await c.close();}
 }
 return results;
}
