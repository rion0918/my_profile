import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

export const prerender = true;

export async function GET() {
  const model = await readFile(new URL('../../../public/models/rion-walker.glb', import.meta.url));
  return new Response(new Uint8Array(gzipSync(model, { level: 9 })), {
    headers: { 'Content-Type': 'application/gzip' },
  });
}
