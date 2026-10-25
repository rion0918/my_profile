import test from "node:test";
import assert from "node:assert/strict";
import { createJumpController } from "../lib/world-jump.ts";

test("a jump rises, falls and lands at ground level without a second midair jump", () => {
  const jump = createJumpController();
  assert.equal(jump.start(), true);
  let peak = 0;
  for (let i = 0; i < 90; i++) {
    jump.update(1 / 60);
    peak = Math.max(peak, jump.height);
    assert.ok(jump.height >= 0);
    if (i === 10) assert.equal(jump.start(), false);
  }
  assert.ok(peak > 0.75 && peak < 1.1);
  assert.equal(jump.airborne, false);
  assert.equal(jump.height, 0);
  assert.equal(jump.start(), true);
});

test("zero time and a pause preserve the jump; resetting cancels it cleanly", () => {
  const jump = createJumpController();
  jump.start();
  jump.update(0.1);
  const height = jump.height;
  jump.update(0);
  assert.equal(jump.height, height);
  jump.reset();
  assert.equal(jump.height, 0);
  assert.equal(jump.airborne, false);
  jump.update(1);
  assert.equal(jump.height, 0);
});
