import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorldTime } from '../lib/world-time.ts';

const at = (hour, minute = 0, second = 0) => getWorldTime(new Date(2026, 9, 24, hour, minute, second));

test('local clock drives bright noon, warm sunset and a readable illuminated night', () => {
  const noon = at(12), sunset = at(18), night = at(0);
  assert.ok(noon.sunIntensity > sunset.sunIntensity && sunset.sunIntensity > night.sunIntensity);
  assert.ok(night.ambientIntensity >= 0.5, 'keep paths and the rider visible at night');
  assert.equal(noon.lamps, 0);
  assert.equal(night.lamps, 1);
  assert.ok(sunset.lamps > 0 && sunset.lamps < 1);
  const red = color => color >> 16 & 255, blue = color => color & 255;
  assert.ok(red(sunset.sky) > blue(sunset.sky), 'sunset has a warm sky');
  assert.ok(blue(night.sky) > red(night.sky), 'night has a blue sky');
  assert.ok(noon.waterLight > night.waterLight);
});

test('dawn, dusk and midnight blend without discontinuities', () => {
  for (const hour of [0, 5, 6, 8, 12, 16, 18, 19.5, 21, 24]) {
    const before = getWorldTime(new Date(2026, 9, 24, 0, 0, hour * 3600 - 1));
    const after = getWorldTime(new Date(2026, 9, 24, 0, 0, hour * 3600 + 1));
    for (const key of ['ambientIntensity', 'sunIntensity', 'fillIntensity', 'lamps', 'waterLight'])
      assert.ok(Math.abs(before[key] - after[key]) < 0.005, `${key} at ${hour}`);
    for (const key of ['sky', 'skyLight', 'groundLight', 'sunColor', 'fillColor'])
      for (const shift of [0, 8, 16])
        assert.ok(Math.abs((before[key] >> shift & 255) - (after[key] >> shift & 255)) <= 1, `${key} at ${hour}`);
  }
});

test('time varies during an open visit and repeats on the next local day', () => {
  assert.notDeepEqual(at(17), at(17, 30));
  assert.notEqual(at(8).sunX, at(16).sunX);
  assert.deepEqual(at(12), getWorldTime(new Date(2026, 9, 25, 12)));
  for (let minute = 0; minute < 1440; minute++) {
    const state = getWorldTime(new Date(2026, 9, 24, 0, minute));
    assert.ok(Object.values(state).every(Number.isFinite));
    assert.ok(state.lamps >= 0 && state.lamps <= 1);
  }
});
