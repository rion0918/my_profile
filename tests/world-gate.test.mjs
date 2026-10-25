import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as zones from '../lib/world-zones.ts';
import { obstacles, trees, buildings, benches, streetlights, isOnRoad } from '../lib/world-layout.ts';
import { findPath, isWalkable, moveCharacter } from '../lib/world-navigation.ts';
import { onsen } from '../lib/world-onsen.ts';
import { harbor } from '../lib/world-harbor.ts';
import { cyclingObstacles } from '../lib/world-bike.ts';

test('the two-sided area gate marks the northern edge of the central plaza',()=>{
  const gate=zones.areaGate;
  assert.ok(gate,'the boundary has a shared gate placement');
  assert.equal(gate.x,zones.centralPlaza.x);
  assert.ok(gate.z<zones.zoneBoundary&&gate.z>zones.zoneBoundary-7);
  assert.equal(gate.northLabel,'趣味エリア');
  assert.equal(gate.southLabel,'ポートフォリオエリア');
  assert.ok(gate.clearance>=3.5,'the overhead sign clears walking and cycling');
  assert.equal(zones.areaGateSupports.length,2);
  for(const support of zones.areaGateSupports){
    assert.equal(isOnRoad(support,.8),false,'posts stand off the pavement');
    assert.equal(isWalkable(support,obstacles),false,'solid feet have matching collision');
    for(const p of [...trees,...benches,...streetlights])
      assert.ok(Math.hypot(p.x-support.x,p.z-support.z)>2,'furniture and tree crowns clear the posts');
    for(const b of buildings)
      assert.ok(Math.abs(support.x-b.x)>(support.width+b.width)/2||Math.abs(support.z-b.z)>(support.depth+b.depth)/2);
  }
  for(const x of [-1.2,0,1.2]){
    for(let z=gate.z-2;z<=gate.z+2;z+=.1){
      assert.ok(isWalkable({x,z},obstacles),'the whole central path stays open');
      assert.ok(isWalkable({x,z},cyclingObstacles(obstacles)),'the bicycle also clears the posts');
    }
    const start={x,z:gate.z+2};
    const end=moveCharacter(start,{x:0,z:-4},obstacles);
    assert.ok(Math.abs(end.z-(gate.z-2))<.01,'movement crosses under the arch');
  }
  for(const target of [...buildings.map(b=>b.entry.inside),onsen.indoor,onsen.outdoor,harbor.destination])
    assert.ok(findPath(zones.centralPlaza,target,obstacles).length,'the gate preserves access to '+JSON.stringify(target));
});

test('the gate has correctly facing readable labels, a clear opening, and releases its resources',async()=>{
  const {createAreaGate}=await import('../components/world/create-area-gate.ts');
  const labels=[];
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},fillText(value){labels.push(value);}})})};
  const font=new FontLoader().parse(JSON.parse(readFileSync(new URL('../components/world/assets/helvetiker_regular.typeface.json',import.meta.url))));
  const scene=new THREE.Scene(),gate=createAreaGate(scene,()=>{},font);
  try{
    const root=scene.getObjectByName('area-gate');assert.ok(root);
    assert.equal(root.position.z,zones.areaGate.z);
    const glass=root.getObjectByName('area-gate-glass'),canopy=root.getObjectByName('area-gate-canopy');
    for(const part of [glass,canopy]){
      assert.ok(part,'clear glass columns and a layered canopy replace the opaque board');
      assert.ok(part.material.transparent&&part.material.opacity<.6);
      assert.equal(part.material.depthWrite,false);
      assert.equal(part.material.transmission,0,'the gate adds no scene refraction pass');
    }
    for(const [direction,title,rotation] of [['north',zones.areaGate.northLabel,0],['south',zones.areaGate.southLabel,Math.PI]]){
      const label=root.getObjectByName('area-gate-label-'+direction);
      assert.ok(label&&labels.includes(title),'the actual texture draws '+title);
      assert.equal(label.rotation.y,rotation,'the back label reads naturally from the north');
      assert.equal(label.geometry.type,'TextGeometry','the main title has real extruded letterforms');
      assert.equal(label.userData.word,direction==='north'?'HOBBY':'PORTFOLIO');
      for(const material of label.material){
        assert.equal(material.toneMapped,false);assert.ok(material.emissiveIntensity>.2,'letters stay lit at night');
        assert.equal(material.depthWrite,false,'the hidden reverse title does not obscure the view through glass');
        for(const sign of [-1,1]){
          const camera=new THREE.PerspectiveCamera();camera.position.z=zones.areaGate.z+sign*20;camera.updateMatrixWorld(true);
          label.onBeforeRender(null,null,camera,null,material,null);
          assert.equal(material.opacity,sign===(direction==='north'?1:-1)?1:0,'the opposite title never shows mirrored through the glass');
        }
      }
    }
    assert.ok(!root.children.some(o=>o.isLight),'the static gate adds no light or shadow passes');
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(!o.isMesh&&!o.isLineSegments)return;geometries.add(o.geometry);
      for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}
      const position=o.geometry.getAttribute('position'),point=new THREE.Vector3();
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(o.matrix);
        assert.ok(point.y>=zones.areaGate.clearance-.01||Math.abs(point.x)>3.7,`no geometry crosses the walking opening: ${point.toArray()}`);
      }
    });
    let disposed=0;const total=geometries.size+materials.size+textures.size;
    for(const item of [...geometries,...materials,...textures])item.addEventListener('dispose',()=>disposed++);
    gate.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,total);
  }finally{delete globalThis.document;}
});
