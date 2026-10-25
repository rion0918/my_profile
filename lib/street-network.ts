import type { CatmullRomCurve3 } from "three";
import clipping, { type MultiPolygon, type Polygon, type Ring } from "polygon-clipping";

type Street = { curve: CatmullRomCurve3; width: number };
type Plaza = { x: number; z: number; radius: number };

function softenJunctions(polygons: MultiPolygon): MultiPolygon {
  return polygons.map((polygon) => polygon.map((closed) => {
    const ring = closed.slice(0, -1);
    // Remove redundant samples before rounding only the concave junction corners.
    let changed = true;
    while (changed && ring.length > 3) {
      changed = false;
      for (let i = 0; i < ring.length && ring.length > 3; i++) {
        const a = ring[(i + ring.length - 1) % ring.length], p = ring[i], b = ring[(i + 1) % ring.length];
        const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
        const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (length * length);
        if (t > 0 && t < 1 && Math.abs(dx * (p[1] - a[1]) - dz * (p[0] - a[0])) / length < 0.012) {
          ring.splice(i--, 1); changed = true;
        }
      }
    }
    const rounded: Ring = [];
    ring.forEach((p, i) => {
      const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
      const ax = p[0] - a[0], az = p[1] - a[1], bx = b[0] - p[0], bz = b[1] - p[1];
      const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz);
      if ((ax * bz - az * bx) / (al * bl) > -0.25) { rounded.push(p); return; }
      const distance = Math.min(0.85, al * 0.45, bl * 0.45);
      const start = [p[0] - ax / al * distance, p[1] - az / al * distance];
      const end = [p[0] + bx / bl * distance, p[1] + bz / bl * distance];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8, s = 1 - t;
        rounded.push([s * s * start[0] + 2 * s * t * p[0] + t * t * end[0],
          s * s * start[1] + 2 * s * t * p[1] + t * t * end[1]]);
      }
    });
    return [...rounded, rounded[0]];
  }));
}

function ribbon({ curve, width }: Street, margin: number): Polygon {
  const count = Math.ceil(curve.getLength() / 0.35);
  const radius = width / 2 + margin;
  const left: Ring = [], right: Ring = [];
  for (let i = 0; i <= count; i++) {
    const p = curve.getPoint(i / count), t = curve.getTangent(i / count);
    left.push([p.x - t.z * radius, p.z + t.x * radius]);
    right.push([p.x + t.z * radius, p.z - t.x * radius]);
  }
  if (curve.closed) {
    const area = (ring: Ring) => Math.abs(ring.reduce((sum, a, i) => {
      const b = ring[(i + 1) % ring.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0));
    return area(left) > area(right) ? [left, right] : [right, left];
  }
  const cap = (end: number, startAngle: number): Ring => {
    const p = curve.getPoint(end);
    return Array.from({ length: 15 }, (_, i) => {
      const a = startAngle - Math.PI * (i + 1) / 16;
      return [p.x + Math.cos(a) * radius, p.z + Math.sin(a) * radius];
    });
  };
  const end = curve.getTangent(1), start = curve.getTangent(0);
  return [[...left, ...cap(1, Math.atan2(end.x, -end.z)),
    ...right.reverse(), ...cap(0, Math.atan2(-start.x, start.z))]];
}

export function buildStreetNetwork(streets: Street[], plaza: Plaza, additionalPlazas: Plaza[] = []) {
  const circle = (site: Plaza, margin: number): Polygon => [Array.from({ length: 128 }, (_, i) => {
    const a = i / 128 * Math.PI * 2;
    return [site.x + Math.cos(a) * (site.radius + margin),
      site.z + Math.sin(a) * (site.radius + margin)];
  })];
  const surface = softenJunctions(clipping.union(circle(plaza, 0), ...additionalPlazas.map(p => circle(p, 0)), ...streets.map((s) => ribbon(s, 0))));
  const outline = softenJunctions(clipping.union(circle(plaza, 0.18), ...additionalPlazas.map(p => circle(p, 0.18)), ...streets.map((s) => ribbon(s, 0.18))));
  return { surface, curb: clipping.difference(outline, surface) };
}

export function containsStreetPoint(polygons: MultiPolygon, x: number, z: number) {
  const inside = (ring: Ring) => {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > z) !== (b[1] > z) &&
        x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };
  return polygons.some(([outer, ...holes]) => inside(outer) && !holes.some(inside));
}
