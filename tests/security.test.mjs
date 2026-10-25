import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { secureStaticExport } from '../scripts/secure-static-export.mjs';

test('static pages allow only their own inline scripts, including exact Unicode and whitespace', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'portfolio-security-'));
  const scripts = ['self.__next_f=[];', 'self.__next_f.push("橋本怜苑");\n'];
  try {
    await mkdir(join(dir, 'projects'));
    const page = script => `<!DOCTYPE html><html><head><meta charSet="utf-8"/><script src="/_next/app.js"></script></head><body><script>${script}</script></body></html>`;
    await writeFile(join(dir, 'index.html'), page(scripts[0]));
    await writeFile(join(dir, 'projects/yoin.html'), page(scripts[1]));
    await secureStaticExport(dir);
    for (const [i, name] of ['index.html', 'projects/yoin.html'].entries()) {
      const html = await readFile(join(dir, name), 'utf8');
      const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
      assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'));
      assert.ok(html.indexOf('charSet="utf-8"') < 1024);
      const expected = createHash('sha256').update(scripts[i]).digest('base64');
      const other = createHash('sha256').update(scripts[1 - i]).digest('base64');
      assert.ok(policy.includes(`'sha256-${expected}'`));
      assert.ok(!policy.includes(`'sha256-${other}'`));
      const scriptPolicy = policy.split(';').find(d => d.trim().startsWith('script-src '));
      assert.ok(scriptPolicy.includes("'self'"));
      assert.ok(scriptPolicy.includes("'wasm-unsafe-eval'"), 'bicycle physics remains available');
      assert.ok(!scriptPolicy.includes("'unsafe-inline'"));
      assert.ok(!scriptPolicy.includes("'unsafe-eval'"));
      assert.ok(policy.includes("base-uri 'none'"));
      assert.ok(policy.includes("object-src 'none'"));
      assert.ok(policy.includes("form-action 'none'"));
      assert.ok(policy.includes("connect-src 'self'"));
      assert.ok(!policy.includes('frame-ancestors'), 'frame protection belongs in HTTP headers');
      assert.ok(html.includes(`<script>${scripts[i]}</script>`), 'hydration scripts stay intact');
    }
    const before = await readFile(join(dir, 'index.html'), 'utf8');
    await secureStaticExport(dir);
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('the export hardening step fails for missing HTML or accidentally published secrets/source maps', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'portfolio-security-'));
  try {
    await assert.rejects(secureStaticExport(dir), /HTML/);
    await writeFile(join(dir, 'index.html'), '<html><head></head></html>');
    for (const name of ['.env.local', 'server.key', 'bundle.js.map']) {
      await writeFile(join(dir, name), 'test fixture');
      await assert.rejects(secureStaticExport(dir), /公開|publish|sensitive/i);
      await rm(join(dir, name));
    }
    await writeFile(join(dir, 'index.html'), '<html><body>missing head</body></html>');
    await assert.rejects(secureStaticExport(dir), /head/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('static hosting headers prevent embedding, MIME sniffing, referrer leaks and unused device access', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /^\/\*/m);
  assert.match(headers, /Content-Security-Policy: frame-ancestors 'none'/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Referrer-Policy: no-referrer/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  assert.match(headers, /Permissions-Policy: .*camera=\(\).*geolocation=\(\).*microphone=\(\)/);
});

test('local environment files and private keys are excluded from version control', () => {
  const result = execFileSync('git', ['check-ignore', '--no-index', '.env', '.env.local', '.env.production', 'private.key', 'certificate.pem'], { encoding: 'utf8' });
  assert.equal(result.trim().split('\n').length, 5);
});
