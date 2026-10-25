async(page)=>{
 const browser=page.context().browser(), results=[];
 const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await c.addInitScript(()=>{
  const scene=new URLSearchParams(location.search).get('check');
  const pos=scene==='wall'?{x:-8.8,z:.795}:scene==='coast'?{x:44.6,z:0}:scene==='entry'?{x:-7,z:-.3}:null;
  if(pos)sessionStorage.setItem('portfolio-position-v3',JSON.stringify({version:3,...pos}));
 });
 const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.waitForTimeout(300);await p.getByRole('region',{name:/^街を探索/}).focus();};
 const save=async()=>{await p.keyboard.press('Escape');return p.evaluate(()=>JSON.parse(sessionStorage.getItem('portfolio-position-v3')));};
 try{
  await ready();await save();const clip={x:580,y:190,width:180,height:310};const baseline=await p.screenshot({clip});
  await p.keyboard.down('Space');for(let i=0;i<12;i++){await p.getByRole('region',{name:/^街を探索/}).dispatchEvent('keydown',{key:' ',code:'Space',repeat:true});await p.waitForTimeout(70);}await p.keyboard.up('Space');await p.waitForTimeout(300);
  if(!baseline.equals(await p.screenshot({clip})))throw Error('held Space triggered another jump');results.push('held Space does not auto-jump');
  await p.keyboard.press('Space');await p.waitForTimeout(120);await p.keyboard.press('Escape');await p.waitForTimeout(900);
  if(!baseline.equals(await p.screenshot({clip})))throw Error('Escape froze the character in the air');results.push('Escape stops movement and completes landing');
  await p.keyboard.press('Space');await p.waitForTimeout(130);await p.getByRole('region',{name:/^街を探索/}).evaluate(e=>e.blur());await p.waitForTimeout(800);await p.getByRole('region',{name:/^街を探索/}).focus();await p.waitForTimeout(950);
  if(!baseline.equals(await p.screenshot({clip})))throw Error('focus did not resume landing');results.push('blur freezes and focus resumes jump');
  await p.keyboard.down('s');await p.keyboard.press('Space');await p.waitForTimeout(850);await p.keyboard.up('s');const moved=await save();if(Math.hypot(moved.x,moved.z-6)<1.8)throw Error('jump stopped horizontal movement');results.push('walking continues while jumping');
  await p.goto('http://localhost:3001/?check=wall');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('region',{name:/^街を探索/}).focus();
  await p.keyboard.down('w');await p.keyboard.down('d');await p.keyboard.down('Shift');await p.keyboard.press('Space');await p.waitForTimeout(1000);await p.keyboard.up('w');await p.keyboard.up('d');await p.keyboard.up('Shift');const wall=await save();if(wall.z < -.27)throw Error('jump passed through front wall');if(await p.getByRole('dialog').isVisible())throw Error('wall jump entered building');results.push('jump cannot pass through walls');
  await p.goto('http://localhost:3001/?check=coast');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('region',{name:/^街を探索/}).focus();
  await p.keyboard.down('d');await p.keyboard.down('s');await p.keyboard.press('Space');await p.waitForTimeout(1700);await p.keyboard.up('d');await p.keyboard.up('s');const coast=await save();if(coast.x>45.75)throw Error('jump passed sea boundary');results.push('jump respects deep-water boundary');
  await p.goto('http://localhost:3001/?check=entry');await p.locator('.worldLoading').waitFor({state:'hidden'});await p.getByRole('region',{name:/^街を探索/}).focus();
  await p.keyboard.down('w');await p.keyboard.down('d');await p.keyboard.press('Space');await p.waitForTimeout(330);await p.keyboard.up('w');await p.keyboard.up('d');if(await p.getByRole('dialog').isVisible())throw Error('entry opened while airborne');await p.getByRole('dialog').waitFor({state:'visible',timeout:2500});if(!p.url().endsWith('detail=about'))throw Error('wrong jump entry');await p.getByRole('button',{name:'詳細を閉じる'}).click();await p.waitForTimeout(500);if(await p.getByRole('dialog').isVisible())throw Error('jump entry reopened');results.push('airborne doorway crossing waits for landing and opens once');
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await c.close();}
}
