import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../lib/world-layout.ts';
import { southEntrance } from '../lib/world-zones.ts';
import { findPath, isWalkable, getGroundHeight } from '../lib/world-navigation.ts';
import { buildStreetNetwork, containsStreetPoint } from '../lib/street-network.ts';
import { harbor } from '../lib/world-harbor.ts';
import { onsen } from '../lib/world-onsen.ts';

test('the south spawn has its own circular plaza while the central plaza stays intact',()=>{
  assert.deepEqual(layout.entrancePlaza,{...southEntrance,radius:4.5});
  assert.deepEqual(layout.plaza,{x:0,z:0,radius:3.8});
  const network=buildStreetNetwork(layout.roads.map((r,i)=>({curve:layout.roadCurves[i],width:r.width})),layout.plaza,[layout.entrancePlaza]);
  assert.equal(network.surface.length,1);
  for(let i=0;i<64;i++){
    const angle=i/64*Math.PI*2;
    const p={x:southEntrance.x+Math.cos(angle)*4.3,z:southEntrance.z+Math.sin(angle)*4.3};
    assert.equal(containsStreetPoint(network.surface,p.x,p.z),true,'mosaic is joined to the paving');
    assert.equal(containsStreetPoint(network.curb,p.x,p.z),false,'no curb through the entrance');
    assert.equal(getGroundHeight(p),0);
    assert.equal(isWalkable(p,layout.obstacles),true,'the whole circular floor is open');
    assert.equal(layout.isOnRoad(p),true,'planting respects the circular floor');
  }
  for(const target of [...layout.buildings.map(b=>b.entry.inside),onsen.indoor,onsen.outdoor,harbor.destination])
    assert.ok(findPath(southEntrance,target,layout.obstacles).length,'entrance reaches '+JSON.stringify(target));
});

test('flowers and welcoming lamps frame the entrance without sitting on the pavement',()=>{
  assert.equal(layout.entranceGardens?.length,2);
  assert.equal(layout.entranceLamps?.length,2);
  for(const p of [...layout.entranceGardens,...layout.entranceLamps]){
    const radius='radius' in p?p.radius:.25;
    for(let i=0;i<32;i++){
      const angle=i/32*Math.PI*2,edge={x:p.x+Math.cos(angle)*radius,z:p.z+Math.sin(angle)*radius};
      assert.equal(getGroundHeight(edge),0,'decoration stays on dry level ground');
      assert.equal(layout.isOnRoad(edge,.1),false,'entrance edges remain unobstructed');
    }
    assert.equal(isWalkable(p,layout.obstacles),false,'solid decorations have collision');
  }
});
