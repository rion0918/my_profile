import test from 'node:test';
import assert from 'node:assert/strict';
import { enterWorld, readingPosition } from '../lib/reading-position.ts';

test('reading position round trips query/hash and rejects external or invalid saved locations', async t => {
  const keys = ['sessionStorage', 'location', 'window'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const data = new Map();
  for (const [key, value] of Object.entries({
    sessionStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) },
    location: new URL('https://riomaru.jp/profile?source=work#career'),
    window: { scrollY: 640 },
  })) Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => keys.forEach((key, i) => {
    if (descriptors[i]) Object.defineProperty(globalThis, key, descriptors[i]);
    else delete globalThis[key];
  }));

  enterWorld();
  assert.equal(data.get('portfolio-welcome-v4'), 'seen');
  assert.deepEqual(readingPosition(), { href: '/profile?source=work#career', y: 640 });
  for (const href of ['//outside.invalid', '/\\outside.invalid', 'javascript:alert(1)', '/world', '/?detail=yoin', '/?mode=world']) {
    data.set('portfolio-reading-position', JSON.stringify({ href, y: 640 }));
    assert.equal(readingPosition(), null, href);
  }
  for (const value of ['broken JSON', '{}', '{"href":"/profile","y":-1}']) {
    data.set('portfolio-reading-position', value);
    assert.equal(readingPosition(), null, value);
  }
  globalThis.sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
  assert.equal(readingPosition(), null);
});
