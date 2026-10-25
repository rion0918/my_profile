import type { BikePose } from "../../lib/world-bike-physics";
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bikeStation, bikeStart, bikeGeometry } from '../../lib/world-bike';

export function createBike(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: color === 0xc4c5c0 ? 0.65 : 0.1 }));
    return materials.get(color)!;
  };
  const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
    geometries.add(geo);
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (p: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: number) =>
    mesh(p, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d, 0.12) / 3), color, x, y, z);
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const beam = (p: THREE.Object3D, a: number[], b: number[], r: number, color: number) => {
    const v = new THREE.Vector3(...a), w = new THREE.Vector3(...b), m = mesh(p, beamGeo, color);
    m.position.copy(v).add(w).multiplyScalar(0.5); m.scale.set(r, v.distanceTo(w), r);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), w.sub(v).normalize()); return m;
  };
  const tube = (p: THREE.Object3D, points: number[][], r: number, color: number) => mesh(p,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))), 32, r, 8, false), color);
  const batch = (group: THREE.Group) => {
    group.updateMatrixWorld(true);
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of [...group.children]) {
      if (!(child instanceof THREE.Mesh)) continue;
      const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      geo.applyMatrix4(child.matrix); geometries.add(geo);
      const material = child.material as THREE.Material;
      if (!parts.has(material)) parts.set(material, []);
      parts.get(material)!.push(geo); group.remove(child);
    }
    for (const [material, geos] of parts) {
      const geo = mergeGeometries(geos, false); geometries.add(geo);
      const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; group.add(m);
    }
  };
  const build = (color: number) => {
    const group = new THREE.Group(), frame = new THREE.Group(), wheels: THREE.Group[] = [];
    group.add(frame);
    const steeringPivot = new THREE.Group(), front = new THREE.Group();
    steeringPivot.position.set(0, bikeGeometry.steeringPivot.y, bikeGeometry.steeringPivot.z);
    front.position.copy(steeringPivot.position).negate();
    steeringPivot.add(front); group.add(steeringPivot);
    for (const z of [-0.67, 0.67]) {
      const wheel = new THREE.Group(); wheel.position.set(0, 0.36, z); (z > 0 ? front : group).add(wheel); wheels.push(wheel);
      for (const [radius, thickness, c] of [[0.33, 0.035, 0x514b5b], [0.298, 0.018, 0xffe6c3]] as const) {
        const tire = mesh(wheel, new THREE.TorusGeometry(radius, thickness, 8, 40), c); tire.rotation.y = Math.PI / 2;
      }
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        beam(wheel, [0, 0, 0], [0, Math.sin(angle) * 0.29, Math.cos(angle) * 0.29], 0.0045, 0xc4c5c0);
      }
      beam(wheel, [-0.07, 0, 0], [0.07, 0, 0], 0.032, 0xc4c5c0); batch(wheel);
      // Painted mudguards follow the upper arc of each wheel.
      tube(z > 0 ? front : frame, Array.from({ length: 13 }, (_, i) => {
        const a = i / 12 * Math.PI; return [0, 0.36 + Math.sin(a) * 0.38, z + Math.cos(a) * 0.38];
      }), 0.025, color);
    }
    const crank = [0, bikeGeometry.crank.y, bikeGeometry.crank.z], seat = [0, 0.88, -0.25], head = [0, 0.98, 0.48];
    for (const [a, b] of [[crank, seat], [seat, head], [crank, head]]) beam(frame, a, b, 0.033, color);
    for (const x of [-0.07, 0.07]) {
      beam(frame, [x, 0.36, -0.67], seat, 0.02, color); beam(frame, [x, 0.36, -0.67], crank, 0.02, color);
      beam(front, [x, 0.36, 0.67], head, 0.022, color);
    }
    beam(frame, seat, [0, 0.92, -0.25], 0.025, 0xc4c5c0);
    box(frame, 0, 0.92, -0.25, 0.24, 0.065, 0.32, 0x66526b);
    beam(front, head, [0, 1.14, 0.45], 0.024, 0xc4c5c0);
    tube(front, [[-0.29, 1.18, 0.44], [-0.18, 1.16, 0.51], [0, 1.14, 0.45], [0.18, 1.16, 0.51], [0.29, 1.18, 0.44]], 0.02, 0xc4c5c0);
    for (const x of [-0.25, 0.25]) beam(front, [x - 0.055, 1.18, 0.44], [x + 0.055, 1.18, 0.44], 0.03, 0x66526b);
    tube(front, [[0.2, 1.17, 0.49], [0.16, 1.01, 0.67], [0.05, 0.72, 0.67]], 0.006, 0x514b5b);
    // Open wire basket and a front lamp, rather than a solid placeholder box.
    for (const y of [0.9, 1.1]) tube(front, [[-0.2, y, 0.61], [-0.2, y, 0.95], [0.2, y, 0.95], [0.2, y, 0.61], [-0.2, y, 0.61]], 0.012, 0xffddaf);
    for (let i = 0; i < 5; i++) for (const x of [-0.2, 0.2]) beam(front, [x, 0.9, 0.62 + i * 0.08], [x, 1.1, 0.62 + i * 0.08], 0.006, 0xc99972);
    for (let i = 0; i < 6; i++) beam(front, [-0.2 + i * 0.08, 0.9, 0.95], [-0.2 + i * 0.08, 1.1, 0.95], 0.006, 0xc99972);
    box(front, 0, 0.87, 0.92, 0.1, 0.07, 0.05, 0xffe2a3);
    box(frame, 0, 0.68, -1, 0.08, 0.045, 0.035, 0xed8c80);
    const chain = mesh(frame, new THREE.TorusGeometry(0.105, 0.012, 6, 24), 0xc4c5c0, 0.075, 0.4, -0.02); chain.rotation.y = Math.PI / 2;
    for (const y of [0.31, 0.49]) beam(frame, [0.075, y, -0.02], [0.075, 0.36, -0.67], 0.009, 0x655976);
    batch(frame); batch(front);
    const pedals = new THREE.Group(); pedals.position.set(0, 0.4, -0.02); group.add(pedals);
    const pads: THREE.Mesh[] = [];
    for (const sign of [-1, 1]) {
      beam(pedals, [sign * 0.1, 0, 0], [sign * 0.16, 0, sign * 0.16], 0.016, 0xc4c5c0);
      pads.push(box(pedals, sign * 0.16, 0, sign * 0.16, 0.15, 0.025, 0.1, 0x655976));
    }
    return { group, wheels, pedals, pads, steeringPivot };
  };
  const station = new THREE.Group(); station.position.set(bikeStation.x, 0, bikeStation.z); scene.add(station);
  box(station, 0, 0.02, 0, bikeStation.width, 0.04, bikeStation.depth, 0xf0c9a6);
  for (const x of [-1.1, -0.4]) {
    tube(station, [[x, 0.04, -0.7], [x, 0.65, -0.7], [x, 0.75, -0.5], [x, 0.75, 0.5], [x, 0.65, 0.7], [x, 0.04, 0.7]], 0.035, 0x43b5af);
    for (const z of [-0.7, 0.7]) box(station, x, 0.07, z, 0.16, 0.08, 0.16, 0x655976);
  }
  const spare = build(0xed8c80); spare.group.position.set(-1.1, 0.05, 0); station.add(spare.group);
  // Raised enamel plaque faces the same viewing direction as the town sculpture.
  const board = new THREE.Group(); board.position.set(-0.25, 0, -1.15); board.rotation.y = Math.atan2(12, 20); station.add(board);
  beam(board, [0, 0.04, 0], [0, 1.6, 0], 0.038, 0x655976);
  box(board, 0, 1.52, 0, 1.7, 0.48, 0.08, 0x43b5af);
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
  const c = canvas.getContext('2d')!; c.fillStyle = '#43b5af'; c.fillRect(0, 0, 768, 192); c.fillStyle = '#fff1d9'; c.textAlign = 'center';
  c.font = '700 56px sans-serif'; c.fillText('RIOMARU CYCLE', 384, 84); c.font = '26px sans-serif'; c.fillText('自転車で、街をひとまわり。', 384, 146);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const signMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.405), signMat); geometries.add(sign.geometry); sign.position.set(0, 1.52, 0.045); board.add(sign);
  batch(station);
  const bike = build(0x43b5af); scene.add(bike.group); bike.group.userData.bike = true;
  bike.group.position.set(bikeStart.x, 0.04, bikeStart.z);
  return {
    group: bike.group,
    update(position: { x: number; z: number }, rotation: number, phase: number, distance: number, height: number, motion?: BikePose) {
      bike.group.position.set(position.x, height, position.z);
      bike.group.rotation.set(0, rotation, motion?.lean ?? 0);
      bike.steeringPivot.rotation.y = motion?.steering ?? 0;
      bike.wheels.forEach((w, i) => {
        w.rotation.x = motion?.wheelRotations[i] ?? distance / bikeGeometry.wheelRadius;
        w.position.y = motion?.wheelHeights[i] ?? 0.36;
      });
      bike.pedals.rotation.x = phase;
      bike.pads.forEach(p => p.rotation.x = -phase);
    },
    dispose() {
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); texture.dispose(); signMat.dispose();
      station.removeFromParent(); bike.group.removeFromParent();
    },
  };
}
