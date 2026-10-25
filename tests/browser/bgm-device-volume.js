async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{
  await c.addInitScript(()=>Object.defineProperty(HTMLMediaElement.prototype,'volume',{configurable:true,get(){return 1;},set(){}}));
  const p=await c.newPage();await p.goto('http://localhost:3001');await p.getByRole('button',{name:'BGMを再生',exact:true}).waitFor({state:'visible'});
  await p.getByLabel('BGMの音量・曲情報').click();
  if(await p.getByRole('slider').count())throw Error('inoperative volume slider remains visible');
  await p.getByText('音量は端末の音量ボタンで調整できます。',{exact:true}).waitFor({state:'visible'});
  await p.getByRole('button',{name:'BGMを再生',exact:true}).tap();await p.waitForFunction(()=>!document.querySelector('audio').paused);
  await p.getByRole('button',{name:'BGMを停止',exact:true}).tap();
  await p.screenshot({path:'output/playwright/bgm-device-volume.png'});
  return {deviceVolumeHint:true,playStop:true};
 }finally{await c.close();}
}
