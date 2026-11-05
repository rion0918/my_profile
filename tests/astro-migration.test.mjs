import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Astro builds static pages and hydrates only the world island', async () => {
  const config = await read('astro.config.mjs');
  assert.match(config, /output: ["']static["']/);
  assert.match(await read('src/pages/world.astro'), /client:only="react"/);
  const home = await read('src/components/ProfilePage.astro');
  assert.doesNotMatch(home, /client:(load|idle|visible|only)/);
  assert.match(await read("src/components/ModeBar.astro"), /href="\/world"/);
  const pkg = JSON.parse(await read('package.json'));
  assert.ok(pkg.dependencies.astro);
  assert.ok(!pkg.dependencies.next);
});

test('normal page navigation loads world prefetch code only on explicit interest', async () => {
  const script = await read('src/scripts/navigation.ts');
  assert.match(script, /pointerover/);
  assert.match(script, /focusin/);
  assert.match(script, /import\(["']\.\.\/\.\.\/lib\/world-preload["']\)/);
  assert.doesNotMatch(script, /requestIdleCallback|setTimeout\([^)]*preloadWorld/);
});

test('Astro output preserves a per-document CSP through client navigation', async () => {
  const script = await read('src/scripts/navigation.ts');
  assert.match(script, /astro:before-swap/);
  assert.match(script, /Content-Security-Policy/);
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.scripts.build, /secure-static-export/);
  assert.equal(JSON.parse(await read('vercel.json')).outputDirectory, 'dist');
});
