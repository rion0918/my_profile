import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWildlife } from '../components/world/create-wildlife.ts';
import { cats, nearestCat, findCatApproach } from '../lib/world-wildlife.ts';
import { obstacles } from '../lib/world-layout.ts';
import { isWalkable } from '../lib/world-navigation.ts';

test('cats can be approached by the walking grid and only nearby cats offer a greeting',()=>{
  assert.equal(nearestCat({x:0,z:6}),null);
  for(let i=0;i<cats.length;i++){
    const approach=findCatApproach({x:0,z:6},i,obstacles);
    assert.ok(approach?.path.length,`reach cat ${i}`);
    assert.ok(isWalkable(approach.point,obstacles));
    assert.ok(Math.hypot(approach.point.x-cats[i].x,approach.point.z-cats[i].z)<=2);
    assert.equal(nearestCat(approach.point),i);
    if(i===0)assert.ok(Math.abs((approach.point.x-cats[i].x)*.8575-(approach.point.z-cats[i].z)*.5145)>.6,'stand beside the cat so both remain visible');
  }
});

test('a greeting gives a brief visible response, ends cleanly, and respects reduced motion',()=>{
  const scene=new THREE.Scene(), texture=new THREE.Texture(), wildlife=createWildlife(scene,texture);
  try{
    wildlife.update(0,false);wildlife.pet(0);wildlife.update(.6,false);
    const hearts=scene.getObjectByName('cat-hearts-0');assert.equal(hearts.visible,true);
    assert.ok(scene.getObjectByName('cat-0').getObjectByName('eyes').scale.y<.5);
    wildlife.update(2,false);assert.equal(hearts.visible,false);
    wildlife.pet(0);wildlife.update(2.6,true);assert.equal(hearts.visible,false);
    assert.ok(scene.getObjectByName('cat-0').getObjectByName('eyes').scale.y<.5,'quiet feedback remains');
  }finally{wildlife.dispose();texture.dispose();}
});
