import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { viewOffset } from '../lib/world-view.ts';

test('touch movement ignores tap jitter and keeps the screen direction in both camera views',async()=>{
 const {getTouchDirection}=await import('../lib/world-view.ts');
 for(const [dx,dy] of [[0,0],[7,0],[0,-10],[6,8]])assert.deepEqual(getTouchDirection(dx,dy),{x:0,z:0});
 for(const offset of [viewOffset,{x:68,y:88,z:116}]){
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,600);
  camera.position.set(offset.x,offset.y,offset.z);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const origin=new THREE.Vector3().project(camera);
  for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70],[60,60],[-60,-60],[60,-60],[-60,60]]){
   const direction=getTouchDirection(dx,dy,offset);
   assert.ok(Math.abs(Math.hypot(direction.x,direction.z)-1)<1e-8,'diagonals cannot move faster');
   const point=new THREE.Vector3(direction.x,0,direction.z).project(camera);
   const x=point.x-origin.x,y=origin.y-point.y;
   assert.ok((x*dx+y*dy)>0,'move toward the finger, not against it');
   assert.ok(Math.abs(x*dy-y*dx)<1e-8,'projection matches the finger direction');
  }
 }
});
