import RAPIER from '@dimforge/rapier3d-compat';
import { coastPoint, distanceToShore, getGroundHeight, getWalkingHeight, type Point, type Obstacle } from './world-navigation.ts';
import { getHarborDeckHeight, harborDecks } from './world-harbor.ts';
import { isOnRoad } from './world-layout.ts';
import { cyclingSpeed, getCyclingSpeed } from './world-bike.ts';

let initialization: Promise<void> | undefined;
const step = 1 / 120, chassisHeight = 0.7;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export type BikeInput = { throttle: number; steer: number; brake?: boolean };
export type BikePose = Point & { y: number; heading: number; steering: number; speed: number; lean: number; wheelRotations: number[]; wheelHeights: number[] };
export type BikePhysics = Awaited<ReturnType<typeof createBikePhysics>>;

export async function createBikePhysics(obstacles: Obstacle[]) {
  await (initialization ??= RAPIER.init());
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = step;
  world.numSolverIterations = 8;
  const vertices: number[] = [], indices: number[] = [];
  const nx = 97, nz = 95;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p = { x: i - 48, z: j - 51 };
    vertices.push(p.x, getGroundHeight(p) + (isOnRoad(p) ? 0.08 : 0), p.z);
    if (i < nx - 1 && j < nz - 1) { const k = j * nx + i; indices.push(k, k + nx, k + 1, k + 1, k + nx, k + nx + 1); }
  }
  world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices)).setFriction(0.8));
  for (const d of harborDecks) {
    const verts: number[] = [], tris: number[] = [], count = Math.ceil(d.depth / 0.5);
    for (let i = 0; i <= count; i++) {
      const z = d.z - d.depth / 2 + d.depth * i / count;
      for (const x of [d.x - d.width / 2, d.x + d.width / 2]) verts.push(x, getHarborDeckHeight({ x, z })!, z);
      if (i < count) { const k = i * 2; tris.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(tris)).setFriction(0.9));
  }
  for (const o of obstacles) world.createCollider(RAPIER.ColliderDesc.cuboid(o.width / 2, 1.5, o.depth / 2)
    .setTranslation(o.x, getWalkingHeight(o) + 1.5, o.z).setFriction(0.3).setRestitution(0));
  // Invisible seawalls follow the same wading boundary. The pier has its own railings.
  for (let i = 0; i < 256; i++) {
    const a = coastPoint(i * Math.PI / 128, 2.2), b = coastPoint((i + 1) * Math.PI / 128, 2.2);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    if (z < 0 && Math.abs(x) < 2.5) continue;
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    world.createCollider(RAPIER.ColliderDesc.cuboid(Math.hypot(b.x - a.x, b.z - a.z) / 2 + 0.03, 5, 0.1)
      .setTranslation(x, -3, z).setRotation({ x: 0, y: -Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }));
  }
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1, 6)
    .enabledRotations(false, true, false).setAdditionalMass(84).setLinearDamping(0.12).setAngularDamping(1.5).setCcdEnabled(true).setCanSleep(false));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.34, 0.18, 1.02).setMass(1).setFriction(0.15).setRestitution(0), body);
  const vehicle = world.createVehicleController(body);
  vehicle.indexUpAxis = 1; vehicle.setIndexForwardAxis = 2;
  for (const z of [-0.67, 0.67]) {
    const i = vehicle.numWheels();
    vehicle.addWheel({ x: 0, y: -0.05, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, 0.29, 0.36);
    vehicle.setWheelSuspensionStiffness(i, 90);
    vehicle.setWheelSuspensionCompression(i, 8);
    vehicle.setWheelSuspensionRelaxation(i, 10);
    vehicle.setWheelMaxSuspensionTravel(i, 0.14);
    vehicle.setWheelMaxSuspensionForce(i, 8000);
    vehicle.setWheelFrictionSlip(i, 3);
    vehicle.setWheelSideFrictionStiffness(i, 1.6);
  }
  let accumulator = 0, steering = 0, lean = 0;
  const pose = (): BikePose => {
    const p = body.translation(), q = body.rotation(), v = body.linvel();
    const heading = 2 * Math.atan2(q.y, q.w);
    return { x: p.x, z: p.z, y: p.y - chassisHeight, heading, steering,
      speed: v.x * Math.sin(heading) + v.z * Math.cos(heading), lean,
      wheelRotations: [0, 1].map(i => vehicle.wheelRotation(i) ?? 0),
      wheelHeights: [0, 1].map(i => 0.65 - (vehicle.wheelSuspensionLength(i) ?? 0.29)) };
  };
  const halt = () => { accumulator = 0; lean = 0; body.setLinvel({ x: 0, y: 0, z: 0 }, true); body.setAngvel({ x: 0, y: 0, z: 0 }, true); };
  return {
    get pose() { return pose(); },
    reset(p: Point, heading: number) {
      halt(); steering = 0; lean = 0;
      body.setTranslation({ x: p.x, y: getWalkingHeight(p) + chassisHeight + 0.08, z: p.z }, true);
      body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true);
      world.propagateModifiedBodyPositionsToColliders();
      world.step();
    },
    halt,
    update(delta: number, input: BikeInput) {
      accumulator += Math.min(delta, 0.1);
      while (accumulator + 1e-9 >= step) {
        accumulator -= step;
        const before = pose(), velocity = body.linvel();
        const maxSpeed = getCyclingSpeed(distanceToShore(before), getHarborDeckHeight(before) !== null);
        const maxSteer = 0.65 - 0.2 * clamp(Math.abs(before.speed) / cyclingSpeed, 0, 1);
        steering += (clamp(input.steer, -1, 1) * maxSteer - steering) * (1 - Math.exp(-step * 9));
        const braking = input.brake || input.throttle < 0 && before.speed > 0.15;
        const targetSpeed = input.throttle >= 0 ? input.throttle * maxSpeed : input.throttle * 2.2;
        const engine = braking || Math.abs(input.throttle) < 0.001 ? 0 : clamp((targetSpeed - before.speed) * 85 * 4, -380, 1000);
        vehicle.setWheelSteering(1, steering);
        vehicle.setWheelEngineForce(0, engine);
        for (const i of [0, 1]) vehicle.setWheelBrake(i, braking ? 8 : Math.abs(input.throttle) < 0.001 ? 0.12 : 0);
        vehicle.updateVehicle(step);
        world.step();
        const p = body.translation();
        if (distanceToShore(p) > 1.88 && getHarborDeckHeight(p, 0.32) === null) {
          body.setTranslation({ x: before.x, y: p.y, z: before.z }, true);
          body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
        }
        const targetLean = -clamp(Math.atan(before.speed * body.angvel().y / 9.81), -0.22, 0.22);
        lean += (targetLean - lean) * (1 - Math.exp(-step * 7));
      }
      return pose();
    },
    dispose() { world.free(); },
  };
}

export function followBikePath(physics: BikePhysics, path: Point[], delta: number, stopAtEnd = true) {
  const p = physics.pose;
  while (path.length > 1 && Math.hypot(path[0].x - p.x, path[0].z - p.z) < 0.7) path.shift();
  for (let i = path.length - 1; i >= 1; i--) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    if (t > 0.02 && Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < 0.9) { path.splice(0, i); break; }
  }
  const goal = path.at(-1);
  if (!goal) return physics.update(delta, { throttle: 0, steer: 0, brake: true });
  const remaining = Math.hypot(goal.x - p.x, goal.z - p.z);
  if (stopAtEnd && path.length === 1 && remaining < 0.16 && Math.abs(p.speed) < 0.4) { path.shift(); physics.halt(); return physics.pose; }
  let target = path[0], previous: Point = p, look = 2.4 + Math.abs(p.speed) * 0.12;
  for (const point of path) {
    const length = Math.hypot(point.x - previous.x, point.z - previous.z);
    if (length >= look) { target = { x: previous.x + (point.x - previous.x) * look / length, z: previous.z + (point.z - previous.z) * look / length }; break; }
    look -= length; previous = point; target = point;
  }
  const angle = Math.atan2(target.x - p.x, target.z - p.z);
  const error = Math.atan2(Math.sin(angle - p.heading), Math.cos(angle - p.heading));
  let routeRemaining = Math.hypot(path[0].x - p.x, path[0].z - p.z);
  for (let i = 1; i < path.length; i++) routeRemaining += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  const turningSpeed = Math.max(1.5, cyclingSpeed / (1 + Math.abs(error) * 3));
  const targetSpeed = Math.min(turningSpeed, stopAtEnd ? Math.min(Math.sqrt(5 * routeRemaining), routeRemaining * 2) : cyclingSpeed);
  return physics.update(delta, { throttle: clamp(targetSpeed / cyclingSpeed, 0, 1), steer: clamp(error * 1.7, -1, 1), brake: p.speed > targetSpeed + 0.35 });
}
