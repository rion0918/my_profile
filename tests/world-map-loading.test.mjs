import test from 'node:test';
import assert from 'node:assert/strict';
import { visitMeadow } from '../lib/world-meadow.ts';
import { distanceToShore } from '../lib/world-navigation.ts';
import { isOnRoad } from '../lib/world-layout.ts';
import { createWorldMapData } from '../lib/world-map-data.ts';

test('the static map endpoint exports the canonical geometry and hall metadata', async () => {
  const { GET, prerender } = await import('../src/pages/world-map.json.ts');
  assert.equal(prerender, true);
  const response = GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(createWorldMapData())));
});

test('preloading shares one map request, retries failure and keeps the successful result', async t => {
  const { loadWorldMap } = await import('../lib/world-map-loader.ts');
  let requests = 0;
  const map = { buildings: [{ id: 'history', name: 'Career' }], streets: { surface: [], curb: [] } };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/world-map.json');
    assert.notEqual(options?.cache, 'force-cache', 'new documents must revalidate a changed deployment');
    requests++;
    if (requests === 1) return new Response('Unavailable', { status: 503 });
    return Response.json(map);
  });
  await assert.rejects(loadWorldMap(), /503/);
  const pending = loadWorldMap();
  assert.equal(loadWorldMap(), pending);
  assert.deepEqual(await pending, map);
  assert.equal(await loadWorldMap(), await pending);
  assert.equal(requests, 2);
});

test('the built town map carries compact placement data for all 22,000 meadow plants', () => {
  const { meadow } = createWorldMapData();
  const mask = Buffer.from(meadow, 'base64');
  assert.ok(mask.length <= 10000 && mask.length > 0);
  const { count } = visitMeadow(
    attempt => Boolean(mask[attempt >> 3] & (1 << (attempt & 7))),
    (_, x, z) => {
      assert.ok(distanceToShore({ x, z }) <= -3.5);
      assert.ok(!isOnRoad({ x, z }, .35));
    },
  );
  assert.equal(count, 22000);
});
