import test from "node:test";
import assert from "node:assert/strict";
import { harbor, harborDecks, harborObstacles, getHarborDeckHeight } from "../lib/world-harbor.ts";
import { findPath, isWalkable, moveCharacter, getWalkingHeight, getMoveSpeed, distanceToShore, restorePosition } from "../lib/world-navigation.ts";
import { obstacles } from "../lib/world-layout.ts";

test("the harbor pier is reachable from town and every route segment stays on a walkable surface", () => {
  const start = { x: 0, z: 6 };
  for (const target of [harbor.destination, { x: -4.5, z: -46 }, { x: 3.5, z: -46 }]) {
    const path = findPath(start, target, obstacles);
    assert.ok(path.length, `route to ${target.x},${target.z}`);
    let previous = start;
    for (const p of path) {
      for (let i = 0; i <= 30; i++) assert.equal(isWalkable({
        x: previous.x + (p.x - previous.x) * i / 30,
        z: previous.z + (p.z - previous.z) * i / 30,
      }, obstacles), true);
      previous = p;
    }
  }
});

test("deck height follows the access ramp, stays above water and retains land movement speed", () => {
  assert.notEqual(getHarborDeckHeight({ x: 0, z: -35.8 + 6.5 }), null, "a rounded endpoint remains part of the closed deck");
  let previous = 0;
  for (let z = -29.5; z >= -47; z -= 0.1) {
    const p = { x: 0, z };
    const height = getWalkingHeight(p);
    assert.ok(height >= 0.07 && height <= 0.43);
    assert.ok(Math.abs(height - previous) < 0.1, "no abrupt height changes");
    previous = height;
  }
  const p = harbor.destination;
  assert.ok(distanceToShore(p) > 3);
  assert.equal(getMoveSpeed(false, distanceToShore(p), true), getMoveSpeed(false, -4));
  assert.equal(getMoveSpeed(true, distanceToShore(p), true), getMoveSpeed(true, -4));
  assert.equal(getHarborDeckHeight({ x: 6, z: -41 }), null);
  assert.ok(harborDecks.length >= 3);
});

test("railings and deck boundaries stop dashing and deep water remains blocked beside the pier", () => {
  for (const target of [{ x: 3, z: -41 }, { x: 0, z: -49.5 }, { x: 10, z: -46 }])
    assert.equal(isWalkable(target, obstacles), false);
  const side = moveCharacter({ x: 0, z: -41 }, { x: 15, z: 0 }, obstacles);
  assert.ok(side.x < 1.7);
  const end = moveCharacter(harbor.destination, { x: 0, z: -15 }, obstacles);
  assert.ok(end.z > -47.6);
  assert.ok(harborObstacles.every((o) => !isWalkable(o, obstacles)));
  assert.deepEqual(restorePosition(JSON.stringify({ version: 5, ...harbor.destination }), obstacles), harbor.destination);
});
