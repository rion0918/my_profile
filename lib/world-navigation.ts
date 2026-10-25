import { southEntrance, positionVersion } from "./world-zones.ts";
import { getHarborDeckHeight } from "./world-harbor.ts";

export type Point = { x: number; z: number };
export type Obstacle = Point & { width: number; depth: number };
const radius = 0.32;
export const seaLevel = -0.18;
export const wadingLimit = 2.2;
export function coastPoint(angle: number, offset = 0): Point {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const shape = 1 / Math.pow(Math.pow(c / 43, 4) + Math.pow(s / 38, 4), 0.25);
  const r =
    shape *
      (1 +
        0.018 * Math.sin(angle * 5) +
        0.012 * Math.cos(angle * 3) +
        0.008 * Math.sin(angle * 9)) +
    offset;
  return { x: c * r, z: s * r };
}
export function distanceToShore(point: Point) {
  const edge = coastPoint(Math.atan2(point.z, point.x));
  return Math.hypot(point.x, point.z) - Math.hypot(edge.x, edge.z);
}
export function getGroundHeight(point: Point) {
  const distance = distanceToShore(point);
  if (distance <= -3) return 0;
  if (distance < 0) {
    const t = (distance + 3) / 3;
    return -0.25 * t * t * (3 - 2 * t);
  }
  return -0.25 - distance * 0.24 - Math.max(0, distance - wadingLimit) * 0.22;
}
export function getWalkingHeight(point: Point) {
  return getHarborDeckHeight(point) ?? getGroundHeight(point);
}
export function getMoveSpeed(sprinting: boolean, shoreDistance: number, onDeck = false) {
  return shoreDistance > 0 && !onDeck ? 1.1 : sprinting ? 5 : 3.2;
}
export function isWalkable(p: Point, obstacles: Obstacle[]) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    (distanceToShore(p) <= wadingLimit - radius || getHarborDeckHeight(p, radius) !== null) &&
    !obstacles.some(
      (o) =>
        Math.abs(p.x - o.x) < o.width / 2 + radius &&
        Math.abs(p.z - o.z) < o.depth / 2 + radius,
    )
  );
}
export function moveCharacter(
  start: Point,
  displacement: Point,
  obstacles: Obstacle[],
): Point {
  const point = { x: start.x, z: start.z };
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(displacement.x, displacement.z) / 0.1),
  );
  for (let i = 0; i < steps; i++) {
    const x = { x: point.x + displacement.x / steps, z: point.z };
    if (isWalkable(x, obstacles)) point.x = x.x;
    const z = { x: point.x, z: point.z + displacement.z / steps };
    if (isWalkable(z, obstacles)) point.z = z.z;
  }
  return point;
}
export function restorePosition(
  raw: string | null,
  obstacles: Obstacle[],
): Point {
  try {
    const v = JSON.parse(raw ?? "null");
    if (v?.version === positionVersion && isWalkable(v, obstacles)) return { x: v.x, z: v.z };
  } catch {
    /* Optional storage. */
  }
  return { ...southEntrance };
}
const columns = 193,
  rows = 189,
  cell = 0.5;
const grids = new WeakMap<Obstacle[], Uint8Array>();
export function prepareNavigation(obstacles: Obstacle[]) {
  let grid = grids.get(obstacles);
  if (!grid) {
    grid = new Uint8Array(columns * rows);
    for (let i = 0; i < grid.length; i++)
      grid[i] = +isWalkable(pointAt(i), obstacles);
    grids.set(obstacles, grid);
  }
  return grid;
}
const pointAt = (i: number): Point => ({
  x: (i % columns) * cell - 48,
  z: Math.floor(i / columns) * cell - 51,
});
function clearSegment(a: Point, b: Point, obstacles: Obstacle[]) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.12));
  for (let i = 0; i <= steps; i++)
    if (
      !isWalkable(
        {
          x: a.x + ((b.x - a.x) * i) / steps,
          z: a.z + ((b.z - a.z) * i) / steps,
        },
        obstacles,
      )
    )
      return false;
  return true;
}
export function findPath(
  start: Point,
  target: Point,
  obstacles: Obstacle[],
): Point[] {
  if (!isWalkable(start, obstacles) || !isWalkable(target, obstacles))
    return [];
  const grid = prepareNavigation(obstacles);
  const nearest = (p: Point) => {
    const x = Math.round((p.x + 48) / cell),
      z = Math.round((p.z + 51) / cell);
    const candidates: number[] = [];
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++)
        if (x + dx >= 0 && x + dx < columns && z + dz >= 0 && z + dz < rows)
          candidates.push((z + dz) * columns + x + dx);
    return candidates
      .filter((i) => grid[i] && clearSegment(p, pointAt(i), obstacles))
      .sort(
        (a, b) =>
          Math.hypot(pointAt(a).x - p.x, pointAt(a).z - p.z) -
          Math.hypot(pointAt(b).x - p.x, pointAt(b).z - p.z),
      )[0];
  };
  const origin = nearest(start),
    goal = nearest(target);
  if (origin === undefined || goal === undefined) return [];
  const g = new Float32Array(grid.length).fill(Infinity),
    parent = new Int32Array(grid.length).fill(-1),
    closed = new Uint8Array(grid.length);
  const heap: { i: number; score: number }[] = [];
  const h = (i: number) =>
    Math.abs((i % columns) - (goal % columns)) +
    Math.abs(Math.floor(i / columns) - Math.floor(goal / columns));
  const push = (i: number, score: number) => {
    let n = heap.length;
    heap.push({ i, score });
    while (n) {
      const p = (n - 1) >> 1;
      if (heap[p].score <= score) break;
      [heap[n], heap[p]] = [heap[p], heap[n]];
      n = p;
    }
  };
  const pop = () => {
    const best = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let n = 0;
      while (true) {
        let c = n * 2 + 1;
        if (c >= heap.length) break;
        if (c + 1 < heap.length && heap[c + 1].score < heap[c].score) c++;
        if (heap[n].score <= heap[c].score) break;
        [heap[n], heap[c]] = [heap[c], heap[n]];
        n = c;
      }
    }
    return best.i;
  };
  g[origin] = 0;
  push(origin, h(origin));
  while (heap.length) {
    const current = pop();
    if (closed[current]) continue;
    closed[current] = 1;
    if (current === goal) {
      const path: Point[] = [target];
      for (let i = goal; i !== -1; i = parent[i]) path.unshift(pointAt(i));
      // Remove collinear steps; retain checked corners so movement never cuts walls.
      return path.filter(
        (p, i) =>
          i === 0 ||
          i === path.length - 1 ||
          Math.abs(
            (p.x - path[i - 1].x) * (path[i + 1].z - p.z) -
              (p.z - path[i - 1].z) * (path[i + 1].x - p.x),
          ) > 0.00001,
      );
    }
    for (const next of [
      current - 1,
      current + 1,
      current - columns,
      current + columns,
    ]) {
      if (
        next < 0 ||
        next >= grid.length ||
        !grid[next] ||
        closed[next] ||
        Math.abs((next % columns) - (current % columns)) > 1
      )
        continue;
      if (
        g[current] + 1 >= g[next] ||
        !clearSegment(pointAt(current), pointAt(next), obstacles)
      )
        continue;
      parent[next] = current;
      g[next] = g[current] + 1;
      push(next, g[next] + h(next));
    }
  }
  return [];
}
