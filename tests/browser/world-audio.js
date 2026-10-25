async(page)=>{
 const results=[];
 for(const width of [1440,390]){
  const c=await page.context().browser().newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
  try{
   const p=await c.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/audio/'))requests.push(r.url())});
   await p.goto('http://localhost:3001');await p.locator('.worldLoading').waitFor({state:'hidden'});
   const toggle=p.getByRole('button',{name:'BGMを再生',exact:true}),audio=p.locator('audio');
   if(requests.length||await audio.getAttribute('src'))throw Error('audio downloaded before consent');
   await p.screenshot({path:`output/playwright/bgm-initial-${width}.png`});
   if(width===390)await toggle.tap();else await toggle.click();
   await p.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>.1;});
   await p.getByRole('button',{name:'BGMを停止',exact:true}).waitFor({state:'visible'});
   const playing=await audio.evaluate(a=>({paused:a.paused,volume:a.volume,loop:a.loop,duration:a.duration,time:a.currentTime}));
   if(!playing.loop||playing.volume!==.5)throw Error('bad audio defaults');
   await p.getByLabel('BGMの音量・曲情報').click();const slider=p.getByRole('slider',{name:'音量',exact:true});await slider.focus();await slider.press('Home');await slider.press('ArrowRight');
   if(Math.abs(await audio.evaluate(a=>a.volume)-.01)>.001)throw Error('volume did not update');
   const credit=p.locator('.bgmCredit');if(!await credit.getByRole('link',{name:'CC BY 4.0',exact:true}).isVisible())throw Error('missing license');
   const bounds=await p.locator('.bgmPanel').boundingBox();if(bounds.x<0||bounds.x+bounds.width>width)throw Error('audio settings overflow '+JSON.stringify(bounds));
   await p.screenshot({path:`output/playwright/bgm-settings-${width}.png`});
   await slider.press('Escape');if(await p.locator('.bgmSettings').getAttribute('open')!==null)throw Error('Escape did not close audio settings');
   await p.getByLabel('BGMの音量・曲情報').click();
   await p.locator('.worldGuide > summary').click();if(await p.locator('.bgmSettings').getAttribute('open')!==null)throw Error('settings should close when the guide opens');
   await p.locator('.worldGuide > summary').click();
   // Playwright keeps every page focused by default. Restore real focus/visibility for this check.
   const focusCdp=await c.newCDPSession(p);await focusCdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
   const other=await c.newPage();const otherCdp=await c.newCDPSession(other);await otherCdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});await other.goto('about:blank');await other.bringToFront();
   await p.waitForFunction(()=>!document.hasFocus()&&document.querySelector('audio').paused,null,{polling:100,timeout:5000}).catch(async()=>{throw Error('background pause '+JSON.stringify(await p.evaluate(()=>({focus:document.hasFocus(),hidden:document.hidden,paused:document.querySelector('audio').paused,status:document.querySelector('.bgmStatus').textContent}))));});
   await p.bringToFront();await p.waitForFunction(()=>document.hasFocus()&&!document.querySelector('audio').paused,null,{polling:100,timeout:5000});await other.close();
   await audio.evaluate(a=>{a.currentTime=a.duration-.15});await p.waitForTimeout(1000);
   const looped=await audio.evaluate(a=>!a.paused&&a.currentTime<2);if(!looped)throw Error('track did not loop');
   await p.getByRole('button',{name:'BGMを停止',exact:true}).click();if(!await audio.evaluate(a=>a.paused))throw Error('stop failed');
   await p.reload();await p.getByRole('button',{name:'BGMを再生',exact:true}).waitFor({state:'visible'});if(await audio.getAttribute('src')||!await audio.evaluate(a=>a.paused))throw Error('reloaded with audio');
   await p.getByRole('button',{name:'BGMを再生',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('audio').paused);
   await p.getByRole('link',{name:'通常表示',exact:true}).click();await p.waitForURL('**/profile');if(await p.locator('audio').count())throw Error('music remained in normal mode');
   if(errors.length)throw Error(errors.join('\n'));results.push({width,playing,lazyLoading:true,volume:true,credits:true,visibilityPauseResume:true,looped,offAfterReload:true,normalStops:true,errors});
  }finally{await c.close();}
 }
 return results;
}
