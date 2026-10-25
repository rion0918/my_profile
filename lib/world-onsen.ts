import { CatmullRomCurve3, Vector3 } from 'three';

export const onsen = {
  name: '木もれびの湯', x: -21.2, z: -27.1, width: 23, depth: 12,
  entry: { x: -14, z: -21.3 },
  outdoor: { x: -19, z: -22.1 },
  indoor: { x: -19.9, z: -28.2 },
  doorApproach: { x: -18.8, z: -26.5 },
  bathhouse: { x: -22, z: -29.6, width: 8, depth: 4.8 },
  outdoorBath: { x: -23.4, z: -24.6, width: 9.6, depth: 4.6 },
  indoorBath: { x: -23, z: -30.2, width: 5.2, depth: 2.4 },
  waterfall: { x: -29.6, z: -26.7 },
  pots: { x: -13, z: -25.8 },
  potBaths: [
    { x: -14.6, z: -27.8, radius: .85, approach: { x: -13.1, z: -26.8 } },
    { x: -12.9, z: -30.2, radius: .88, approach: { x: -11.5, z: -29 } },
    { x: -16.2, z: -30.9, radius: .82, approach: { x: -14.8, z: -29.9 } },
  ],
};
const outline = [[-31.8,-23.4],[-31,-27],[-28.7,-29.9],[-25.3,-32.5],[-20,-32.8],[-15.3,-32.4],[-11.7,-31],[-10.5,-27.2],[-11.6,-23.5],[-15.7,-21.9],[-22,-21.1],[-28.7,-22]];
export const onsenBoundary = new CatmullRomCurve3(outline.map(([x,z])=>new Vector3(x,0,z)),true,'centripetal').getPoints(96).slice(0,-1).map(p=>({x:p.x,z:p.z}));
const segmentDistance = (p:{x:number;z:number},a:{x:number;z:number},b:{x:number;z:number}) => {
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
};
export function isOnsenClearing(point:{x:number;z:number},margin=0) {
  if(Math.abs(point.x-onsen.x)>onsen.width/2+margin+1||Math.abs(point.z-onsen.z)>onsen.depth/2+margin+3)return false;
  let inside=false;
  for(let i=0,j=onsenBoundary.length-1;i<onsenBoundary.length;j=i++){
    const a=onsenBoundary[i],b=onsenBoundary[j];
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    if(segmentDistance(point,a,b)<margin+.2)return true;
  }
  return inside||segmentDistance(point,onsen.entry,{x:-13.7,z:-19.4})<1+margin;
}
export function isInsideBathhouse(point:{x:number;z:number}) {
  const h=onsen.bathhouse;
  return Math.abs(point.x-h.x)<h.width/2&&Math.abs(point.z-h.z)<h.depth/2;
}
export function isBathhouseApproach(point:{x:number;z:number}) {
  return Math.abs(point.x-onsen.indoor.x)<1.65&&point.z>onsen.bathhouse.z&&point.z<onsen.doorApproach.z+1;
}
export const onsenBambooGroves = [
  {x:-31,z:-24.9},{x:-30.1,z:-27.7},{x:-28.8,z:-29.5},{x:-27.5,z:-31.3},
  {x:-27.9,z:-30.8},{x:-16.8,z:-32.1},{x:-11.3,z:-27},{x:-11.6,z:-30.9},
];
export const onsenRocks = [
  {x:-29.9,z:-27,width:1.7,depth:1.9},{x:-28.5,z:-26.8,width:1.5,depth:1.6},
  {x:-30.2,z:-25.6,width:1.8,depth:1.5},{x:-28.7,z:-25.7,width:1.5,depth:1.4},
  {x:-30,z:-28.4,width:1.4,depth:1.6},
];
export const onsenLanterns = [{x:-15.5,z:-23.1},{x:-16.2,z:-26.1},{x:-29.4,z:-24}];
const pool=onsen.outdoorBath;
export const onsenObstacles = [
  {x:onsen.bathhouse.x,z:onsen.bathhouse.z-onsen.bathhouse.depth/2,width:8,depth:.18},
  {x:-26,z:-29.6,width:.18,depth:4.8},{x:-18,z:-29.6,width:.18,depth:4.8},
  {x:-23.65,z:-27.2,width:4.7,depth:.18},{x:-18.35,z:-27.2,width:.7,depth:.18},
  onsen.indoorBath,
  ...Array.from({length:15},(_,i)=>{
    const z=(i-7)/7.5,half=pool.width/2*Math.sqrt(Math.max(0,1-z*z));
    return {x:pool.x,z:pool.z+z*pool.depth/2,width:half*2,depth:pool.depth/15};
  }),
  ...onsen.potBaths.map(p=>({x:p.x,z:p.z,width:p.radius*2+.12,depth:p.radius*2+.12})),
  ...onsenRocks,
  ...onsenLanterns.map(p=>({...p,width:.48,depth:.48})),
  ...[-21.47,-18.33].map(x=>({x,z:-26.52,width:.14,depth:.16})),
  ...onsenBambooGroves.map(p=>({...p,width:.8,depth:.8})),
  ...[-25.4,-22.6].map(x=>({x,z:-28,width:.6,depth:.6})),
];
