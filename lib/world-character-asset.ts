import { FileLoader } from 'three';

let pending: Promise<ArrayBuffer> | undefined;
async function fetchWalker() {
  const compressed = typeof DecompressionStream !== 'undefined';
  const url = compressed ? '/models/rion-walker.glb.gz' : '/models/rion-walker.glb';
  const bytes = await new FileLoader<ArrayBuffer>().setResponseType('arraybuffer').loadAsync(url);
  // Some static hosts already decode gzip in the HTTP layer.
  const header = new Uint8Array(bytes, 0, 2);
  if (header[0] !== 0x1f || header[1] !== 0x8b) return bytes;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

export function loadWalkerBytes() {
  pending ??= fetchWalker().catch(error => { pending = undefined; throw error; });
  return pending;
}
