async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:1440,height:900}});try{
  const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
  await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.down('w');await p.keyboard.down('d');await p.waitForTimeout(200);
  await p.getByRole('button',{name:'BGMを再生',exact:true}).click();await p.waitForTimeout(800);
  await p.keyboard.up('w');await p.keyboard.up('d');
  const pos=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3'))),distance=Math.hypot(pos.x,pos.z-18);
  if(distance<2)throw Error('BGM toggle interrupted movement '+distance);
  await p.getByRole('button',{name:'BGMを停止',exact:true}).click();
  return {movementContinues:true,distance};
 }finally{await c.close();}
}
