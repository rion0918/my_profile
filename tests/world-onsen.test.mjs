import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { onsen, onsenObstacles, isOnsenClearing, isInsideBathhouse } from '../lib/world-onsen.ts';
import { obstacles, trees, streetlights, benches, roadCurves, roads } from '../lib/world-layout.ts';
import { findPath, isWalkable, moveCharacter, getGroundHeight } from '../lib/world-navigation.ts';
import { createWorldMapData } from '../lib/world-map-data.ts';
import { mapPoint } from '../lib/world-map.ts';
import { createOnsen } from '../components/world/create-onsen.ts';

test('the onsen sits behind town and both baths are reachable without crossing walls or water', () => {
  assert.ok(onsen.z < -20);
  for (const target of [onsen.entry, onsen.outdoor, onsen.indoor]) {
    const path = findPath({ x: 0, z: 6 }, target, obstacles);
    assert.ok(path.length, JSON.stringify(target));
    let previous = { x: 0, z: 6 };
    for (const point of path) {
      for (let i = 0; i <= 20; i++) assert.ok(isWalkable({
        x: previous.x + (point.x - previous.x) * i / 20,
        z: previous.z + (point.z - previous.z) * i / 20,
      }, obstacles));
      previous = point;
    }
  }
  assert.equal(isInsideBathhouse(onsen.indoor), true);
  assert.equal(isInsideBathhouse(onsen.outdoor), false);
  for (const bath of [onsen.outdoorBath, onsen.indoorBath]) {
    assert.equal(isWalkable(bath, obstacles), false);
    assert.ok(onsenObstacles.some(o => o.x === bath.x && o.z === bath.z));
  }
  const wall = onsenObstacles[0];
  assert.equal(isWalkable(wall, obstacles), false);
  const moved = moveCharacter(onsen.outdoor, { x: -20, z: 0 }, obstacles);
  assert.ok(moved.x > onsen.outdoorBath.x, 'bath rim stops a dash');
});

test('the new site keeps streets and existing furniture clear and appears in the guide map', () => {
  for (const item of [...trees, ...streetlights, ...benches]) {
    assert.equal(isOnsenClearing(item, trees.includes(item) ? 2.3 : 0.3), false, JSON.stringify(item));
  }
  for (let x = onsen.x - onsen.width / 2; x <= onsen.x + onsen.width / 2; x += 0.5)
    for (let z = onsen.z - onsen.depth / 2; z <= onsen.z + onsen.depth / 2; z += 0.5)
      assert.equal(getGroundHeight({ x, z }), 0, 'the terrace stays on dry, level land');
  for (let index = 0; index < roadCurves.length; index++) {
    for (const p of roadCurves[index].getPoints(150)) {
      for (const o of onsenObstacles) assert.ok(
        Math.abs(p.x - o.x) > o.width / 2 + roads[index].width / 2 ||
        Math.abs(p.z - o.z) > o.depth / 2 + roads[index].width / 2,
        'onsen walls leave the existing streets open',
      );
    }
  }
  assert.deepEqual({ x: createWorldMapData().onsen.x, y: createWorldMapData().onsen.y }, mapPoint(onsen));
});

test('the bathhouse has a real roof, reveals its interior on entry, rests in low settings and disposes resources', () => {
  const context = { fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {} };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const scene = new THREE.Scene(), world = createOnsen(scene, () => {});
  try {
    const roof = scene.getObjectByName('onsen-roof');
    assert.ok(roof && roof.children.length > 0);
    const original = [];
    scene.traverse(o => { if (o instanceof THREE.Mesh) original.push(o.geometry); });
    world.update(0, onsen.outdoor, false);
    assert.equal(roof.visible, true);
    world.update(1, onsen.indoor, false);
    assert.equal(roof.visible, false);
    world.update(2, onsen.indoor, true);
    assert.equal(roof.visible, false, 'roof behavior is identical in low settings');
    const steam = scene.getObjectByName('onsen-steam');
    assert.equal(steam.visible, false);
    const water = [];
    scene.traverse(o => { if (o instanceof THREE.Mesh && o.material.uniforms?.time) water.push(o.material); });
    assert.equal(water.length, 2);
    assert.ok(water.every(material => material.uniforms.time.value === 0), 'low settings freeze both water surfaces');
    world.update(3, onsen.outdoor, false);
    assert.equal(roof.visible, true); assert.equal(steam.visible, true);
    assert.ok(water.every(material => material.uniforms.time.value === 3));
    const after = []; scene.traverse(o => { if (o instanceof THREE.Mesh) after.push(o.geometry); });
    assert.deepEqual(after, original, 'changing settings keeps all bath and building geometry');
    let disposed = 0;
    new Set(original).forEach(g => g.addEventListener('dispose', () => disposed++));
    world.dispose();
    assert.equal(scene.children.length, 0); assert.ok(disposed > 0);
  } finally { world.dispose(); delete globalThis.document; }
});
