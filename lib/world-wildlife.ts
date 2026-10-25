export const cats = [
  { x: -3.9, z: 2.9, rotation: .6, coat: 'ginger', pose: 'sit' },
  { x: 3.8, z: 6.6, rotation: -.45, coat: 'tuxedo', pose: 'groom' },
  { x: -19.5, z: 20.8, rotation: 1.2, coat: 'calico', pose: 'sleep' },
  { x: 13.4, z: -15.7, rotation: .9, coat: 'silver', pose: 'sit' },
  { x: 23, z: -4, rotation: -.7, coat: 'cream', pose: 'sleep' },
  { x: -11.5, z: -3.9, rotation: .3, coat: 'calico', pose: 'groom' },
  { x: 2.8, z: -45.7, rotation: .8, coat: 'ginger', pose: 'sit' },
] as const;

export function nearestCat(point: Point): number|null {
  let nearest: number|null=null, distance=2.1;
  cats.forEach((cat,i)=>{const d=Math.hypot(point.x-cat.x,point.z-cat.z);if(d<distance){distance=d;nearest=i;}});
  return nearest;
}

export function findCatApproach(point: Point,index: number,obstacles: Obstacle[]) {
  const cat=cats[index], angle=Math.atan2(point.x-cat.x,point.z-cat.z);
  for(const heading of [-Math.atan2(20,12),Math.PI-Math.atan2(20,12),angle,angle+.5,angle-.5,angle+Math.PI]){
    const target={x:cat.x+Math.sin(heading)*.9,z:cat.z+Math.cos(heading)*.9};
    const path=findPath(point,target,obstacles);
    if(path.length)return {point:target,path};
  }
  return null;
}

export const groundBirds = [
  { x: -4.3, z: 4.8, rotation: .5, kind: 'sparrow' },
  { x: -6.1, z: 3.2, rotation: 2.3, kind: 'sparrow' },
  { x: -21.7, z: -9.2, rotation: 1.2, kind: 'sparrow' },
  { x: -21.2, z: -9.5, rotation: -1, kind: 'sparrow' },
  { x: -3.8, z: -46, rotation: .6, kind: 'gull' },
  { x: 1.2, z: -46.9, rotation: -1.2, kind: 'gull' },
] as const;

export function isWildlifeClearing(p: { x: number; z: number }) {
  return cats.some(a => (p.x-a.x)**2+(p.z-a.z)**2 < .85**2) ||
    groundBirds.some(a => (p.x-a.x)**2+(p.z-a.z)**2 < .45**2);
}

export function getBirdFlight(elapsed: number, flock: number, member: number) {
  const phase = ((elapsed % 86) + 86) % 86 - (flock === 0 ? 4 : 43) - member * .35;
  const t = Math.max(0, Math.min(1, phase / 18)), u = 1-t;
  const p = flock === 0
    ? [[-48,9,30],[-10,10,26],[8,9,18],[48,11,10]]
    : [[42,10,-20],[18,11,-30],[-14,9,-35],[-46,10,-24]];
  const position = [0,1,2].map(axis => u*u*u*p[0][axis]+3*u*u*t*p[1][axis]+3*u*t*t*p[2][axis]+t*t*t*p[3][axis]);
  const derivative = [0,2].map(axis => 3*u*u*(p[1][axis]-p[0][axis])+6*u*t*(p[2][axis]-p[1][axis])+3*t*t*(p[3][axis]-p[2][axis]));
  return {
    visible: phase >= 0 && phase <= 18,
    x: position[0] + member * .6, y: position[1] + Math.sin(t*Math.PI)*.35 + member*.22,
    z: position[2] + member * .8, heading: Math.atan2(derivative[0],derivative[1]),
    bank: Math.sin(t*Math.PI*2)*.12,
  };
}
import { findPath, type Point, type Obstacle } from './world-navigation.ts';
