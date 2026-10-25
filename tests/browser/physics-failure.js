async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{
  const p=await c.newPage();let requests=0,blocked=true;
  await p.route('**/_next/static/chunks/*.js',async r=>{const response=await r.fetch(),data=await response.body();if(data.length>3000000&&data.toString().includes('createVehicleController')){requests++;if(blocked)return r.abort();}return r.fulfill({response});});await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
  if(requests)throw Error('physics should load only when borrowing');
  await p.getByRole('button',{name:'自転車に乗る',exact:true}).tap();await p.getByRole('button',{name:'自転車を再読み込み',exact:true}).waitFor({state:'visible',timeout:2500});
  await p.getByRole('region',{name:/^街を探索/}).focus();await p.keyboard.press('Escape');const before=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));await p.keyboard.down('w');await p.waitForTimeout(400);await p.keyboard.up('w');const pos=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));
  if(Math.hypot(pos.x-before.x,pos.z-before.z)<.4)throw Error('walking broke after failed physics');
  blocked=false;await p.getByRole('button',{name:'自転車を再読み込み',exact:true}).tap();await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('button',{name:'自転車に乗る',exact:true}).tap();await p.getByRole('button',{name:'自転車を降りる',exact:true}).waitFor({state:'visible',timeout:15000});
  return{lazy:true,failureNotice:true,walkingWorks:true,reloadRecovers:true};
 }finally{await c.close();}
}
