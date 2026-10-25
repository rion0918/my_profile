import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { gamingPC, isGamingPCClearing } from '../lib/world-gaming-pc.ts';
import { obstacles, buildings, trees, benches, streetlights, isOnRoad } from '../lib/world-layout.ts';
import { centralPlaza } from '../lib/world-zones.ts';
import { onsen } from '../lib/world-onsen.ts';
import { harbor } from '../lib/world-harbor.ts';
import { findPath, isWalkable, getGroundHeight } from '../lib/world-navigation.ts';
import { cyclingObstacles } from '../lib/world-bike.ts';
import { createGamingPC } from '../components/world/create-gaming-pc.ts';

test('the oversized PC belongs to the hobby area and leaves every route open',()=>{
  assert.ok(gamingPC.z+gamingPC.depth/2<0);
  assert.ok(gamingPC.height>=7,'a landmark several times taller than the person');
  for(let x=-gamingPC.width/2;x<=gamingPC.width/2;x+=.25)for(let z=-gamingPC.depth/2;z<=gamingPC.depth/2;z+=.25){
    const p={x:gamingPC.x+x,z:gamingPC.z+z};
    assert.equal(isOnRoad(p,.2),false,'the plinth never covers pavement');
    assert.equal(getGroundHeight(p),0,'the entire base is on dry level land');
    assert.equal(isWalkable(p,obstacles),false,'the visible base has collision');
  }
  for(const p of [...trees,...benches,...streetlights])assert.equal(isGamingPCClearing(p,trees.includes(p)?2.4:.2),false,'furniture clears the display and its view');
  for(const target of [gamingPC.approach,...buildings.map(b=>b.entry.inside),onsen.indoor,onsen.outdoor,harbor.destination])
    assert.ok(findPath(centralPlaza,target,obstacles).length,'walk route to '+JSON.stringify(target));
  assert.ok(findPath(centralPlaza,gamingPC.approach,cyclingObstacles(obstacles)).length,'cycle to the viewing point');
});

test('a white panoramic case contains real components, luminous fans and detailed cooling',()=>{
  const context={fillRect(){},clearRect(){},fillText(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  const scene=new THREE.Scene(),pc=createGamingPC(scene,()=>{});
  try{
    const root=scene.getObjectByName('gaming-pc');assert.ok(root);
    assert.deepEqual([root.position.x,root.position.z],[gamingPC.x,gamingPC.z]);
    const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    assert.ok(size.y>7.6&&size.y<8.1,'the rendered case is a large landmark, including its plinth');
    for(const name of ['motherboard','gpu','cpu-cooler','memory','radiator','cables']){
      const part=root.getObjectByName('pc-'+name);assert.ok(part,'missing '+name);
      let count=0;part.traverse(o=>{if(o.isMesh&&o.geometry.getAttribute('position').count>0)count++;});
      assert.ok(count>0,name+' is geometry, not just an empty marker');
    }
    for(const name of ['side','front','top']){
      const glass=root.getObjectByName('pc-glass-'+name);assert.ok(glass);
      assert.ok(glass.material.transparent&&glass.material.opacity<=.2);
      assert.equal(glass.material.depthWrite,false);assert.equal(glass.material.transmission,0);
    }
    const fans=[];root.traverse(o=>{if(o.name.startsWith('pc-fan-rotor-'))fans.push(o);});
    assert.equal(fans.length,13,'10 case fans plus three GPU fans');
    assert.ok(fans.every(f=>f.geometry.getAttribute('position').count>100),'curved blades have actual depth');
    let rgb=false;root.traverse(o=>{if(o.isMesh&&o.material.vertexColors&&o.geometry.getAttribute('color'))rgb=true;});assert.ok(rgb,'RGB is rendered around the fan rings');
    const geometry=[];root.traverse(o=>{if(o.isMesh)geometry.push(o.geometry);});
    pc.update(0,false);const start=fans.map(f=>f.rotation.z);
    pc.update(1,false);assert.ok(fans.some((f,i)=>f.rotation.z!==start[i]));
    pc.update(2,true);const resting=fans.map(f=>f.rotation.z);pc.update(8,true);assert.deepEqual(fans.map(f=>f.rotation.z),resting);
    const after=[];root.traverse(o=>{if(o.isMesh)after.push(o.geometry);});assert.deepEqual(after,geometry,'low settings keep every internal component and glass panel');
    root.traverse(o=>{if(o.isLight){assert.equal(o.castShadow,false);assert.equal(o.visible,false,'low mode rests optional interior lights');}});
    pc.update(9,false);pc.updateTime(1);
    root.traverse(o=>{if(o.isLight)assert.equal(o.visible,true);});
    const resources=new Set();root.traverse(o=>{
      if(o.geometry)resources.add(o.geometry);
      for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}
    });
    let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
    pc.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,resources.size);
  }finally{delete globalThis.document;}
});

test('the PC has a separate readable specification board and an unlabelled plinth',async()=>{
  const { gamingPCSpecs }=await import('../lib/world-gaming-pc.ts');
  assert.deepEqual(gamingPCSpecs,[
    {label:'CPU',value:'Ryzen 7 5700X'},
    {label:'GPU',value:'RTX 3070 Ti'},
    {label:'メモリ',value:'32 GB'},
    {label:'ストレージ',value:'1 TB'},
  ]);
  const board=gamingPC.specBoard;
  assert.ok(board.width>=3&&board.height>=4,'a substantial sign beside the case');
  const c=Math.cos(board.rotation),s=Math.sin(board.rotation);
  for(let x=-board.width/2;x<=board.width/2;x+=.15)for(let z=-board.depth/2;z<=board.depth/2;z+=.15){
    const p={x:board.x+x*c+z*s,z:board.z-x*s+z*c};
    assert.equal(isOnRoad(p,.2),false,'sign never covers pavement');
    assert.equal(getGroundHeight(p),0,'sign stands on dry level land');
    assert.equal(isWalkable(p,obstacles),false,'visible sign has collision');
    assert.ok(Math.abs(p.x-gamingPC.x)>gamingPC.width/2||Math.abs(p.z-gamingPC.z)>gamingPC.depth/2,'sign does not intersect the plinth');
  }
  const labels=[],context={fillRect(){},clearRect(){},fillText(value){labels.push(value);},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  const scene=new THREE.Scene(),pc=createGamingPC(scene,()=>{});
  try{
    assert.equal(labels.includes('WHITE BUILD'),false);
    for(const {label,value} of gamingPCSpecs){assert.ok(labels.includes(label));assert.ok(labels.includes(value));}
    const sign=scene.getObjectByName('pc-spec-board');assert.ok(sign);
    sign.updateWorldMatrix(true,false);
    const position=sign.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(position.x-board.x)<1e-8);assert.equal(position.z,board.z);
    const screen=sign.getObjectByName('pc-spec-screen');assert.ok(screen?.isMesh&&screen.material.map,'an actual illuminated specification screen');
    assert.equal(screen.material.toneMapped,false,'text remains legible at night');
    for(const name of ['gpu-heatpipes','gpu-ports','cable-connectors']){
      const detail=scene.getObjectByName('pc-'+name);assert.ok(detail);
      assert.ok(detail.children.some(child=>child.isMesh),'physical detail for '+name);
    }
  }finally{pc.dispose();delete globalThis.document;}
});
