import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { loadCharacter } from '../components/world/load-character.ts';
globalThis.ProgressEvent=class{constructor(type,details){Object.assign(this,{type},details);}};

test('greeting reaches toward the cat and restores the arm when walking or stopping',async()=>{
  const bytes=await fs.readFile(new URL('../public/models/rion-walker.glb',import.meta.url));
  THREE.DefaultLoadingManager.setURLModifier(url=>url.startsWith('/models/')?`data:application/octet-stream;base64,${bytes.toString('base64')}`:url);
  const parent=new THREE.Group(),character=await loadCharacter(parent);
  try{
    character.update(1/60,0,false);parent.updateWorldMatrix(true,true);
    const hand=parent.getObjectByName('WristR'),before=hand.getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(0,.7,.65);
    character.greet(target);for(let i=0;i<45;i++)character.update(1/60,0,false);
    parent.updateWorldMatrix(true,true);const during=hand.getWorldPosition(new THREE.Vector3());
    assert.ok(during.distanceTo(target)<before.distanceTo(target)-.15);
    character.update(1/60,2.7,false);character.stop();parent.updateWorldMatrix(true,true);
    assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(before)<.03);
  }finally{character.dispose();THREE.DefaultLoadingManager.setURLModifier(undefined);}
});
