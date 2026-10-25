import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { worldQualitySettings } from '../lib/world-quality.ts';
import { createWater } from '../components/world/create-water.ts';
import { createWildlife } from '../components/world/create-wildlife.ts';

test('low settings reduce rendering work and keep the same resting animals', () => {
  const quality = worldQualitySettings.quality, low = worldQualitySettings.low;
  assert.equal(quality.shadows, true);
  assert.equal(low.shadows, false);
  assert.ok(low.pixelRatio < quality.pixelRatio);
  assert.equal(low.frameInterval ?? 0, 0, 'low mode must not cap movement below the display refresh rate');
  const scene = new THREE.Scene(), texture = new THREE.Texture();
  const wildlife = createWildlife(scene, texture);
  try {
    const cats = wildlife.selectable.slice();
    const positions = cats.map(cat => cat.position.clone());
    wildlife.update(0, quality.reducedEnvironment);
    wildlife.update(12, quality.reducedEnvironment);
    wildlife.update(13, low.reducedEnvironment);
    const tail = cats[0].getObjectByName('tail'), pose = tail.quaternion.clone();
    wildlife.update(30, low.reducedEnvironment);
    assert.ok(tail.quaternion.equals(pose));
    assert.deepEqual(wildlife.selectable, cats);
    cats.forEach((cat, i) => assert.ok(cat.position.equals(positions[i])));
    wildlife.update(40, quality.reducedEnvironment);
    assert.ok(!tail.quaternion.equals(pose), 'quality restores animation');
  } finally { wildlife.dispose(); texture.dispose(); }
});

test('turning off reflections skips scene captures without replacing water or pond geometry', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbcd4d3);
  const water = createWater(scene, [{ x: 0, z: 0, width: 4, depth: 3 }]);
  const objects = [...scene.children], geometry = [];
  scene.traverse(o => { if (o instanceof THREE.Mesh) geometry.push(o.geometry); });
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 600);
  camera.position.set(9, 12.8, -27); camera.lookAt(-3, .4, -47);
  let captures = 0;
  const renderer = {
    xr: { enabled: false }, shadowMap: { autoUpdate: true }, autoClear: true,
    state: { buffers: { depth: { setMask() {} } } },
    getSize: v => v.set(1440, 900), getRenderTarget: () => null, setRenderTarget() {},
    render: () => captures++,
  };
  try {
    water.setReflectionsEnabled(false);
    water.reflect(renderer, camera);
    assert.equal(captures, 0);
    assert.deepEqual(scene.children, objects);
    const after = []; scene.traverse(o => { if (o instanceof THREE.Mesh) after.push(o.geometry); });
    assert.deepEqual(after, geometry);
    water.setReflectionsEnabled(true);
    water.reflect(renderer, camera);
    assert.ok(captures > 0, 'quality restores reflections');
  } finally { water.dispose(); }
});

test('reflection shaders compile before exploration and restore the active render target', async () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbcd4d3);
  const water = createWater(scene, []), camera = new THREE.OrthographicCamera();
  const original = new THREE.WebGLRenderTarget(2, 2);
  let active = original, completed = false, compiled = 0;
  const renderer = {
    getRenderTarget: () => active,
    setRenderTarget: target => { active = target; },
    async compileAsync(actualScene, actualCamera) {
      compiled++;
      assert.equal(actualScene, scene); assert.equal(actualCamera, camera);
      assert.notEqual(active, original, 'compile the linear reflection target variant');
      await Promise.resolve(); completed = true;
    },
  };
  try {
    await water.prepare(renderer, camera);
    assert.equal(compiled, 1, 'both water levels use the same shader variant');
    assert.ok(completed); assert.equal(active, original);
    renderer.compileAsync = async () => { throw new Error('compile failed'); };
    await assert.rejects(water.prepare(renderer, camera), /compile failed/);
    assert.equal(active, original, 'failure also restores the target');
  } finally { water.dispose(); original.dispose(); }
});
