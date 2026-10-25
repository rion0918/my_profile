import test from "node:test";
import assert from "node:assert/strict";
import { CatmullRomCurve3, Vector3 } from "three";
import { buildStreetNetwork, containsStreetPoint } from "../lib/street-network.ts";

const curve = (points) => new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)));
test("crossing streets form one pavement with curbs only along its outside edge", () => {
  const network = buildStreetNetwork([
    { curve: curve([[-10, 0], [0, 0], [10, 0]]), width: 3 },
    { curve: curve([[0, -10], [0, 0], [0, 10]]), width: 3 },
  ], { x: 0, z: 0, radius: 3.8 });
  assert.equal(network.surface.length, 1);
  for (const p of [[0, 0], [1.5, 1.5], [1.5, 0], [0, 1.5], [8, 0]]) {
    assert.equal(containsStreetPoint(network.surface, ...p), true);
    assert.equal(containsStreetPoint(network.curb, ...p), false, "no curb across an intersection");
  }
  assert.equal(containsStreetPoint(network.curb, 8, 1.6), true);
  assert.equal(containsStreetPoint(network.surface, 8, 2), false);
});

test("a closed promenade retains its unpaved center and joins a radial street", () => {
  const ring = new CatmullRomCurve3(Array.from({ length: 32 }, (_, i) => {
    const a = i / 32 * Math.PI * 2;
    return new Vector3(Math.cos(a) * 20, 0, Math.sin(a) * 20);
  }), true);
  const network = buildStreetNetwork([
    { curve: ring, width: 2.2 },
    { curve: curve([[0, 0], [10, 0], [20, 0]]), width: 3 },
  ], { x: 0, z: 0, radius: 3.8 });
  assert.equal(network.surface.length, 1);
  assert.equal(containsStreetPoint(network.surface, 0, 20), true);
  assert.equal(containsStreetPoint(network.surface, 8, 8), false);
  assert.equal(containsStreetPoint(network.curb, 20, 0), false);
});

test("inside junction corners have a gentle fillet instead of pointed grass wedges", () => {
  const network = buildStreetNetwork([
    { curve: curve([[-10, 0], [10, 0], [20, 0]]), width: 3 },
    { curve: curve([[8, -10], [8, 0], [8, 10]]), width: 3 },
  ], { x: 0, z: 0, radius: 3.8 });
  assert.equal(containsStreetPoint(network.surface, 9.65, 1.65), true);
  assert.equal(containsStreetPoint(network.curb, 9.65, 1.65), false);
});
