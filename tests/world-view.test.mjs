import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { viewOffset, getViewSpan, panView } from '../lib/world-view.ts';

test('portrait and landscape framing leave room for a whole hall and the controls',()=>{
  for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390],[1440,900]]){
    const span=getViewSpan(width,height);
    assert.ok(2*span*width/height>=12.4-1e-8,`hall width at ${width}`);
    assert.ok(span>=7.5,`vertical context at ${height}`);
    assert.ok(getViewSpan(width,height,true)>span*3,'overview remains a distinct view');
    assert.ok(getViewSpan(width,height,false,1.5)<span,'zoom in');
    assert.ok(getViewSpan(width,height,false,.75)>span,'zoom out');
  }
});

test('dragging moves visible ground with the pointer in both axes and camera modes',()=>{
  for(const offset of [viewOffset,{x:68,y:88,z:116}])for(const [dx,dy] of [[80,0],[0,-60],[45,75]]){
    const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,600),start={x:0,z:0};
    const point=new THREE.Vector3(1,0,2);
    const aim=target=>{camera.position.set(target.x+offset.x,offset.y,target.z+offset.z);camera.lookAt(target.x,0,target.z);camera.updateMatrixWorld();};
    const project=()=>{const p=point.clone().project(camera);return {x:(p.x+1)*500,y:(1-p.y)*500};};
    aim(start);const before=project();aim(panView(start,dx,dy,.02,offset));const after=project();
    assert.ok(Math.abs(after.x-before.x-dx)<1e-6,'horizontal follows the pointer');
    assert.ok(Math.abs(after.y-before.y-dy)<1e-6,'vertical follows the pointer');
  }
});

test('panning stays inside the island viewing bounds',()=>{
  for(const [dx,dy] of [[1e6,1e6],[-1e6,-1e6]]){
    const p=panView({x:0,z:0},dx,dy,1,viewOffset);
    assert.ok(p.x>=-45&&p.x<=45&&p.z>=-51&&p.z<=40);
  }
});

test('overview zoom has the same direction as the close view',()=>{
  const span=getViewSpan(390,844,true);
  assert.ok(getViewSpan(390,844,true,1.2)<span);
  assert.ok(getViewSpan(390,844,true,.8)>span);
});
