export const onsen = {
  name: '木もれびの湯',
  x: -19, z: -25, width: 16, depth: 8,
  entry: { x: -19.4, z: -20.3 },
  outdoor: { x: -19.4, z: -24.7 },
  indoor: { x: -14.6, z: -23.2 },
  bathhouse: { x: -14.6, z: -25, width: 6.4, depth: 6.6 },
  outdoorBath: { x: -23.4, z: -25.4, width: 6.2, depth: 4.6 },
  indoorBath: { x: -14.6, z: -26.25, width: 4.9, depth: 2.9 },
};

export function isOnsenClearing(point: { x: number; z: number }, margin = 0) {
  return (Math.abs(point.x - onsen.x) < onsen.width / 2 + margin + .2 &&
    Math.abs(point.z - onsen.z) < onsen.depth / 2 + margin + .2) ||
    (Math.abs(point.x - onsen.entry.x) < 1.15 + margin && point.z > -21.3 - margin && point.z < -16.8 + margin);
}

export function isInsideBathhouse(point: { x: number; z: number }) {
  const house = onsen.bathhouse;
  return Math.abs(point.x - house.x) < house.width / 2 && Math.abs(point.z - house.z) < house.depth / 2 - .1;
}

export const onsenObstacles = [
  { x: -19, z: -28.9, width: 16, depth: .18 },
  { x: -26.9, z: -25.3, width: .18, depth: 7.2 },
  { x: -23.75, z: -21.7, width: 6.3, depth: .2 },
  ...[-20.65, -18.15].map(x => ({ x, z: -21.1, width: .25, depth: .25 })),
  { x: -14.6, z: -28.3, width: 6.4, depth: .2 },
  ...[-17.8, -11.4].map(x => ({ x, z: -25, width: .2, depth: 6.6 })),
  ...[-16.75, -12.45].map(x => ({ x, z: -21.7, width: 2.1, depth: .2 })),
  onsen.outdoorBath,
  onsen.indoorBath,
  { x: -23.6, z: -22, width: 3.2, depth: .45 },
  ...[-16.9, -12.3].map(x => ({ x, z: -23.5, width: .5, depth: 1.1 })),
  ...[{ x: -25.8, z: -22.3 }, { x: -18.9, z: -28 }].map(p => ({ ...p, width: .55, depth: .55 })),
];
