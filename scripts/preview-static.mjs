import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, join } from 'node:path';

// Serve the hardened build with the same security headers as static hosting.
const directory = resolve('dist');
const headers = Object.fromEntries((await readFile(join(directory, '_headers'), 'utf8'))
  .split('\n').filter(line => /^  [\w-]+:/.test(line)).map(line => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
  }));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.txt': 'text/plain' };

http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const candidate = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!candidate.startsWith(directory + '/')) { response.writeHead(403); response.end(); return; }
    let file;
    for (const path of [candidate, candidate + '.html', join(candidate, 'index.html')]) {
      if (await stat(path).then(value => value.isFile(), () => false)) { file = path; break; }
    }
    const status = file ? 200 : 404;
    file ??= join(directory, '404.html');
    response.writeHead(status, { ...headers, 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch { response.writeHead(400); response.end(); }
}).listen(3001, '127.0.0.1', () => console.log('http://localhost:3001'));
