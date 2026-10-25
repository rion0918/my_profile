import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ponds, isOnRoad } from '../lib/world-layout.ts';
import { createWater } from '../components/world/create-water.ts';

test('pond water and beds do not intersect the pavement or its curb',()=>{
  const scene=new THREE.Scene(),water=createWater(scene,ponds);
  try{
   scene.updateMatrixWorld(true);
   const surfaces=[];scene.traverse(o=>{if(o.isMesh&&o.material.uniforms?.ocean?.value===0)surfaces.push(o);});
   assert.equal(surfaces.length,ponds.length);
   for(const surface of surfaces){
    const pond=ponds.find(p=>p.x===surface.position.x&&p.z===surface.position.z);
    const positions=surface.geometry.getAttribute('position'),point=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){
     point.fromBufferAttribute(positions,i).applyMatrix4(surface.matrixWorld);
     assert.equal(isOnRoad(point,.2),false,`water at ${point.x},${point.z} must not be cut by a street`);
     const bed={x:pond.x+(point.x-pond.x)*1.08,z:pond.z+(point.z-pond.z)*1.08};
     assert.equal(isOnRoad(bed,.2),false,'the wider lake bed also clears the curb');
    }
   }
  }finally{water.dispose();}
 });

test('the full rocky shoreline fits beside the roads without skipped sections',()=>{
  for(const p of ponds)for(let i=0;i<720;i++){
   const a=i/720*Math.PI*2,rock={x:p.x+Math.cos(a)*(p.width/2+.4),z:p.z+Math.sin(a)*(p.depth/2+.4)};
   assert.equal(isOnRoad(rock,1.05),false,`shoreline at ${rock.x},${rock.z} must fit even the largest bank rock`);
  }
 });
