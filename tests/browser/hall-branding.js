async(page)=>{
 const results=[],errors=[],browser=page.context().browser();
 for(const [id,x,word,face,side] of [['experience',8,'Experience',0x356f5d,0x356f5d],['yoin',-8,'Yoin',0xfff1db,0x795166],['pop-reminder',8,'ふわっと。',0x2f7078,0x67adb5],['history',-8,'Career',0xf2ebdb,0xc5a46b],['github',-22,'GitHub',0xf2f5f3,0x0fbf3e],['zenn',22,'Zenn',0x3ea8ff,0x3ea8ff]]){
  for(const [width,height] of [[1440,900],[390,844]]){
   const c=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
   try{
    await c.addInitScript(({x,z})=>{
     sessionStorage.setItem('portfolio-welcome-v4','seen');sessionStorage.setItem('portfolio-position-v5',JSON.stringify({version:5,x,z}));
     window.__THREE_DEVTOOLS__=new EventTarget();window.__brandQA={};
     window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{if(e.detail.isScene)window.__brandQA.scene=e.detail;if(e.detail.isWebGLRenderer){window.__brandQA.renderer=e.detail;const render=e.detail.render.bind(e.detail);e.detail.render=(scene,camera)=>{window.__brandQA.camera=camera;return render(scene,camera);};}});
    },{x,z:id==='history'||id==='experience'?30:id==='yoin'||id==='pop-reminder'?12.5:20});
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
    await p.goto('http://localhost:3001');await p.waitForFunction(()=>document.querySelector('.worldSurface')?.getAttribute('aria-busy')==='false');
    if(!await p.evaluate(()=>{
     const letters=[];window.__brandQA.scene.traverse(o=>{if(o.name==='entrance-word-letter')letters.push(o);});
     return letters.length===4&&letters.every(o=>o.material.every(m=>m.emissiveIntensity>=.8)&&o.getObjectByName('hall-word-glow'));
    }))throw Error('entrance lettering is not lit');
    const sign=await p.evaluate(({id})=>{
     const hall=window.__brandQA.scene.getObjectByName('hall-'+id),sign=hall.getObjectByName('hall-word-sign');window.__brandQA.sign=sign;window.__brandQA.geometry=sign.geometry;
     sign.geometry.computeBoundingBox();const b=sign.geometry.boundingBox;
     const aura=sign.getObjectByName('hall-word-glow');
     return {emissions:sign.material.map(m=>m.emissiveIntensity),halo:!!aura&&aura.material.transparent&&aura.material.depthWrite===false&&aura.material.map.image.width===768,word:sign.userData.word,type:sign.geometry.type,width:b.max.x-b.min.x,height:b.max.y-b.min.y,depth:b.max.z-b.min.z,colors:sign.material.map(m=>m.color.getHex()),position:sign.position.toArray()};
    },{id});
    if(sign.word!==word||sign.type!=='TextGeometry'||sign.depth<.1||sign.colors[0]!==face||sign.colors[1]!==side)throw Error('wrong sign '+JSON.stringify(sign));
    if(!sign.halo||sign.emissions.some(e=>e<.8))throw Error('unlit letters '+id);
    const frame=await p.evaluate(()=>{
     const q=window.__brandQA,s=q.sign,point=s.localToWorld(s.geometry.boundingBox.getCenter(s.position.clone())).project(q.camera);
     const ground=[];for(const y of [.6,.5,.4])for(const x of [.6,.4,.8])ground.push({x:innerWidth*x,y:innerHeight*y});
     return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2,start:ground.find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')};
    });
    await p.mouse.move(frame.start.x,frame.start.y);await p.mouse.down();await p.mouse.move(frame.start.x+width*.5-frame.x,frame.start.y+height*.4-frame.y,{steps:12});await p.mouse.up();
    await p.screenshot({path:`output/playwright/${id}-word-sign-${width}.png`});
    await p.clock.setFixedTime(new Date('2026-10-24T21:00:00+09:00'));
    await p.locator('.worldSurface').focus();await p.keyboard.press('Escape');
    await p.waitForFunction(()=>document.querySelector('.worldSurface')?.dataset.night==='true');
    await p.screenshot({path:`output/playwright/${id}-word-sign-night-${width}.png`});
    await p.getByLabel('画質・BGM設定').click();await p.getByLabel('画質モード',{exact:true}).selectOption('low');await p.getByLabel('画質・BGM設定').click();
    if(!await p.evaluate(()=>window.__brandQA.sign.geometry===window.__brandQA.geometry&&!window.__brandQA.renderer.shadowMap.enabled&&window.__brandQA.sign.material.every(m=>m.emissiveIntensity>=.8)&&window.__brandQA.sign.getObjectByName('hall-word-glow').visible))throw Error('low mode changes lettering');
    await p.screenshot({path:`output/playwright/${id}-word-sign-low-${width}.png`});
    await p.locator('.worldGuide > summary').click();await p.getByRole('button',{name:({history:'キャリア館',experience:'経験館',yoin:'Yoin館','pop-reminder':'ふわっと。館',github:'GitHub館',zenn:'Zenn館'}[id])+'へ歩く',exact:true}).click();
    await p.getByRole('dialog').waitFor({state:'visible',timeout:15000});
    const link=p.locator('.hallLinkDoor');
    if(id==='history'){
     if(await p.locator('#detail-title').innerText()!=='キャリア館'||await link.getAttribute('href')!=='/career#history')throw Error('Career name or existing URL changed');
     if(!await p.locator('.hallFactNote').innerText().then(t=>t.includes('27卒')&&t.includes('内定')))throw Error('Career facts lost');
    }else if(id==='experience'){
     if(await link.getAttribute('href')!=='/career#experience'||await p.locator('.hallCareerCard').count()!==2)throw Error('Experience contents changed');
    }else if(id==='yoin'){
     if(await link.getAttribute('href')!=='/projects/yoin'||await p.locator('.productShowcase img').count()!==2)throw Error('Yoin contents changed');
    }else if(id==='pop-reminder'){
     if(await link.getAttribute('href')!=='https://fuwatto.pages.dev/'||await link.getAttribute('target')!=='_blank'||await p.locator('.productShowcase img').count()!==2)throw Error('Fuwatto contents changed');
    }else if(await link.getAttribute('target')!=='_blank'||!await link.getAttribute('href').then(h=>h===(id==='github'?'https://github.com/rion0918':'https://zenn.dev/riozenn')))throw Error('hall lost its profile link');
    await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
    results.push({id,width,height,sign,entry:true,sameLowGeometry:true});
   }finally{await c.close();}
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
