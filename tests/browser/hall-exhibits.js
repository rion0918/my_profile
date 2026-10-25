async page=>{
 const results=[],errors=[],origin='http://localhost:3001',browser=page.context().browser();
 for(const [width,height] of [[1440,900],[390,844],[375,667],[844,390]]){
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  try{
   await c.addInitScript(()=>sessionStorage.setItem('portfolio-welcome-v4','seen'));
   await c.route(/^https:\/\/(github.com|zenn.dev|fuwatto.pages.dev)\//,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>External destination</title>'}));
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(origin+'/?detail=history');await p.getByRole('dialog',{name:'キャリア',exact:true}).waitFor({state:'visible'});
   await p.getByRole('heading',{name:'学歴・社歴',exact:true}).waitFor({state:'visible',timeout:2500});
   if((await p.getByRole('dialog',{name:'キャリア',exact:true}).innerText()).includes('上宮高校から神戸電子'))throw Error('redundant career introduction remains');
   const current=p.getByRole('region',{name:'現在の立場',exact:true});await current.waitFor({state:'visible',timeout:2500});
   const facts=await current.innerText();if(!facts.includes('神戸電子専門学校')||!facts.includes('DMM.com')||!facts.includes('27卒')||!facts.includes('内定'))throw Error('current position is incomplete');
   const cb=await current.boundingBox();if(cb.y<0||cb.y+cb.height>height)throw Error('current position not visible on entry '+JSON.stringify({width,height,cb}));
   const timeline=await p.getByRole('list',{name:'経歴',exact:true}).locator('li').allTextContents();
   if(timeline.length!==3||!timeline[0].includes('上宮')||!timeline[1].includes('神戸電子')||!timeline[2].includes('内定'))throw Error('career timeline lost existing facts');
   await p.screenshot({path:`output/playwright/hall-exhibit-career-${width}.png`});
   for(const [id,name,featureCount] of [['yoin','Yoin',2],['pop-reminder','ふわっと。',3]]){
    await p.goto(origin+'/?detail='+id);const hall=p.getByRole('dialog',{name:name+'館',exact:true});await hall.waitFor({state:'visible'});
    const controls=await hall.locator('.hallChapterNav button,.hallDialogHeader a,.hallDialogHeader button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {name:e.textContent,width:r.width,height:r.height};}));if(controls.some(r=>r.width<44||r.height<44))throw Error('hall button target smaller than 44px '+JSON.stringify(controls));
    const history=await p.evaluate(()=>window.history.length),url=p.url(),gallery=p.getByRole('region',{name:name+'の実画面',exact:true});
    await p.waitForFunction(()=>document.querySelector('.hallGalleryMain img')?.complete&&document.querySelector('.hallGalleryMain img').naturalWidth>300);
    const firstAlt=await gallery.locator('.hallGalleryMain img').getAttribute('alt');
    await gallery.getByRole('button',{name:/2枚目を表示/}).click();
    if(await gallery.locator('.hallGalleryMain img').getAttribute('alt')===firstAlt)throw Error('thumbnail did not switch screenshot');
    await gallery.getByRole('button',{name:/画面を拡大/}).click();const viewer=p.getByRole('dialog',{name:name+'の画像ビューアー',exact:true});await viewer.waitFor({state:'visible'});
    await viewer.getByRole('button',{name:'前の画像',exact:true}).click();
    if(await viewer.locator('img').getAttribute('alt')!==firstAlt)throw Error('viewer did not show previous screen');
    await viewer.getByRole('button',{name:'実寸で表示',exact:true}).click();
    if(!await viewer.getByRole('button',{name:'画面に収める',exact:true}).isVisible())throw Error('actual size unavailable');
    await viewer.getByRole('button',{name:'画面に収める',exact:true}).focus();await p.keyboard.press('Shift+Tab');if(!await viewer.getByRole('button',{name:'次の画像',exact:true}).evaluate(e=>e===document.activeElement))throw Error('viewer reverse tab escaped');await p.keyboard.press('Tab');
    if(!await viewer.getByRole('button',{name:'画面に収める',exact:true}).evaluate(e=>e===document.activeElement))throw Error('viewer tab escaped');
    await viewer.getByRole('region',{name:'画像表示領域',exact:true}).focus();await p.keyboard.press('PageDown');await p.waitForFunction(()=>document.querySelector('.hallImageViewport').scrollTop>0);
    await p.keyboard.press('Escape');await viewer.waitFor({state:'detached'});
    if(!await hall.isVisible()||!await gallery.locator('.hallGalleryMain').evaluate(e=>e===document.activeElement))throw Error('Escape closed the hall or lost focus');
    await hall.getByRole('button',{name:'使用技術へ移動',exact:true}).click();
    if(!await hall.getByRole('heading',{name:'使用技術',exact:true}).isVisible())throw Error('technology exhibit missing');
    const heading=await hall.getByRole('heading',{name:'使用技術',exact:true}).boundingBox(),toolbar=await hall.locator('.hallDialogHeader').boundingBox();
    if(heading.y<toolbar.y+toolbar.height-1||heading.y>height)throw Error('chapter heading hidden under fixed header');
    if(await hall.locator('.hallFeature').count()!==featureCount||await hall.locator('.hallTechnologies span').count()<4)throw Error('features or technologies missing');
    const scroll=await hall.locator('.hallDialogBody').evaluate(e=>e.scrollTop);
    if(scroll<50||await hall.evaluate(e=>e.scrollTop)!==0)throw Error('only the content body should scroll');
    if(p.url()!==url||await p.evaluate(()=>window.history.length)!==history)throw Error('gallery or chapter added history');
    if(id==='pop-reminder'){
     const a=hall.getByRole('link',{name:/公式サイトを見る/});await a.scrollIntoViewIfNeeded();const before=await hall.locator('.hallDialogBody').evaluate(e=>e.scrollTop);
     const popupPromise=p.waitForEvent('popup');await a.click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
     if(popup.url()!=='https://fuwatto.pages.dev/'||await a.getAttribute('target')!=='_blank')throw Error('incorrect official site destination');await popup.close();
     if(!await hall.isVisible()||await hall.locator('.hallDialogBody').evaluate(e=>e.scrollTop)!==before)throw Error('external link lost hall position');
    }
    await hall.getByRole('button',{name:'概要へ移動',exact:true}).click();
    await p.screenshot({path:`output/playwright/hall-exhibit-${id}-${width}.png`});
    if(await hall.locator('.hallDialogBody').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('exhibit has horizontal overflow');
   }
   for(const [id,name] of [['experience','経験館'],['github','GitHub館'],['zenn','Zenn館']]){
    await p.goto(origin+'/?detail='+id);const hall=p.getByRole('dialog',{name,exact:true});await hall.waitFor({state:'visible'});
    if(!await hall.getByRole('heading',{name:id==='experience'?'実務経験・活動':id==='github'?'GitHub':'Zenn',exact:true}).isVisible())throw Error('hall heading does not describe its content');
    if(id==='experience'){const t=await hall.innerText();if(!t.includes('Sky株式会社')||!t.includes('We部')||!t.includes('労務管理チーム'))throw Error('experience facts missing');}
    else {const a=hall.getByRole('link',{name:id==='github'?'GitHubへ':'Zennへ',exact:true});if(await a.getAttribute('target')!=='_blank'||!await a.getAttribute('rel').then(r=>r.includes('noopener')&&r.includes('noreferrer')))throw Error('unsafe profile link');if(await hall.locator('.hallSocialMark img').count()!==1)throw Error('official icon missing');}
    await p.screenshot({path:`output/playwright/hall-exhibit-${id}-${width}.png`});
   }
   await p.goto(origin+'/profile');const modes=await p.locator('.modeSwitch a').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,right:r.right};}));if(modes.some(r=>r.width<44||r.height<44||r.right>width)||await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('normal mode buttons are too small or clipped');
   results.push({width,height,firstScreen:true,allScreens:true,viewer:true,chapters:true,externalState:true,normalModeButtons:true});
  }finally{await c.close();}
 }
 const c=await browser.newContext({viewport:{width:390,height:844}});
 try{
  await c.addInitScript(()=>{const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:context.call(this,type,...args);};});
  const p=await c.newPage();await p.goto(origin+'/?detail=yoin');await p.getByRole('dialog',{name:'Yoin館',exact:true}).waitFor({state:'visible'});
  await p.getByText('この環境では3Dを表示できませんでした。',{exact:true}).waitFor({state:'attached'});
  await p.getByRole('button',{name:'使用技術へ移動',exact:true}).click();if(!await p.getByRole('heading',{name:'使用技術',exact:true}).isVisible())throw Error('exhibit depends on WebGL');results.push({webglUnavailable:true});
 }finally{await c.close();}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
