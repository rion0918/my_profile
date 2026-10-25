export const pastaKitchen = {
  name: 'パスタキッチン', x: -7.2, z: -13.6, width: 8.4, depth: 7.6,
  approach: { x: -4.1, z: -8.5 },
};

export function isPastaClearing(p: {x:number;z:number}, margin = 0) {
  const dx = p.x - pastaKitchen.x, dz = p.z - pastaKitchen.z;
  const along = (dx * 12 + dz * 20) / Math.hypot(12, 20), across = (dx * 20 - dz * 12) / Math.hypot(12, 20);
  return (Math.abs(dx) < pastaKitchen.width / 2 + margin && Math.abs(dz) < pastaKitchen.depth / 2 + margin) ||
    (along > 0 && along < 8 + margin && Math.abs(across) < 3.7 + margin);
}
