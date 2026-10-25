import test from "node:test";
import assert from "node:assert/strict";
import { createEntryController } from "../lib/world-entry.ts";

test("crossing a doorway in the air opens only after landing inside", () => {
  const b = { id: "about", entry: { x: 0, z: 0, width: 1.9,
    inside: { x: 0, z: -0.65 }, outside: { x: 0, z: 1.5 } } };
  const entries = createEntryController([b]);
  entries.update({ x: 0, z: 0.1 });
  assert.equal(entries.update({ x: 0, z: -0.5 }, false), null);
  assert.equal(entries.update({ x: 0, z: -0.65 }, false), null);
  assert.equal(entries.update({ x: 0, z: -0.65 }, true), "about");
  assert.equal(entries.update({ x: 0, z: -0.65 }, true), null);
});
import { buildings } from "../lib/world-layout.ts";
test("every doorway opens once after crossing inward, then rearms only after leaving", () => {
  for (const b of buildings) {
    const c = createEntryController(buildings);
    assert.equal(c.update(b.entry.outside), null);
    assert.equal(c.update(b.entry.inside), b.id);
    assert.equal(c.update(b.entry.inside), null);
    assert.deepEqual(c.close(), b.entry.outside);
    assert.equal(c.update(b.entry.inside), null);
    c.update({ x: b.x + 4, z: b.entry.outside.z + 4 });
    c.update(b.entry.outside);
    assert.equal(c.update(b.entry.inside), b.id);
  }
});
test("being behind a building or restoring inside does not count as crossing its door", () => {
  const c = createEntryController(buildings),
    b = buildings[0];
  assert.equal(c.update(b.entry.inside), null);
  assert.equal(c.update({ x: b.x + 3, z: b.entry.inside.z }), null);
  assert.equal(c.update(b.entry.inside), null);
  assert.equal(c.close(), null);
});
