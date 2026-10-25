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
const assets = new Set(['/models/rion-walker.glb', '/audio/bossa-antigua.mp3', '/images/projects/yoin/library.jpg', '/images/projects/pop-reminder/home.png']);
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
  if (path === '/') assert.ok(html.includes('worldToolbar') && html.includes('街の案内'), 'latest 3D world is not published');
  if (path === '/projects/pop-reminder') assert.ok(html.includes('ふわっと。'), 'product display name is outdated');
  console.log(`PASS ${response.status} ${path}: headers and HTML scripts`);
}
for (const path of assets) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  assert.notEqual(response.headers.get('content-type')?.split(';')[0], 'text/html', `${path}: asset returned HTML`);
  assert.ok((await response.arrayBuffer()).byteLength > 0, `${path}: empty asset`);
}
console.log(`PASS ${assets.size} production assets`);
