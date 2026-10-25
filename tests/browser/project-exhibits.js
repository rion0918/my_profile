async(page)=>{
 const browser=page.context().browser(),results=[],errors=[];
 for(const [id,name,x] of [['yoin','Yoin館',-8],['pop-reminder','ふわっと。館',8]]){
  for(const [width,height] of [[1440,900],[390,844]]){
   const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
   try{
    await c.addInitScript(()=>{
     sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x:0,z:10}));
     window.__THREE_DEVTOOLS__=new EventTarget();window.__screenQA={};
     window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
      if(e.detail.isScene)window.__screenQA.scene=e.detail;
      if(e.detail.isWebGLRenderer){window.__screenQA.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(scene,camera)=>{window.__screenQA.camera=camera;return render(scene,camera);};}
     });
    });
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
    await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
    const data=await p.evaluate(id=>{
     const qa=window.__screenQA,g=qa.scene.getObjectByName('product-exhibit-'+id);qa.exhibit=g;
     const front=g.getObjectByName('product-screen-front'),back=g.getObjectByName('product-screen-back');
     return {scale:g.scale.toArray(),front:!!front,back:!!back,distance:Math.hypot(g.position.x,g.position.z-10),shared:!!front&&!!back&&front.material===back.material};
    },id);
    if(data.scale.some(s=>s!==1.7)||!data.front||!data.back||!data.shared)throw Error('display size or both faces missing '+JSON.stringify(data));
    if(data.distance<=14||data.distance>=23.8)throw Error('test must approach beyond the old image loading distance');
    await p.waitForFunction(()=>window.__screenQA.exhibit.getObjectByName('product-screen-front').material.map.image.naturalWidth>300);
    const frame=await p.evaluate(()=>{
     const qa=window.__screenQA,screen=qa.exhibit.getObjectByName('product-screen-back');qa.geometry=screen.geometry;
     const point=screen.getWorldPosition(screen.position.clone()).project(qa.camera);
     return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
    });
    const dragX=width*.5-frame.x,dragY=height*.43-frame.y;
    await p.mouse.move(width*.6,height*.6);await p.mouse.down();await p.mouse.move(width*.6+dragX,height*.6+dragY,{steps:14});await p.mouse.up();
    await p.screenshot({path:`output/playwright/${id}-large-screen-${width}.png`});
    await p.mouse.click(width*.5,height*.43);await p.getByRole('dialog').waitFor({state:'visible'});
    if(await p.locator('#detail-title').innerText()!==name)throw Error('clicking the enlarged screen opens the wrong product');
    await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
    if(!await p.evaluate(()=>window.__screenQA.exhibit.scale.x===1.7&&window.__screenQA.exhibit.getObjectByName('product-screen-back').geometry===window.__screenQA.geometry&&!window.__screenQA.renderer.shadowMap.enabled))throw Error('low mode changes display');
    await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:name+'へ歩く',exact:true}).click();await p.getByRole('dialog').waitFor({state:'visible',timeout:20000});
    if(await p.locator('#detail-title').innerText()!==name||await p.locator('.productShowcase img').count()!==2)throw Error('product entry or full details changed');
    results.push({id,width,height,data,realScreenAtDistance:true,entry:true,sameLowGeometry:true});
   }finally{await c.close();}
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
