import test from "node:test";
import assert from "node:assert/strict";
import { CatmullRomCurve3, Vector3 } from "three";
import { trees, roads, buildings, isOnRoad } from "../lib/world-layout.ts";
import { getGroundHeight } from "../lib/world-navigation.ts";

test("tree trunks and flower beds are rooted on level land rather than floating over the beach slope", () => {
  for (const tree of trees) assert.equal(getGroundHeight(tree), 0);
});

test("tree crowns and their flower beds stay clear of curved roads, the plaza and entrances", () => {
  const conflicts = [];
  for (const tree of trees) {
    for (const road of roads) {
      const curve = new CatmullRomCurve3(
        road.points.map(([x, z]) => new Vector3(x, 0, z)), road.closed,
      );
      if (curve.getPoints(1000).some((p) =>
        Math.hypot(p.x - tree.x, p.z - tree.z) < road.width / 2 + 2.25,
      )) conflicts.push(`road: ${tree.x},${tree.z}`);
    }
    assert.ok(Math.hypot(tree.x, tree.z) >= 6.05, "plaza planting clearance");
    for (const building of buildings) {
      assert.ok(
        Math.hypot(tree.x - building.entry.x, tree.z - building.entry.z) > 3.3,
        `${building.id} entrance planting clearance`,
      );
    }
  }
  assert.deepEqual(conflicts, []);
});

test("grass clearance includes the full width of every curved street and approach", () => {
  for (const road of roads) {
    const curve = new CatmullRomCurve3(
      road.points.map(([x, z]) => new Vector3(x, 0, z)), road.closed,
    );
    for (let i = 0; i <= 100; i++) {
      const p = curve.getPoint(i / 100), tangent = curve.getTangent(i / 100);
      for (const side of [-1, 1]) {
        const distance = road.width / 2 + 0.3;
        assert.equal(isOnRoad({
          x: p.x - tangent.z * distance * side,
          z: p.z + tangent.x * distance * side,
        }, 0.35), true, `grass at road ${roads.indexOf(road)}, sample ${i}`);
      }
    }
  }
  assert.equal(isOnRoad({ x: -36, z: -28 }, 0.35), false);
});
