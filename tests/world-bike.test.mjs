import test from 'node:test';
import assert from 'node:assert/strict';
import { bikeStation, createBikeController, cyclingObstacles, getCyclingSpeed } from '../lib/world-bike.ts';
import { obstacles, buildings, trees, isOnRoad } from '../lib/world-layout.ts';
import { findPath, moveCharacter, isWalkable, getMoveSpeed } from '../lib/world-navigation.ts';

test('the bicycle is reachable from the plaza and mounts only nearby on the ground', () => {
  const bike = createBikeController();
  assert.ok(findPath({ x: 0, z: 6 }, bike.position, obstacles).length);
  assert.equal(bike.mount({ x: 0, z: 6 }, true), false);
  assert.equal(bike.mount(bike.position, false), false);
  assert.equal(bike.mount(bike.position, true), true);
  assert.equal(bike.riding, true);
  assert.equal(bike.mount(bike.position, true), false);
  assert.ok(getCyclingSpeed(-2, false) >= getMoveSpeed(-2) * 1.7);
  assert.equal(getCyclingSpeed(-2, false), 9);
  assert.equal(getCyclingSpeed(1, false), 1.1);
  assert.equal(getCyclingSpeed(10, true), getCyclingSpeed(-2, false));
});

test('dismount finds a clear standing spot, keeps the bicycle there and allows remounting', () => {
  const bike = createBikeController();
  bike.mount(bike.position, true);
  const actor = { x: 0, z: 6 };
  const outside = bike.dismount(actor, 0, obstacles);
  assert.ok(outside && isWalkable(outside, obstacles));
  assert.ok(Math.hypot(outside.x - actor.x, outside.z - actor.z) >= 0.8);
  assert.deepEqual(bike.position, actor);
  assert.equal(bike.riding, false);
  assert.equal(bike.mount(outside, true), true);
  const boxed = [{ x: 0, z: 6, width: 5, depth: 5 }];
  assert.equal(bike.dismount(actor, 0, boxed), null);
  assert.equal(bike.riding, true, 'do not dismount through a wall');
});

test('cycling routes reach all six entrances and the harbor without clipping walls or railings', () => {
  const cycle = cyclingObstacles(obstacles);
  for (const b of buildings) assert.ok(findPath({ x: 0, z: 6 }, b.entry.cycling, cycle).length, b.id);
  assert.ok(findPath({ x: 0, z: 6 }, { x: 0, z: -46 }, cycle).length);
  const b = buildings[0];
  const wall = moveCharacter({ x: b.x - b.width / 2 - 2, z: b.z }, { x: 20, z: 0 }, cycle);
  assert.ok(wall.x < b.x - b.width / 2 - .9);
  const rail = moveCharacter({ x: 0, z: -41 }, { x: 20, z: 0 }, cycle);
  assert.ok(rail.x < 1, 'keep both wheels clear of the railing');
  assert.equal(isOnRoad(bikeStation, -0.1), false);
  assert.ok(trees.every(t => Math.hypot(t.x - bikeStation.x, t.z - bikeStation.z) > 3));
});
