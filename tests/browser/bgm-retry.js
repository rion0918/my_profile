async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const p=await c.newPage();let failed=true;
  await p.route('**/audio/bossa-antigua.mp3',r=>failed?r.fulfill({status:404,body:'not found'}):r.continue());
  await p.goto('http://localhost:3001');await p.getByRole('button',{name:'BGMを再生',exact:true}).tap();
  await p.getByRole('button',{name:'BGMの再生を再試行',exact:true}).waitFor({state:'visible'});
  if(!await p.locator('audio').evaluate(a=>a.paused))throw Error('failed audio not paused');
  failed=false;await p.getByRole('button',{name:'BGMの再生を再試行',exact:true}).tap();
  await p.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>.1);
  await p.getByRole('button',{name:'BGMを停止',exact:true}).tap();
  return {failureShown:true,retryPlayed:true,stopped:await p.locator('audio').evaluate(a=>a.paused)};
 }finally{await c.close();}
}
