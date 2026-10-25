import test from 'node:test';
import assert from 'node:assert/strict';
import { createBikePhysics, followBikePath } from '../lib/world-bike-physics.ts';
import { obstacles, buildings } from '../lib/world-layout.ts';
import { bikeStart, cyclingObstacles } from '../lib/world-bike.ts';
import { findPath, isWalkable } from '../lib/world-navigation.ts';
const simulate=(physics,seconds,input,h=1/60)=>{for(let t=0;t<seconds-1e-8;t+=h)physics.update(h,input);return physics.pose;};

test('real rigid-body wheels accelerate, coast, brake and reverse while remaining grounded', async()=>{
 const p=await createBikePhysics([]);try{
  p.reset({x:0,z:6},0);
  const early=simulate(p,.3,{throttle:1,steer:0});assert.ok(early.speed>0&&early.speed<3);
  const fast=simulate(p,2.7,{throttle:1,steer:0});assert.ok(fast.speed>4.5&&fast.speed<6.5);
  const coast=simulate(p,.3,{throttle:0,steer:0});assert.ok(coast.z>fast.z&&coast.speed>1,'momentum continues after releasing W');
  const brake=simulate(p,.8,{throttle:-1,steer:0});assert.ok(brake.speed<coast.speed*.5);
  const reverse=simulate(p,1.4,{throttle:-1,steer:0});assert.ok(reverse.speed<-.5);
  assert.ok(reverse.y>-.2&&reverse.y<.3,'suspension keeps the frame near the ground');
 }finally{p.dispose();}
});

test('front-wheel steering makes an arc instead of strafing, and steering at rest does not spin the bicycle',async()=>{
 const p=await createBikePhysics([]);try{
  p.reset({x:0,z:6},0);const rest=simulate(p,.5,{throttle:0,steer:1});assert.ok(Math.abs(rest.heading)<.01);assert.ok(rest.steering>.3);
  const turn=simulate(p,1.5,{throttle:1,steer:1});assert.ok(turn.x>0.3);assert.ok(turn.heading>.3);assert.ok(Math.abs(turn.lean)>.01);
  assert.ok(turn.wheelRotations.some(a=>Math.abs(a)>.3));
 }finally{p.dispose();}
});

test('the Rapier chassis cannot cross walls, harbor rails or the deep-water boundary',async()=>{
 const p=await createBikePhysics(obstacles);try{
  const b=buildings[0];p.reset({x:b.x-b.width/2-2,z:b.z},Math.PI/2);const wall=simulate(p,4,{throttle:1,steer:0});assert.ok(wall.x < b.x-b.width/2-.3);
  p.reset({x:0,z:-41},Math.PI/2);const rail=simulate(p,3,{throttle:1,steer:0});assert.ok(rail.x<1.6);assert.ok(isWalkable(rail,obstacles));
  p.reset({x:40,z:0},Math.PI/2);const shore=simulate(p,5,{throttle:1,steer:0});assert.ok(isWalkable(shore,obstacles));
  p.halt();const stopped=simulate(p,1,{throttle:0,steer:0});assert.ok(Math.abs(stopped.speed)<.05);
 }finally{p.dispose();}
});

test('fixed-step bicycle motion agrees at 60 and 120Hz',async()=>{
 const p=await createBikePhysics([]);try{
  p.reset({x:0,z:6},0);const a=simulate(p,2,{throttle:1,steer:.4});
  p.reset({x:0,z:6},0);const b=simulate(p,2,{throttle:1,steer:.4},1/120);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.04);
 }finally{p.dispose();}
});

test('tap navigation physically steers from the rack to all six entrances and the harbor',async()=>{
 const p=await createBikePhysics(obstacles);try{
  for(const target of [...buildings.map(b=>b.entry.cycling),{x:0,z:-46}]){
   p.reset(bikeStart,0);const path=findPath(bikeStart,target,cyclingObstacles(obstacles));assert.ok(path.length);
   for(let i=0;i<60*45&&path.length;i++)followBikePath(p,path,1/60);
   assert.equal(path.length,0,'path finishes '+JSON.stringify({target,pose:p.pose,path}));
   assert.ok(Math.hypot(p.pose.x-target.x,p.pose.z-target.z)<.25);
  }
 }finally{p.dispose();}
});
