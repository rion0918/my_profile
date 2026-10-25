import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildings } from '../lib/world-layout.ts';
import { createHallArchitecture } from '../components/world/create-hall-architecture.ts';

const label=(parent,value)=>{const object=new THREE.Object3D();object.userData.text=value;parent.add(object);};
const release=group=>{
 const geometries=new Set(),materials=new Set(),textures=new Set();
 group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}}});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
};

test('each redesigned hall has clear textured glazing and a furnished interior',()=>{
 for(const b of buildings){
  const group=createHallArchitecture(b,label);
  try{
   assert.equal(group.name,'hall-architecture');
   const interior=group.getObjectByName('hall-interior');assert.ok(interior,b.id+' has an interior');
   let furnishings=0;interior.traverse(o=>{if(o.isMesh)furnishings++;});assert.ok(furnishings>=12,b.id+' has real furniture');
   const glazing=[];group.getObjectByName('hall-glazing').traverse(o=>{if(o.isMesh)glazing.push(o);});
   assert.ok(glazing.length>=3,b.id+' has glazing on several surfaces');
   for(const pane of glazing){
    assert.ok(pane.material instanceof THREE.MeshPhysicalMaterial);
    assert.ok(pane.material.transparent&&pane.material.opacity<=.28);
    assert.equal(pane.material.depthWrite,false);
    assert.equal(pane.castShadow,false);
    assert.equal(pane.material.transmission,0,'no extra full-scene refraction pass on low-end devices');
    assert.ok(pane.material.map instanceof THREE.DataTexture,'subtle reflections are locally generated');
   }
   assert.ok(group.getObjectByName('hall-structure'));
  }finally{release(group);}
 }
});

test('the architecture fits the existing plots and leaves every doorway open',()=>{
 for(const b of buildings){
  const group=createHallArchitecture(b,label);
  try{
   group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),w=b.width/b.scale,d=b.depth/b.scale;
   assert.ok(bounds.min.x>=-w/2-.35&&bounds.max.x<=w/2+.35,b.id+' stays inside the existing width allowance');
   assert.ok(bounds.min.z>=-d/2-.35&&bounds.max.z<=d/2+.35,b.id+' stays inside the existing depth allowance');
   assert.ok(bounds.max.y<=b.height/b.scale+.15,b.id+' keeps the height used for labels and occlusion');
   for(const x of [-.45,0,.45])for(const y of [.7,1.55]){
    const ray=new THREE.Raycaster(new THREE.Vector3(x,y,d/2+.4),new THREE.Vector3(0,0,-1),0,.9);
    assert.equal(ray.intersectObject(group,true).filter(h=>h.object.isMesh).length,0,b.id+' keeps a clear doorway');
   }
   let vertices=0;group.traverse(o=>{if(o.isMesh)vertices+=o.geometry.getAttribute('position').count;});
   assert.ok(vertices<70000,b.id+' avoids excessive geometric detail');
  }finally{release(group);}
 }
});

test('the visible exhibits retain the existing career, activity and account facts',()=>{
 const expected={history:['上宮高校','神戸電子','DMM・27卒内定'],experience:['Sky / We部'],github:['rion0918'],zenn:['riozenn'],x:['rioi7_0918']};
 for(const [id,words] of Object.entries(expected)){
  const group=createHallArchitecture(buildings.find(b=>b.id===id),label);
  try{const texts=[];group.traverse(o=>{if(o.userData.text)texts.push(o.userData.text);});for(const word of words)assert.ok(texts.includes(word),id+' retains '+word);}
  finally{release(group);}
 }
});
