import { isWalkable, moveCharacter, type Point, type Obstacle } from './world-navigation.ts';

export const bikeStation = { x: 15, z: 25, width: 3.8, depth: 3.1 };
export const bikeStart = { x: 16.15, z: 25 };
export const bikeRadius = 0.95;
export const bikeGeometry = {
  wheelRadius: 0.33,
  crank: { y: 0.4, z: -0.02 },
  crankRadius: 0.16,
  saddle: { y: 0.92, z: -0.25 },
  steeringPivot: { y: 0.98, z: 0.48 },
  grip: { x: 0.25, y: 1.18, z: 0.44 },
};
export function getBikeGrip(sign: number, steering: number) {
  const x = sign * bikeGeometry.grip.x, z = bikeGeometry.grip.z - bikeGeometry.steeringPivot.z;
  return { x: Math.cos(steering) * x + Math.sin(steering) * z, y: bikeGeometry.grip.y,
    z: bikeGeometry.steeringPivot.z - Math.sin(steering) * x + Math.cos(steering) * z };
}
export function cyclingObstacles(obstacles: Obstacle[]) {
  return obstacles.map(o => ({ ...o, width: o.width + (bikeRadius - 0.32) * 2, depth: o.depth + (bikeRadius - 0.32) * 2 }));
}
export function getCyclingSpeed(shoreDistance: number, onDeck: boolean) {
  return shoreDistance > 0 && !onDeck ? 1.1 : 6;
}
export function getBikeStandingPosition(actor: Point, heading: number, obstacles: Obstacle[]) {
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const target = { x: actor.x + Math.sin(heading + angle) * 1.15, z: actor.z + Math.cos(heading + angle) * 1.15 };
    const reached = moveCharacter(actor, { x: target.x - actor.x, z: target.z - actor.z }, obstacles);
    if (isWalkable(target, obstacles) && Math.hypot(target.x - reached.x, target.z - reached.z) < 0.01) return target;
  }
  return null;
}
export function createBikeController() {
  let riding = false;
  let position: Point = { ...bikeStart };
  let rotation = 0;
  return {
    get riding() { return riding; },
    get position() { return position; },
    get rotation() { return rotation; },
    mount(actor: Point, grounded: boolean) {
      if (riding || !grounded || Math.hypot(actor.x - position.x, actor.z - position.z) > 1.5) return false;
      riding = true;
      return true;
    },
    park(actor: Point, heading: number) {
      riding = false;
      position = { x: actor.x, z: actor.z };
      rotation = heading;
    },
    dismount(actor: Point, heading: number, obstacles: Obstacle[]) {
      if (!riding) return null;
      const target = getBikeStandingPosition(actor, heading, obstacles);
      if (!target) return null;
      riding = false;
      position = { x: actor.x, z: actor.z };
      rotation = heading;
      return target;
    },
  };
}
