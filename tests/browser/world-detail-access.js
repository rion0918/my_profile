async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const p=await c.newPage();await p.goto('http://localhost:3001');await p.locator('.worldGuide > summary').tap();await p.getByRole('navigation',{name:'探索せずに情報を読む'}).getByRole('link',{name:/Yoin/}).tap();await p.getByRole('dialog').waitFor({state:'visible'});
  await p.getByRole('dialog').evaluate(d=>d.scrollTop=d.scrollHeight);await p.waitForTimeout(100);
  const box=await p.getByRole('dialog').boundingBox(),close=await p.getByRole('button',{name:'詳細を閉じる'}).boundingBox();
  if(close.y<box.y)throw Error('close control disappears when reading a long project');
  await p.getByRole('button',{name:'詳細を閉じる'}).tap();await p.getByRole('dialog').waitFor({state:'hidden'});
  if(!await p.getByRole('navigation',{name:'探索せずに情報を読む'}).getByRole('link',{name:/Yoin/}).evaluate(e=>e===document.activeElement))throw Error('focus did not return to the directory link');
  return {stickyClose:true,focusRestored:true};
 }finally{await c.close();}
}
