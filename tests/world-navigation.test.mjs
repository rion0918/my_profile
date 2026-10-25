import test from "node:test";
import assert from "node:assert/strict";
import {
  isWalkable,
  findPath,
  restorePosition,
} from "../lib/world-navigation.ts";
import { buildings, obstacles } from "../lib/world-layout.ts";

const wall = [{ x: 0, z: 0, width: 3, depth: 3 }];
test("the town reaches a bounded coastline around the original districts", () => {
  assert.equal(isWalkable({ x: 34, z: 27 }, []), true);
  assert.equal(isWalkable({ x: 48, z: 0 }, []), false);
  assert.equal(isWalkable({ x: 0, z: 45 }, []), false);
});
test("A* crosses districts and avoids every wall along its segments", () => {
  const path = findPath({ x: -30, z: 0 }, { x: 30, z: 0 }, wall);
  assert.ok(path.length > 0);
  assert.deepEqual(path.at(-1), { x: 30, z: 0 });
  let previous = { x: -30, z: 0 };
  for (const p of path) {
    for (let t = 0; t <= 1; t += 0.05)
      assert.ok(
        isWalkable(
          {
            x: previous.x + (p.x - previous.x) * t,
            z: previous.z + (p.z - previous.z) * t,
          },
          wall,
        ),
      );
    previous = p;
  }
});
test("each building has a continuous walkable doorway and solid side walls", () => {
  for (const b of buildings) {
    assert.ok(b.entry, b.id);
    assert.equal(isWalkable(b.entry.inside, obstacles), true, b.id);
    const path = findPath({ x: 0, z: 6 }, b.entry.inside, obstacles);
    assert.ok(path.length, b.id);
    for (const p of path) assert.ok(isWalkable(p, obstacles), b.id);
    assert.equal(
      isWalkable({ x: b.x + b.width / 2, z: b.z }, obstacles),
      false,
      b.id,
    );
  }
});
test("blocked and out-of-world destinations are rejected", () => {
  assert.deepEqual(findPath({ x: -4, z: 0 }, { x: 0, z: 0 }, wall), []);
  assert.deepEqual(findPath({ x: -4, z: 0 }, { x: 100, z: 0 }, wall), []);
});
test("old island saves and invalid positions reset to the entrance", () => {
  for (const value of [
    null,
    "{",
    '{"version":1,"x":4,"z":3}',
    '{"version":2,"x":99,"z":0}',
    '{"version":2,"x":0,"z":0}',
  ])
    assert.deepEqual(restorePosition(value, wall), { x: 0, z: 31 });
  assert.deepEqual(restorePosition('{"version":5,"x":30,"z":3}', wall), {
    x: 30,
    z: 3,
  });
});

test("the coast admits a short wade and rejects deeper water, including tapped routes", async () => {
  const { coastPoint, distanceToShore, getGroundHeight } =
    await import("../lib/world-navigation.ts");
  // The north-facing harbor deck has its own traversal tests.
  for (const angle of [0, 0.6, 1.57, 2.4, 3.14, 4.4]) {
    const shore = coastPoint(angle),
      shallow = coastPoint(angle, 1.3),
      deep = coastPoint(angle, 3.5);
    assert.ok(Math.abs(distanceToShore(shore)) < 0.001);
    assert.equal(isWalkable(shallow, []), true);
    assert.equal(isWalkable(deep, []), false);
    assert.ok(getGroundHeight(shallow) < -0.3);
    const inland = coastPoint(angle, -4);
    assert.ok(findPath(inland, shallow, []).length);
    assert.deepEqual(findPath(inland, deep, []), []);
  }
});
test("movement uses the fixed running speed, slows in water, and cannot tunnel through walls or the coast", async () => {
  const { getMoveSpeed, moveCharacter, coastPoint } =
    await import("../lib/world-navigation.ts");
  assert.equal(getMoveSpeed(-4), 5);
  assert.equal(getMoveSpeed(1), 1.1);
  assert.ok(getMoveSpeed(1) < getMoveSpeed(-4));
  const moved = moveCharacter({ x: -3, z: 0 }, { x: 10, z: 0 }, wall);
  assert.ok(moved.x < -1.8);
  const beach = coastPoint(0, -1);
  const stopped = moveCharacter(beach, { x: 10, z: 0 }, []);
  assert.equal(isWalkable(stopped, []), true);
  assert.ok(stopped.x < coastPoint(0, 2.2).x);
});

test("the welcome landmark leaves the main promenade open at the old RION position", () => {
  for (let z = 6; z <= 16; z += 0.1)
    assert.equal(isWalkable({ x: 0.5, z }, obstacles), true, `promenade z=${z}`);
});
