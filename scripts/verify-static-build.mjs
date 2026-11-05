import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { products } from '../lib/products.ts';
import { createWorldMapData } from '../lib/world-map-data.ts';

const directory = resolve('dist');
const normalRoutes = ['index', 'profile', 'about', 'career', 'tech', 'social', ...products.map(product => `projects/${product.slug}`)];
const graph = new Map();
async function staticImports(path) {
  if (graph.has(path)) return;
  const source = await readFile(path, 'utf8');
  graph.set(path, source);
  for (const match of source.matchAll(/\b(?:from\s*|import\s*)["'`]([^"'`]+)["'`]/g)) {
    if (match[1].startsWith('.')) await staticImports(resolve(dirname(path), match[1]));
  }
}

for (const route of [...normalRoutes, 'world', '404']) {
  const html = await readFile(resolve(directory, route + '.html'), 'utf8');
  assert.ok(html.indexOf('charset="utf-8"') < html.indexOf('Content-Security-Policy'));
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'));
  assert.match(html, /content="no-referrer"/);
  if (normalRoutes.includes(route)) {
    assert.doesNotMatch(html, /<astro-island\b|__next_f|\/_next\//, route);
    assert.match(html, /<h1[\s>]/, route);
    const product = products.find(item => route === `projects/${item.slug}`);
    const sharingTitle = product ? `${product.name} | 橋本怜苑` : '橋本怜苑 | Student Engineer';
    assert.ok(html.includes(`name="twitter:title" content="${sharingTitle}"`), `${route}: Twitter title changed`);
    assert.ok(html.includes(`property="og:title" content="${sharingTitle}"`), `${route}: Open Graph title changed`);
    assert.ok(html.includes(`name="twitter:card" content="${product ? 'summary' : 'summary_large_image'}"`), `${route}: Twitter card changed`);
    for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) await staticImports(resolve(directory, '.' + src));
  }
  for (const [, src] of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)"/g)) assert.ok((await stat(resolve(directory, '.' + src))).isFile(), `${route}: missing ${src}`);
}
for (const [path, source] of graph) {
  assert.doesNotMatch(path, /WorldApp|WorldCanvas|world-bike-physics|\/react[.-]/, 'World code is in the normal static import graph');
  assert.doesNotMatch(source, /react\.transitional\.element|react\.element/, 'React runtime is in the normal static import graph');
}
assert.deepEqual(JSON.parse(await readFile(resolve(directory, 'world-map.json'), 'utf8')), JSON.parse(JSON.stringify(createWorldMapData())));
const html = await readFile(resolve(directory, 'index.html'));
const css = [...(html.toString().matchAll(/<link[^>]+href="([^"]+\.css)"/g))].map(match => match[1]);
const styles = await Promise.all(css.map(path => readFile(resolve(directory, '.' + path))));
assert.ok(!styles.some(style => /\.worldSurface|\.worldToolbar|\.hallDialog/.test(style.toString())), 'World CSS is sent on the normal page');
console.log(JSON.stringify({ normalRoutes: normalRoutes.length, staticMap: true, normalReactRuntime: false, normalJs: [...graph.values()].reduce((total, source) => total + Buffer.byteLength(source), 0), normalJsGzip: [...graph.values()].reduce((total, source) => total + gzipSync(source).byteLength, 0), normalCss: styles.reduce((total, style) => total + style.byteLength, 0), normalHtml: html.byteLength }, null, 2));
