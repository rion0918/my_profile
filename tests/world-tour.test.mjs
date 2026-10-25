import test from 'node:test';
import assert from 'node:assert/strict';
import { buildings, obstacles, roadCurves, roads, projectExhibits } from '../lib/world-layout.ts';
import { findPath, isWalkable, restorePosition } from '../lib/world-navigation.ts';
import { harbor } from '../lib/world-harbor.ts';
import { onsen } from '../lib/world-onsen.ts';

test('the recruiting street puts the seven halls in their positions', () => {
  assert.deepEqual(buildings.map(({id,x,z})=>({id,x,z})), [
    {id:'experience',x:8,z:23}, {id:'yoin',x:-8,z:6},
    {id:'pop-reminder',x:8,z:6}, {id:'history',x:-8,z:23},
    {id:'github',x:-22,z:14}, {id:'zenn',x:22,z:14},
    {id:'x',x:-32,z:7},
  ]);
  for(const exhibit of projectExhibits){
    const b=buildings.find(b=>b.id===exhibit.id);
    assert.ok(Math.hypot(exhibit.x-b.x,exhibit.z-b.z)<7,'screens move with their building');
  }
});

test('the entrance and northern fork reach every exhibit and both hobby destinations', () => {
  for(const start of [{x:0,z:31},{x:0,z:0}]) {
    assert.ok(isWalkable(start,obstacles));
    for(const target of [...buildings.map(b=>b.entry.inside),onsen.outdoor,onsen.indoor,harbor.destination]) {
      const path=findPath(start,target,obstacles);
      assert.ok(path.length,`route ${JSON.stringify(start)} -> ${JSON.stringify(target)}`);
      let previous=start;
      for(const p of path){
        for(let t=0;t<=1;t+=.05) assert.ok(isWalkable({x:previous.x+(p.x-previous.x)*t,z:previous.z+(p.z-previous.z)*t},obstacles));
        previous=p;
      }
    }
  }
});

test('street pavement clears the relocated building bodies', () => {
  roadCurves.forEach((curve,index)=>{
    for(const p of curve.getPoints(500)) for(const b of buildings){
      // A building's own branch deliberately reaches its doorway.
      if(index===5+buildings.indexOf(b))continue;
      const margin=roads[index].width/2;
      assert.ok(!(Math.abs(p.x-b.x)<b.width/2+margin && Math.abs(p.z-b.z)<b.depth/2+margin),`street ${index} crosses ${b.id} at ${p.x},${p.z}`);
    }
  });
});

test('previous-layout saves reset to the south entrance, new saves can resume', () => {
  for(const version of [2,3,4])assert.deepEqual(restorePosition(JSON.stringify({version,x:0,z:6}),obstacles),{x:0,z:31});
  assert.deepEqual(restorePosition('{"version":5,"x":0,"z":0}',obstacles),{x:0,z:0});
});

test('removed roadside boards leave their former footings walkable',()=>{
  for(const [x,z] of [
    [12.938642456536023,28.284621926586535],[-12.6446655173924,15.695],
    [12.6446655173924,15.695],[-12.566249731000617,33.337225065723814],
    [-16.711652184837945,15.819197956564306],[16.711652184837945,15.819197956564306],
    [4.9779473893201915,-2.55],
  ])assert.ok(isWalkable({x,z},obstacles),`removed board at ${x},${z} must not block walking`);
});

test('the bike station clears the relocated profile building', async()=>{
  const {bikeStation}=await import('../lib/world-bike.ts');
  for(const b of buildings)assert.ok(Math.abs(b.x-bikeStation.x)>(b.width+bikeStation.width)/2 || Math.abs(b.z-bikeStation.z)>(b.depth+bikeStation.depth)/2);
});

test('all recruiting buildings and screens stay south of the plaza',()=>{
  for(const b of buildings)assert.ok(b.z-b.depth/2>0,b.id);
  for(const p of projectExhibits)assert.ok(p.z-Math.hypot(p.width,p.depth)/2>0,p.id);
});
