import test from "node:test";
import assert from "node:assert/strict";
import { benches, streetlights, lightSupports, roads, roadCurves, buildings, plaza, entrancePlaza, isOnRoad } from "../lib/world-layout.ts";
import { distanceToShore, isWalkable, getGroundHeight } from "../lib/world-navigation.ts";
import { buildStreetNetwork, containsStreetPoint } from "../lib/street-network.ts";

test("benches sit beside the pavement and leave the streets and plaza open", () => {
  assert.ok(benches.length >= 6);
  for (const bench of benches)
    assert.equal(isOnRoad(bench, 0.25), false, `bench at ${bench.x},${bench.z}`);
});

test("furniture footprints clear the pavement and face the closest street", () => {
  for (const item of [...benches, ...streetlights]) {
    const c = Math.cos(item.rotation), s = Math.sin(item.rotation);
    for (const x of [-1, 0, 1]) for (const z of [-1, 0, 1])
      assert.equal(isOnRoad({ x: item.x + c * x * item.width / 2 + s * z * item.depth / 2,
        z: item.z - s * x * item.width / 2 + c * z * item.depth / 2 }, 0.1), false);
    assert.equal(getGroundHeight(item), 0, "furniture has a level, dry footing");
    if (streetlights.includes(item)) continue;
    let nearest = { distance: Infinity };
    roadCurves.forEach((curve, index) => {
      for (const p of curve.getPoints(1000)) {
        const distance = Math.hypot(p.x - item.x, p.z - item.z);
        if (distance < nearest.distance) nearest = { distance, p, index };
      }
    });
    assert.ok(nearest.distance < roads[nearest.index].width / 2 + 1.1, "near the street edge");
    const dx = (nearest.p.x - item.x) / nearest.distance, dz = (nearest.p.z - item.z) / nearest.distance;
    const front = benches.includes(item) ? [-c, s] : [s, c];
    assert.ok(dx * front[0] + dz * front[1] > 0.98, "faces the street");
  }
});

test("all streets join a dry coastal promenade and retain open building approaches", () => {
  const network = buildStreetNetwork(roads.map((r, i) => ({ curve: roadCurves[i], width: r.width })), plaza, [entrancePlaza]);
  assert.equal(network.surface.length, 1, "one connected pavement network");
  const coast = roads.findIndex((r) => r.closed);
  assert.ok(coast >= 0);
  for (let i = 0; i < roadCurves.length; i++)
    for (const p of roadCurves[i].getPoints(200)) {
      assert.ok(distanceToShore(p) < -3 - roads[i].width / 2, "the full road width remains on dry ground");
      for(let a=0;a<8;a++)assert.equal(getGroundHeight({
        x:p.x+Math.cos(a*Math.PI/4)*roads[i].width/2,
        z:p.z+Math.sin(a*Math.PI/4)*roads[i].width/2,
      }),0,'the rerouted promenade stays above the beach slope across its full width');
      assert.equal(containsStreetPoint(network.surface, p.x, p.z), true);
      assert.equal(containsStreetPoint(network.curb, p.x, p.z), false);
    }
  for (const b of buildings) {
    assert.equal(containsStreetPoint(network.surface, b.entry.outside.x, b.entry.outside.z), true);
    assert.equal(containsStreetPoint(network.surface, b.entry.inside.x, b.entry.inside.z), true);
  }
  for (const pole of lightSupports) {
    assert.equal(isOnRoad(pole, 0.25), false);
    assert.equal(getGroundHeight(pole), 0);
    assert.equal(isWalkable(pole, buildings.map((b) => ({ ...b }))), true);
  }
});
