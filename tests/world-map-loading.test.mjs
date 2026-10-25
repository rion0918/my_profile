import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldMapData } from '../lib/world-map-data.ts';

test('the static map endpoint exports the canonical geometry and hall metadata', async () => {
  const { GET, dynamic } = await import('../app/world-map.json/route.ts');
  assert.equal(dynamic, 'force-static');
  const response = GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(createWorldMapData())));
});

test('preloading shares one map request, retries failure and keeps the successful result', async t => {
  const { loadWorldMap } = await import('../lib/world-map-loader.ts');
  let requests = 0;
  const map = { buildings: [{ id: 'history', name: 'Background' }], streets: { surface: [], curb: [] } };
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
