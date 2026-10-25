export const harbor = {
  entry: { x: 0, z: -30.4 },
  destination: { x: 0, z: -46 },
  lighthouse: { x: -6.7, z: -46 },
  hut: { x: 6.2, z: -46 },
};
export const harborDecks = [
  { x: 0, z: -32.9, width: 4, depth: 7.2, ramp: true },
  { x: 0, z: -40.8, width: 4, depth: 10, ramp: false },
  { x: 0, z: -46, width: 17.6, depth: 3.8, ramp: false },
];
export function getHarborDeckHeight(p: { x: number; z: number }, inset = 0): number | null {
  if (!harborDecks.some((d) => Math.abs(p.x - d.x) <= d.width / 2 - inset + 0.000001 &&
    Math.abs(p.z - d.z) <= d.depth / 2 - inset + 0.000001)) return null;
  const start = harborDecks[0].z + harborDecks[0].depth / 2;
  const end = harborDecks[1].z + harborDecks[1].depth / 2;
  const t = Math.max(0, Math.min(1, (start - p.z) / (start - end)));
  return 0.08 + 0.34 * t * t * (3 - 2 * t);
}
export const harborRails = [
  { a: [-1.88, -31.8], b: [-1.88, -44.12] },
  { a: [1.88, -31.8], b: [1.88, -44.12] },
  { a: [-8.66, -44.24], b: [-2, -44.24] },
  { a: [2, -44.24], b: [8.66, -44.24] },
  { a: [-8.66, -47.76], b: [8.66, -47.76] },
  { a: [-8.66, -44.24], b: [-8.66, -47.76] },
  { a: [8.66, -44.24], b: [8.66, -47.76] },
];
export const harborBoats = [
  { x: -4.9, z: -41, length: 4.8, width: 2.1, rotation: -0.035, color: 0xed8c80, sail: false },
  { x: 4.9, z: -41.1, length: 4.8, width: 1.9, rotation: 0.045, color: 0x43b5af, sail: true },
];
export const harborCargo = [
  { x: 4.2, z: -46.8, width: 0.58, depth: 0.58, barrel: false },
  { x: -5.25, z: -47, width: 0.58, depth: 0.58, barrel: false },
  { x: 7.8, z: -44.8, width: 0.58, depth: 0.58, barrel: false },
  { x: -4.2, z: -44.75, width: 0.54, depth: 0.54, barrel: true },
  { x: 4.1, z: -44.75, width: 0.54, depth: 0.54, barrel: true },
];
export const harborLights = [-3.2, 3.2].map((x) => ({ x, z: -47.3, width: 0.25, depth: 0.25 }));
export const harborObstacles = [
  ...harborLights,
  ...harborCargo,
  ...harborRails.map(({ a, b }) => ({
    x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2,
    width: Math.abs(a[0] - b[0]) + 0.12, depth: Math.abs(a[1] - b[1]) + 0.12,
  })),
  { ...harbor.lighthouse, width: 1.8, depth: 1.8 },
  { ...harbor.hut, width: 2.7, depth: 2.5 },
  ...harborBoats.map((b) => ({ x: b.x, z: b.z, width: b.width + 0.2, depth: b.length + 0.2 })),
  ...[-2.75, 2.75].map((x) => ({ x, z: -29.3, width: 0.32, depth: 0.32 })),
];
