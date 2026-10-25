export const gamingPC = {
  x: 10, z: -11, width: 8.8, depth: 6.4, height: 7.2,
  caseWidth: 6.78, caseDepth: 4.22, plinthHeight: .48,
  approach: { x: 11.8, z: -6.6 },
  specBoard: { x: 3.9, z: -10, width: 3.2, depth: .75, height: 4.4, rotation: Math.atan2(12, 20) },
};

export const gamingPCSpecs = [
  { label: 'CPU', value: 'Ryzen 7 5700X' },
  { label: 'GPU', value: 'RTX 3070 Ti' },
  { label: 'メモリ', value: '32 GB' },
  { label: 'ストレージ', value: '1 TB' },
];

export function isGamingPCClearing(p: { x: number; z: number }, margin = 0) {
  const dx = p.x - gamingPC.x, dz = p.z - gamingPC.z;
  const board = gamingPC.specBoard, bx = p.x - board.x, bz = p.z - board.z;
  const c = Math.cos(board.rotation), s = Math.sin(board.rotation);
  const along = (dx * 12 + dz * 20) / Math.hypot(12, 20);
  const across = (dx * 20 - dz * 12) / Math.hypot(12, 20);
  return (Math.abs(dx) < gamingPC.width / 2 + margin && Math.abs(dz) < gamingPC.depth / 2 + margin) ||
    (Math.abs(bx * c - bz * s) < board.width / 2 + margin && Math.abs(bx * s + bz * c) < board.depth / 2 + margin) ||
    (along > 0 && along < 10 + margin && Math.abs(across) < 3.7 + margin);
}
