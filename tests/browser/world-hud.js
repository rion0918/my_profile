async page=>{
 const results=[],errors=[],browser=page.context().browser();
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
  try{
   await c.addInitScript(()=>{
    sessionStorage.setItem('portfolio-welcome-v4','seen');window.__THREE_DEVTOOLS__=new EventTarget();window.__hud={};
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__hud.scene=e.detail;});
   });
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001');
   await p.locator('.worldLoading').waitFor({state:'hidden'});
   const sculptures=await p.evaluate(()=>window.__hud.scene.children.filter(o=>o.userData.detail==='tech'&&o.position.z===-20).length);
   if(sculptures)throw Error('onsen entrance still has '+sculptures+' sculptures');
   await p.locator('.worldSurface[aria-busy="false"]').waitFor();
   await p.locator('.worldToolbar .modeSwitch a').focus();await p.keyboard.press('Tab');
   if(!await p.locator('.bgmToggle').evaluate(el=>el===document.activeElement))throw Error('toolbar keyboard order skips BGM');
   await p.keyboard.press('Tab');if(!await p.locator('.bgmSettings>summary').evaluate(el=>el===document.activeElement))throw Error('toolbar keyboard order skips quality');
   await p.keyboard.press('Tab');if(!await p.locator('.worldGuide>summary').evaluate(el=>el===document.activeElement))throw Error('toolbar keyboard order skips guide');
   const buttons=p.locator('.worldToolbar button:visible, .worldToolbar summary:visible, .worldToolbar .modeSwitch a:visible, .worldControls button:visible');
   if(await buttons.count()!==8)throw Error('unexpected persistent HUD '+await buttons.allTextContents());
   if(await p.locator('.worldControlButtons button').allTextContents().then(t=>t.some(s=>/停止|ジャンプ|自転車|キーボード/.test(s))))throw Error('old control remains');
   const rects=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
   for(let i=0;i<rects.length;i++){
    const r=rects[i];if(r.x<0||r.y<0||r.right>width+.5||r.bottom>height+.5||r.width<44||r.height<44)throw Error('HUD target out of bounds '+JSON.stringify({width,r}));
    for(let j=0;j<i;j++){const b=rects[j];if(r.x<b.right&&r.right>b.x&&r.y<b.bottom&&r.bottom>b.y)throw Error('HUD overlaps '+JSON.stringify({width,r,b}));}
   }
   const bgm=p.locator('.bgmToggle');await bgm.click();if(await bgm.getAttribute('aria-pressed')!=='false')throw Error('BGM cannot switch off');await bgm.click();if(await bgm.getAttribute('aria-pressed')!=='true')throw Error('BGM cannot switch on');
   const dash=p.getByRole('button',{name:/^常ダッシュ (ON|OFF)$/});await dash.click();if(await dash.getAttribute('aria-pressed')!=='true')throw Error('dash did not latch');
   const position=()=>p.evaluate(()=>window.__hud.scene.children.find(o=>o.getObjectByName('Hips')).position.toArray());
   const before=await position();await p.keyboard.down('ArrowUp');await p.waitForTimeout(500);await p.keyboard.up('ArrowUp');
   const after=await position(),distance=Math.hypot(after[0]-before[0],after[2]-before[2]);if(distance<2.1||distance>3.2)throw Error('always sprint speed '+distance);
   await dash.click();if(await dash.getAttribute('aria-pressed')!=='false')throw Error('dash cannot switch off');
   await p.getByRole('button',{name:'街全体を見る',exact:true}).click();await p.getByRole('button',{name:'人物に戻る',exact:true}).click();
   await p.getByRole('button',{name:'景色を拡大',exact:true}).click();await p.getByRole('button',{name:'景色を縮小',exact:true}).click();
   await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');
   const panel=await p.locator('.bgmPanel').boundingBox();if(panel.x<0||panel.x+panel.width>width+.5||panel.y+panel.height>height)throw Error('quality panel clipped');
   await p.keyboard.press('Escape');await p.locator('.worldGuide>summary').click();
   const guide=await p.locator('.worldGuidePanel').boundingBox();if(guide.x<0||guide.x+guide.width>width+.5||guide.y+guide.height>height)throw Error('guide clipped');
   await p.keyboard.press('Escape');
   await p.screenshot({path:`output/playwright/hud-after-${width}.png`});
   if(await p.locator('.worldToolbar .modeSwitch a').getAttribute('href')!=='/profile')throw Error('normal view link lost');
   results.push({width,height,controls:rects.length,onsenClear:true,dashDistance:distance,panels:true});
  }finally{await c.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
