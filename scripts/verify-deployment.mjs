import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const origin = new URL(process.argv[2]);
const pages = ['/', '/profile', '/about', '/career', '/social', '/tech', '/projects/yoin', '/projects/pop-reminder', '/deployment-missing-page'];
const headers = {
  'content-security-policy': "frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
};
const assets = new Set(['/world-map.json', '/models/rion-walker.glb', '/audio/bossa-antigua.mp3', '/images/world-preview.jpg', '/images/projects/yoin/library.jpg', '/images/projects/pop-reminder/home.png', '/textures/onsen/stone-color.webp', '/textures/onsen/stone-normal.webp', '/textures/onsen/stone-arm.webp']);
for (const path of pages) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, path.includes('missing-page') ? 404 : 200, path);
  for (const [key, value] of Object.entries(headers)) assert.equal(response.headers.get(key), value, `${path}: ${key}`);
  assert.match(response.headers.get('strict-transport-security') ?? '', /max-age=\d+/);
  const html = await response.text();
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1];
  assert.ok(policy, `${path}: exported HTML security policy missing`);
  for (const [, attributes, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const external = attributes.match(/\bsrc="([^"]+)"/i)?.[1];
    if (external) { assert.equal(new URL(external, origin).origin, origin.origin); assets.add(external); }
    else assert.ok(policy.includes(`'sha256-${createHash('sha256').update(source).digest('base64')}'`), `${path}: hydration script blocked by its CSP`);
  }
  if (path === '/') assert.ok(html.includes('id="career"') && html.includes('id="products"') && html.includes('href="/?mode=world"'), 'readable portfolio and 3D entry are not published');
  if (path === '/projects/pop-reminder') assert.ok(html.includes('ふわっと。'), 'product display name is outdated');
  console.log(`PASS ${response.status} ${path}: headers and HTML scripts`);
}
for (const path of assets) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  assert.notEqual(response.headers.get('content-type')?.split(';')[0], 'text/html', `${path}: asset returned HTML`);
  const body = await response.arrayBuffer();
  assert.ok(body.byteLength > 0, `${path}: empty asset`);
  if (path === '/world-map.json') {
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    const map = JSON.parse(Buffer.from(body).toString('utf8'));
    assert.ok(map.streets?.surface?.length && map.buildings?.length, 'street geometry or hall metadata is missing');
  }
}
console.log(`PASS ${assets.size} production assets`);
