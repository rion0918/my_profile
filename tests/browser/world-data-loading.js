async page => {
 const results=[];
 for(const fail of [false,true]){
  const c=await page.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let release;const gate=new Promise(resolve=>{release=resolve;});const errors=[];
  try{
   await c.addInitScript(()=>{sessionStorage.setItem('portfolio-welcome-v4','seen');window.__glStarts=0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))window.__glStarts++;return get.call(this,type,...args);};});
   await c.route('**/world-map.json',async route=>{if(fail)await route.fulfill({status:503,body:'Unavailable'});else{await gate;await route.continue();}});
   const p=await c.newPage();await p.bringToFront();p.on('pageerror',e=>errors.push(e.message));
   await p.goto('http://localhost:3001/?detail=yoin');
   await p.getByRole('dialog',{name:'Yoin館',exact:true}).waitFor({timeout:2500});
   if(await p.evaluate(()=>window.__glStarts)!==0)throw Error('Canvas started before the map was ready');
   if(!await p.getByRole('heading',{name:'使用技術',exact:true}).count())throw Error('Product detail depends on the map request');
   await p.getByRole('button',{name:'詳細を閉じる',exact:true}).click();
   await p.locator('.worldGuide > summary').click();
   if(fail)await p.locator('.guideTour').click();
   else await p.locator('.worldDirectory a').filter({hasText:'Background'}).click();
   await p.getByRole('dialog',{name:'Background',exact:true}).waitFor();
   if(fail){
    await p.getByRole('button',{name:'案内を離れて探索',exact:true}).click();
    await p.getByRole('alert').filter({hasText:'地図を読み込めませんでした'}).waitFor();
    await p.getByRole('link',{name:'通常表示',exact:true}).click();await p.locator('#career').waitFor();
   }else{
    release();await p.locator('.worldSurface[aria-busy="false"]').waitFor();
    if(!await p.getByRole('dialog',{name:'Background',exact:true}).isVisible())throw Error('Map arrival reset the open exhibit');
   }
   if(errors.length)throw Error(errors.join('\n'));
   results.push({failedRequest:fail,detailWithoutMap:true,tourOnMapFailure:fail,canvasDeferred:true,errors});
  }finally{release();await c.close();}
 }
 return results;
}
