import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPoint } from '../lib/world-map.ts';
import { createWorldMapData } from '../lib/world-map-data.ts';
import { buildings } from '../lib/world-layout.ts';

test('the guide map uses the actual street network, buildings and harbor coordinates',()=>{
  const map=createWorldMapData();
  assert.equal(map.buildings.length,7);
  for(const building of buildings){
    const marker=map.buildings.find(b=>b.id===building.id);
    assert.deepEqual({x:marker.x,y:marker.y},mapPoint(building));
  }
  assert.ok(map.roads.length>=10 && map.roads.every(r=>r.path.startsWith('M')));
  assert.ok(map.coast.startsWith('M')&&map.coast.endsWith('Z'));
  assert.ok(mapPoint({x:0,z:-46}).y<mapPoint({x:0,z:6}).y);
  assert.deepEqual(mapPoint({x:-48,z:-51}),{x:0,y:0});
  assert.deepEqual(mapPoint({x:48,z:43}),{x:100,y:100});
});

test('map identifies four required stops, three optional halls and both districts',()=>{
 const map=createWorldMapData();
 assert.deepEqual(Object.fromEntries(map.buildings.map(b=>[b.id,b.marker])),{experience:'02',yoin:'03','pop-reminder':'04',history:'01',github:'G',zenn:'Z',x:'X'});
 assert.deepEqual(map.entrance,mapPoint({x:0,z:31}));
 assert.deepEqual(map.plaza,mapPoint({x:0,z:0}));
 assert.equal(map.boundary,map.plaza.y);
});

test('server-prepared pavement survives serialization and keeps every hall connected', async()=>{
 const { containsStreetPoint }=await import('../lib/street-network.ts');
 const map=createWorldMapData();
 assert.ok(map.streets?.surface?.length,'prepare the expensive street union before sending the page');
 const streets=JSON.parse(JSON.stringify(map.streets));
 assert.deepEqual(streets,map.streets);
 for(const b of buildings)assert.ok(containsStreetPoint(streets.surface,b.entry.outside.x,b.entry.outside.z),b.id);
 assert.ok(containsStreetPoint(streets.surface,0,31));
 assert.ok(containsStreetPoint(streets.surface,0,0));
});
