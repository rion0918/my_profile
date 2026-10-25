import { CatmullRomCurve3, Vector3 } from "three";
import { centralPlaza, southEntrance, areaGateSupports } from "./world-zones.ts";
import { halls, hallIconDisplay } from "./world-halls.ts";
import { coastPoint, distanceToShore } from "./world-navigation.ts";
import { harborDecks, harborObstacles } from "./world-harbor.ts";
import { isOnsenClearing, onsenObstacles } from "./world-onsen.ts";
import { gamingPC, isGamingPCClearing } from "./world-gaming-pc.ts";
import { pastaKitchen, isPastaClearing } from "./world-pasta.ts";

import { bikeStation } from "./world-bike.ts";

const scale = 1.7;
export const buildings = halls.map((b) => {
  const front = b.z + (b.depth * scale) / 2;
  return {
    ...b,
    width: b.width * scale,
    depth: b.depth * scale,
    height: b.height * scale,
    scale,
    entry: {
      x: b.x,
      z: front,
      width: 1.9,
      inside: { x: b.x, z: front - 0.65 },
      outside: { x: b.x, z: front + 1.5 },
      cycling: { x: b.x, z: front + 2.5 },
    },
  };
});
type Road = { points: number[][]; width: number; closed?: boolean };
export const plaza = { ...centralPlaza, radius: 3.8 };
export const entrancePlaza = { ...southEntrance, radius: 4.5 };
export const entranceGardens = [-1, 1].map(side => ({ x: side * 6, z: 34.2, radius: 0.95 }));
export const entranceLamps = [-1, 1].map(side => ({ x: side * 4.2, z: 35.3, rotation: 0, width: 0.4, depth: 0.4 }));
export const roads: Road[] = [
  {
    points: [
      [southEntrance.x, southEntrance.z],
      [0, 22],
      [0, 6],
      [0, 0],
      [0, -13],
      [0, -24],
      [0, -35],
    ],
    width: 3.4,
  },
  {
    points: [
      [-40, 0],
      [-25, 0],
      [-11, 0],
      [0, 0],
      [14, 0],
      [26, 0],
      [40, 0],
    ],
    width: 3.1,
  },
  {
    points: [
      [-32, 35],
      [-28, 27],
      [-19, 30],
      [0, 31],
      [19, 30],
      [28, 22],
      [40, 10],
    ],
    width: 3.2,
  },
  {
    points: [
      [-40, -20],
      [-25, -19],
      [-17, -14],
      [-14, -4],
      [-14, 0],
    ],
    width: 2.8,
  },
  {
    points: [
      [-17, -14],
      [-14, -19],
      [-7, -19.3],
      [7, -19.3],
      [20, -21],
      [40, -20],
    ],
    width: 2.8,
  },
  ...buildings.map((b) => ({
    points: [
      [0, b.entry.outside.z],
      [b.x * 0.65, b.entry.outside.z],
      [b.x, b.entry.outside.z],
      [b.x, b.entry.inside.z],
    ],
    width: 2.2,
  })),
];
// The northwestern promenade follows the shore behind the expanded thermal garden.
const promenadeInset = (angle: number) => {
  const a = (angle + Math.PI * 2) % (Math.PI * 2), smooth = (lo: number, hi: number) => {
    const t = Math.max(0, Math.min(1, (a - lo) / (hi - lo))); return t * t * (3 - 2 * t);
  };
  return -7 + 2.7 * smooth(3.45, 3.85) * (1 - smooth(4.35, 4.61));
};
// Main streets meet a continuous promenade on dry ground, before the beach slope.
for (const road of roads.slice(0, 5))
  for (const index of [0, road.points.length - 1]) {
    const [x, z] = road.points[index];
    if (distanceToShore({ x, z }) > -7) {
      const angle = Math.atan2(z, x), p = coastPoint(angle, promenadeInset(angle) - .8);
      road.points[index] = [p.x, p.z];
    }
  }
roads.push({
  width: 2.2,
  closed: true,
  points: Array.from({ length: 64 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2, p = coastPoint(angle, promenadeInset(angle));
    return [p.x, p.z];
  }),
});
export const roadCurves = roads.map(
  (road) =>
    new CatmullRomCurve3(road.points.map(([x, z]) => new Vector3(x, 0, z)), road.closed),
);
const roadCells = new Map<
  string,
  { a: Vector3; b: Vector3; halfWidth: number }[]
>();
roadCurves.forEach((curve, index) => {
  const points = curve.getPoints(Math.ceil(curve.getLength() / 0.25)),
    halfWidth = roads[index].width / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      segment = { a, b, halfWidth };
    for (
      let x = Math.floor((Math.min(a.x, b.x) - halfWidth) / 4);
      x <= Math.floor((Math.max(a.x, b.x) + halfWidth) / 4);
      x++
    )
      for (
        let z = Math.floor((Math.min(a.z, b.z) - halfWidth) / 4);
        z <= Math.floor((Math.max(a.z, b.z) + halfWidth) / 4);
        z++
      ) {
        const key = `${x},${z}`,
          cell = roadCells.get(key) ?? [];
        cell.push(segment);
        roadCells.set(key, cell);
      }
  }
});

// Placement uses the same curves and widths as the visible pavement.
export function isOnRoad(point: { x: number; z: number }, clearance = 0) {
  if ([plaza, entrancePlaza].some(p => Math.hypot(point.x - p.x, point.z - p.z) < p.radius + clearance)) return true;
  for (
    let x = Math.floor((point.x - clearance) / 4);
    x <= Math.floor((point.x + clearance) / 4);
    x++
  )
    for (
      let z = Math.floor((point.z - clearance) / 4);
      z <= Math.floor((point.z + clearance) / 4);
      z++
    )
      for (const { a, b, halfWidth } of roadCells.get(`${x},${z}`) ?? []) {
        const dx = b.x - a.x,
          dz = b.z - a.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz),
            ),
          );
        if (
          Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t) <
          halfWidth + clearance + 0.03
        )
          return true;
      }
  return false;
}

const treeSites = [
  [-13, -6],
  [-13, 0],
  [-4, -9],
  [3, -9],
  [14, -11],
  [14, -5],
  [-4, 9],
  [7, 8],
  [12, 5],
  [-10, 12],
  [-14, 17],
  [-25, 11],
  [-24, 18],
  [22, 10],
  [23, 18],
  ...Array.from({ length: 30 }, (_, i) => [
    -36 + (i % 10) * 7.5,
    -28 + Math.floor(i / 10) * 29,
  ]),
  ...Array.from({ length: 12 }, (_, i) => [
    i % 2 ? -32 : 32,
    -22 + Math.floor(i / 2) * 9,
  ]),
];
export const ponds = [
  { x: 28, z: -7, width: 6, depth: 12 },
  { x: -27, z: -8, width: 8, depth: 6 },
];
export const landmark = {
  title: "りおまる",
  x: -16,
  z: 26,
  width: 3.9,
  depth: 1.65,
  rotation: Math.atan2(12, 20),
};
type StreetProp = {
  x: number; z: number; rotation: number; width: number; depth: number;
};
export const lightSupports = [
  { x: -3.3, z: 4.2, height: 3.8 },
  { x: 3, z: 5, height: 3.8 },
];
const gardenFootprints = entranceGardens.map(p => ({ ...p, rotation: 0, width: p.radius * 2, depth: p.radius * 2 }));
export const hallIconSites = buildings.filter(b => b.icon).map(b => ({
  id: b.id, x: b.x - 6, z: b.z + .2,
  rotation: hallIconDisplay.rotation, scale: hallIconDisplay.scale,
  width: hallIconDisplay.width * hallIconDisplay.scale, depth: hallIconDisplay.depth * hallIconDisplay.scale,
}));
const placedProps: StreetProp[] = [...gardenFootprints, ...entranceLamps, ...areaGateSupports.map(p => ({ ...p, rotation: 0 })), { ...gamingPC, rotation: 0 }, gamingPC.specBoard, { ...pastaKitchen, rotation: 0 }, ...hallIconSites];
function footprint(prop: StreetProp, margin = 0) {
  const c = Math.cos(prop.rotation), s = Math.sin(prop.rotation);
  return [-1, 0, 1].flatMap((x) => [-1, 0, 1].map((z) => ({
    x: prop.x + c * x * (prop.width / 2 + margin) + s * z * (prop.depth / 2 + margin),
    z: prop.z - s * x * (prop.width / 2 + margin) + c * z * (prop.depth / 2 + margin),
  })));
}
function clearProp(prop: StreetProp) {
  return footprint(prop, 0.15).every((p) =>
    !isOnsenClearing(p, 0.2) &&
    !isGamingPCClearing(p, .2) &&
    !isPastaClearing(p, .2) &&
    !isOnRoad(p, 0.05) && distanceToShore(p) < -3.2 &&
    !((Math.abs(p.x - bikeStation.x) < bikeStation.width / 2 + 0.2) && (Math.abs(p.z - bikeStation.z) < bikeStation.depth / 2 + 0.2)) &&
    !harborDecks.some((d) => Math.abs(p.x - d.x) < d.width / 2 + 1 &&
      Math.abs(p.z - d.z) < d.depth / 2 + 1) &&
    !buildings.some((b) => Math.abs(p.x - b.x) < b.width / 2 + 0.6 &&
      p.z > b.z - b.depth / 2 - 0.6 && p.z < b.entry.outside.z + 0.5) &&
    !buildings.some((b) => Math.hypot(p.x-b.entry.cycling.x,p.z-b.entry.cycling.z)<1.6) &&
    !ponds.some((b) => Math.abs(p.x - b.x) < b.width / 2 + 0.5 &&
      Math.abs(p.z - b.z) < b.depth / 2 + 0.5) &&
    Math.hypot((p.x - landmark.x) / 2.8, (p.z - landmark.z) / 1.9) > 1 &&
    !lightSupports.some((pole) => Math.hypot(p.x - pole.x, p.z - pole.z) < 0.6) &&
    !placedProps.some((other) => Math.hypot(p.x - other.x, p.z - other.z) <
      Math.hypot(other.width, other.depth) / 2 + 0.35),
  );
}
const streetSamples = roadCurves.flatMap((curve, index) => curve.getPoints(500).map(p => ({ p, index })));
function roadsideSite(preferred: { x: number; z: number }, width: number, depth: number, sign = false) {
  const candidates: (StreetProp & { distance: number })[] = [];
  roadCurves.forEach((curve, index) => {
    const count = Math.ceil(curve.getLength());
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt(i / count), tangent = curve.getTangentAt(i / count);
      for (const side of [-1, 1]) {
        const nx = -tangent.z * side, nz = tangent.x * side;
        const offset = roads[index].width / 2 + (sign ? depth : width) / 2 + 0.45;
        const x = p.x + nx * offset, z = p.z + nz * offset;
        candidates.push({ x, z, width, depth,
          rotation: Math.atan2(-nz, nx) - (sign ? Math.PI / 2 : 0),
          distance: Math.hypot(x - preferred.x, z - preferred.z) });
      }
    }
  });
  const site = candidates.sort((a, b) => a.distance - b.distance).find(candidate => {
    if (!clearProp(candidate)) return false;
    let nearest = streetSamples[0], distance = Infinity;
    for (const sample of streetSamples) {
      const d = Math.hypot(sample.p.x - candidate.x, sample.p.z - candidate.z);
      if (d < distance) { nearest = sample; distance = d; }
    }
    const front = sign ? [Math.sin(candidate.rotation), Math.cos(candidate.rotation)] : [-Math.cos(candidate.rotation), Math.sin(candidate.rotation)];
    return distance < roads[nearest.index].width / 2 + (sign ? depth : width) / 2 + 0.55 &&
      ((nearest.p.x - candidate.x) * front[0] + (nearest.p.z - candidate.z) * front[1]) / distance > 0.985;
  })!;
  placedProps.push(site);
  return site;
}
export const projectExhibits = buildings.filter(b => b.id === 'yoin' || b.id === 'pop-reminder').map(b => {
  const preferred = { x: b.x + (b.x < 0 ? -4.5 : 5.5), z: b.z };
  const exhibitScale = 1.7;
  const prop = { ...preferred, width: 2.8 * exhibitScale, depth: 2.1 * exhibitScale, rotation: Math.atan2(12, 20) };
  if (clearProp(prop)) { placedProps.push(prop); return { id: b.id, scale: exhibitScale, ...prop }; }
  return { id: b.id, scale: exhibitScale, ...roadsideSite(preferred, prop.width, prop.depth, true) };
});
export const benches = [
  { x: -2.5, z: 4.5 }, { x: 3, z: 7 }, { x: 12, z: -15 },
  { x: -15, z: 20 }, { x: 23, z: 22 }, { x: -10, z: -20 },
  { x: 32, z: 6 }, { x: -32, z: -15 },
].map((p) => roadsideSite(p, 0.65, 1.6));
export const streetlights: StreetProp[] = [...entranceLamps];
for (const index of [0, 1, 2, 3, 4, roads.length - 1]) {
  const curve = index === roads.length - 1
    ? new CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => { const p = coastPoint(i / 64 * Math.PI * 2, -7); return new Vector3(p.x, 0, p.z); }), true)
    : roadCurves[index];
  const count = Math.floor(curve.getLength() / 13);
  for (let i = 0; i < count; i++) {
    const p = curve.getPointAt((i + 0.4) / count), tangent = curve.getTangentAt((i + 0.4) / count);
    const side = i % 2 ? 1 : -1, offset = roads[index].width / 2 + 0.65;
    const lamp = { x: p.x - tangent.z * side * offset, z: p.z + tangent.x * side * offset,
      rotation: 0, width: 0.4, depth: 0.4 };
    if (Math.hypot(lamp.x - landmark.x, lamp.z - landmark.z) > 4.5 && clearProp(lamp)) { streetlights.push(lamp); placedProps.push(lamp); }
  }
}
export const trees: { x: number; z: number }[] = [];
for (const [x, z] of treeSites) {
  const site = [
    [0, 0],
    [0, 3.5],
    [0, -3.5],
    [3.5, 0],
    [-3.5, 0],
    [3.5, 3.5],
    [-3.5, -3.5],
    [3.5, -3.5],
    [-3.5, 3.5],
  ]
    .map(([dx, dz]) => ({ x: x + dx, z: z + dz }))
    .find((p) =>
      Math.abs(p.x) <= 37 && Math.abs(p.z) <= 30 && distanceToShore(p) < -4.5 &&
      !isOnRoad(p, 2.4) &&
      !isOnsenClearing(p, 2.4) &&
      !isGamingPCClearing(p, 2.4) &&
      !isPastaClearing(p, 2.4) &&
      !hallIconSites.some(site => {
        const dx = p.x - site.x, dz = p.z - site.z;
        const along = dx * Math.sin(site.rotation) + dz * Math.cos(site.rotation);
        const across = dx * Math.cos(site.rotation) - dz * Math.sin(site.rotation);
        return Math.hypot(dx, dz) < 4.1 || (along > 0 && along < 9 && Math.abs(across) < 3.5);
      }) &&
      !areaGateSupports.some(s => Math.hypot(p.x - s.x, p.z - s.z) < 3) &&
      Math.hypot(p.x - bikeStation.x, p.z - bikeStation.z) > 4 &&
      !harborDecks.some((d) => Math.abs(p.x - d.x) < d.width / 2 + 2.4 &&
        Math.abs(p.z - d.z) < d.depth / 2 + 2.4) &&
      !buildings.some((b) =>
        Math.abs(p.x - b.x) < b.width / 2 + 2.4 &&
        Math.abs(p.z - b.z) < b.depth / 2 + 3.2,
      ) &&
      !ponds.some((pond) =>
        Math.abs(p.x - pond.x) < pond.width / 2 + 2 &&
        Math.abs(p.z - pond.z) < pond.depth / 2 + 2,
      ) &&
      !projectExhibits.some((e) => {
        const dx = p.x - e.x, dz = p.z - e.z;
        const c = Math.cos(e.rotation), s = Math.sin(e.rotation);
        const inside = Math.abs(dx * c - dz * s) < e.width / 2 + 2.4 &&
          Math.abs(dx * s + dz * c) < e.depth / 2 + 2.4;
        // Keep crowns out of the enlarged screens' fixed isometric viewing approach.
        const along = (dx * 12 + dz * 20) / Math.hypot(12, 20);
        const across = (dx * 20 - dz * 12) / Math.hypot(12, 20);
        return inside || (along > 0 && along < 10 && Math.abs(across) < 2.8);
      }) &&
      ![...benches, ...projectExhibits, ...streetlights, ...lightSupports].some((item) =>
        Math.hypot(p.x - item.x, p.z - item.z) < 2.6,
      ) &&
      !trees.some((tree) => Math.hypot(p.x - tree.x, p.z - tree.z) < 3.8),
    );
  if (site) trees.push(site);
}

export const obstacles = [
  { x: pastaKitchen.x, z: pastaKitchen.z, width: pastaKitchen.width, depth: pastaKitchen.depth },
  { x: gamingPC.x, z: gamingPC.z, width: gamingPC.width, depth: gamingPC.depth },
  {
    x: gamingPC.specBoard.x, z: gamingPC.specBoard.z,
    width: Math.cos(gamingPC.specBoard.rotation) * gamingPC.specBoard.width + Math.sin(gamingPC.specBoard.rotation) * gamingPC.specBoard.depth,
    depth: Math.sin(gamingPC.specBoard.rotation) * gamingPC.specBoard.width + Math.cos(gamingPC.specBoard.rotation) * gamingPC.specBoard.depth,
  },
  ...areaGateSupports,
  ...onsenObstacles,
  ...harborObstacles,
  { x: bikeStation.x - 0.75, z: bikeStation.z, width: 0.9, depth: 2.1 },
  { x: bikeStation.x - 0.25, z: bikeStation.z - 1.15, width: 1.5, depth: 0.15 },
  ...buildings.flatMap((b) => {
    const front = b.entry.z,
      opening = b.entry.width,
      side = (b.width - opening) / 2;
    return [
      { x: b.x - b.width / 2, z: b.z, width: 0.32, depth: b.depth },
      { x: b.x + b.width / 2, z: b.z, width: 0.32, depth: b.depth },
      { x: b.x, z: b.z - 0.65, width: b.width, depth: b.depth - 1.3 },
      { x: b.x - opening / 2 - side / 2, z: front, width: side, depth: 0.25 },
      { x: b.x + opening / 2 + side / 2, z: front, width: side, depth: 0.25 },
    ];
  }),
  ...trees.map((t, i) => ({
    ...t,
    width: i % 3 === 0 ? 2.7 : 0.65,
    depth: i % 3 === 0 ? 2.7 : 0.65,
  })),
  ...[...benches, ...projectExhibits, ...gardenFootprints, ...hallIconSites].map((p) => ({
    x: p.x, z: p.z,
    width: Math.abs(Math.cos(p.rotation)) * p.width + Math.abs(Math.sin(p.rotation)) * p.depth,
    depth: Math.abs(Math.sin(p.rotation)) * p.width + Math.abs(Math.cos(p.rotation)) * p.depth,
  })),
  ...streetlights.map((p) => ({ x: p.x, z: p.z, width: 0.4, depth: 0.4 })),
  ...lightSupports.map((p) => ({ x: p.x, z: p.z, width: 0.4, depth: 0.4 })),
  ...ponds,
  {
    x: landmark.x,
    z: landmark.z,
    width: landmark.width * Math.cos(landmark.rotation) +
      landmark.depth * Math.sin(landmark.rotation),
    depth: landmark.width * Math.sin(landmark.rotation) +
      landmark.depth * Math.cos(landmark.rotation),
  },
];
