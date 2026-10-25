import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function inspectPublishableFiles(directory) {
  const pages = [];
  if ((await lstat(directory)).isSymbolicLink()) throw new Error(`Refusing to publish symbolic link: ${directory}`);
  async function inspect(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (/^\.env|^\.(?:git|npmrc|netrc|vercel)$|\.(?:map|key|pem|p12|pfx)$/i.test(entry.name)) {
        throw new Error(`Refusing to publish sensitive file: ${path}`);
      }
      if (entry.isSymbolicLink()) throw new Error(`Refusing to publish symbolic link: ${path}`);
      if (entry.isDirectory()) await inspect(path);
      else if (entry.name.endsWith('.html')) pages.push(path);
    }
  }
  await inspect(directory);
  return pages;
}

export async function secureStaticExport(directory) {
  const pages = await inspectPublishableFiles(directory);
  if (!pages.length) throw new Error('No exported HTML pages found. Run next build first.');
  for (const path of pages) {
    const html = (await readFile(path, 'utf8')).replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/>/g, '');
    const hashes = new Set();
    for (const [, attributes, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (!/\bsrc\s*=/i.test(attributes)) {
        hashes.add(`'sha256-${createHash('sha256').update(source).digest('base64')}'`);
      }
    }
    const policy = [
      "default-src 'none'",
      `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].sort().join(' ')}`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "media-src 'self'",
      "connect-src 'self'",
      "worker-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "object-src 'none'",
      "frame-src 'none'",
    ].join('; ');
    // Keep charset first and enforce the policy before any script or resource tag.
    const head = /<head>(?:<meta charset="utf-8"\s*\/>)?/i;
    if (!head.test(html)) throw new Error(`Missing head in ${path}`);
    const secured = html.replace(head, match => `${match}<meta http-equiv="Content-Security-Policy" content="${policy}"/>`);
    await writeFile(path, secured);
  }
  return pages.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] === '--check-public') {
    await inspectPublishableFiles(resolve('public'));
    console.log('Public assets passed security inspection.');
  } else {
    const count = await secureStaticExport(resolve('out'));
    console.log(`Security policy added to ${count} static HTML pages.`);
  }
}
