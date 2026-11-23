import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const bytes = geometry => Object.values(geometry.attributes).reduce((sum, a) => sum + a.array.byteLength, geometry.index?.array.byteLength ?? 0);

test('static batching retains triangles, UVs, normals and custom attributes with smaller indexed buffers', async () => {
  const { createStaticGeometryCache } = await import('../components/world/static-geometry.ts');
  const cache = createStaticGeometryCache(), source = new RoundedBoxGeometry(2, 1, .5, 2, .08);
  source.setAttribute('wetness', new THREE.Float32BufferAttribute(Array(source.attributes.position.count).fill(.7), 1));
  const original = source.clone(), first = cache.clone(source), second = cache.clone(source);
  assert.ok(first.index);
  assert.ok(bytes(first) < bytes(source) * .6);
  const expanded = first.toNonIndexed();
  for (const name of Object.keys(source.attributes)) {
    const actual = expanded.getAttribute(name).array, expected = source.getAttribute(name).array;
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) <= .000001, `${name}[${i}]`);
  }
  first.translate(3, 2, 1);
  assert.deepEqual(source.attributes.position.array, original.attributes.position.array);
  assert.notDeepEqual(first.attributes.position.array, second.attributes.position.array);
  let liveReleases = 0;
  first.addEventListener('dispose', () => { liveReleases++; });
  second.addEventListener('dispose', () => { liveReleases++; });
  cache.dispose();
  assert.equal(liveReleases, 0, 'scratch disposal must not dispose the live clones');
  [source, original, first, second, expanded].forEach(g => g.dispose());
});

test('existing indexes and material groups survive batching clones', async () => {
  const { createStaticGeometryCache } = await import('../components/world/static-geometry.ts');
  const cache = createStaticGeometryCache(), source = new THREE.BoxGeometry(1, 1, 1), clone = cache.clone(source);
  assert.deepEqual(clone.index.array, source.index.array);
  assert.deepEqual(clone.groups, source.groups);
  assert.notEqual(clone.attributes.position.array, source.attributes.position.array);
  cache.dispose(); source.dispose(); clone.dispose();
});

test('resource owners release only geometry no longer used by their scene', async () => {
  const { releaseUnusedGeometries } = await import('../components/world/static-geometry.ts');
  const root = new THREE.Scene(), live = new THREE.BoxGeometry(), unused = new THREE.PlaneGeometry(), points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0],3));
  root.add(new THREE.Mesh(live), new THREE.Mesh(live), new THREE.Points(points));
  const owned = new Set([live, unused, points]), released = [];
  for (const geometry of owned) geometry.addEventListener('dispose', () => released.push(geometry));
  releaseUnusedGeometries(root, owned); releaseUnusedGeometries(root, owned);
  assert.deepEqual([...owned], [live, points]);
  assert.deepEqual(released, [unused]);
  live.dispose(); points.dispose();
});

test('batch clones copy buffers without re-running procedural constructors', async () => {
  const { createStaticGeometryCache } = await import('../components/world/static-geometry.ts');
  let builds = 0;
  class ProceduralBox extends THREE.BoxGeometry {
    constructor() { super(2, 1, .5); builds++; }
  }
  const source = new ProceduralBox(), cache = createStaticGeometryCache();
  const first = cache.clone(source), second = cache.clone(source);
  assert.equal(builds, 1, 'cloning an existing indexed mesh must not regenerate its primitive');
  assert.deepEqual(first.attributes.position.array, source.attributes.position.array);
  assert.deepEqual(second.index.array, source.index.array);
  cache.dispose(); source.dispose(); first.dispose(); second.dispose();
});

test('town rounded boxes start indexed and preserve the original triangle attributes', async () => {
  const { createRoundedBox } = await import('../components/world/rounded-box.ts');
  for (const segments of [1, 2, 3]) for (const radius of [.025, .8]) {
    const args = [3, .7, 1.25, segments, radius];
    const source = new RoundedBoxGeometry(...args);
    const actual = createRoundedBox(...args);
    assert.ok(actual.index);
    assert.deepEqual(actual.groups, source.groups);
    const expanded = actual.toNonIndexed();
    for (const key of ['position', 'normal', 'uv']) {
      const expected = source.attributes[key].array;
      const values = expanded.attributes[key].array;
      assert.equal(values.length, expected.length);
      assert.ok(values.every((v, i) => Math.abs(v - expected[i]) < .000001), key);
    }
    const original = actual.attributes.position.array.slice();
    actual.translate(1, 2, 3);
    assert.deepEqual(createRoundedBox(...args).attributes.position.array, original);
  }
});
