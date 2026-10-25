import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cats, groundBirds, getBirdFlight, isWildlifeClearing } from '../lib/world-wildlife.ts';
import { obstacles, isOnRoad, buildings } from '../lib/world-layout.ts';
import { isWalkable, getWalkingHeight } from '../lib/world-navigation.ts';
import { createWildlife } from '../components/world/create-wildlife.ts';

test('cats and resting birds occupy dry clear spots beside paths and entrances', () => {
  assert.ok(cats.length>=6 && groundBirds.length>=6);
  assert.ok(new Set(cats.map(c=>c.coat)).size>=4);
  for(const animal of [...cats,...groundBirds]) {
    assert.ok(getWalkingHeight(animal)>=0, 'rest on dry land or the harbor deck');
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8,radius=cats.includes(animal)?.55:.2;
      const p={x:animal.x+Math.cos(angle)*radius,z:animal.z+Math.sin(angle)*radius};
      assert.ok(isWalkable(p,obstacles),JSON.stringify(animal));
      assert.equal(isOnRoad(p,.1),false,`do not sit in the street: ${JSON.stringify(animal)}`);
    }
    assert.equal(isWildlifeClearing(animal),true);
    for(const b of buildings)assert.ok(Math.hypot(animal.x-b.entry.x,animal.z-b.entry.z)>2.5);
  }
  assert.equal(isWildlifeClearing({x:0,z:0}),false);
});

test('small flocks appear occasionally above roof height and follow continuous flight paths', () => {
  let active=0,rest=0;
  for(let t=0;t<172;t+=.1) {
    const bird=getBirdFlight(t,0,0);
    assert.ok(Object.values(bird).filter(v=>typeof v==='number').every(Number.isFinite));
    if(bird.visible){active++;assert.ok(bird.y>=8);}else rest++;
    const next=getBirdFlight(t+.001,0,0);
    if(bird.visible&&next.visible)assert.ok(Math.hypot(next.x-bird.x,next.y-bird.y,next.z-bird.z)<.02);
  }
  assert.ok(active>100 && rest>active*2, 'flight is intermittent');
  assert.deepEqual(getBirdFlight(12,0,0),getBirdFlight(98,0,0));
  assert.notDeepEqual(getBirdFlight(12,0,0),getBirdFlight(12,0,1));
});

test('wildlife animates gently, rests with reduced motion and releases its scene resources', () => {
  const scene=new THREE.Scene(),texture=new THREE.Texture(),wildlife=createWildlife(scene,texture);
  const cat=scene.getObjectByName('cat-0'),tail=cat.getObjectByName('tail'),head=cat.getObjectByName('head');
  wildlife.update(0,false);const before=tail.rotation.z;
  wildlife.update(12,false);assert.notEqual(tail.rotation.z,before);
  const flock=scene.getObjectByName('flying-bird-0-0');assert.equal(flock.visible,true);
  wildlife.update(20,true);assert.equal(flock.visible,false);
  const pose=head.quaternion.clone();wildlife.update(40,true);assert.ok(head.quaternion.equals(pose));
  let disposed=0;scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.addEventListener('dispose',()=>disposed++);});
  wildlife.dispose();assert.equal(scene.children.length,0);assert.ok(disposed>0);texture.dispose();
});
