import test from 'node:test';
import assert from 'node:assert/strict';
import { projectExhibits, isOnRoad, obstacles, buildings, trees } from '../lib/world-layout.ts';
import { products } from '../lib/products.ts';
import { isWalkable, findPath } from '../lib/world-navigation.ts';

test('real product screens stand beside their building without blocking streets or entrances',()=>{
  assert.equal(projectExhibits.length,products.length);
  for(const exhibit of projectExhibits){
    assert.ok(products.find(p=>p.slug===exhibit.id)?.media?.[0]);
    assert.equal(isOnRoad(exhibit,.8),false);
    for(const b of buildings)assert.ok(Math.hypot(exhibit.x-b.entry.x,exhibit.z-b.entry.z)>2.5);
    assert.equal(isWalkable(exhibit,obstacles),false,'the stand has a collider');
  }
  for(const b of buildings)assert.ok(findPath({x:0,z:6},b.entry.inside,obstacles).length,b.id);
});

test('product screen landmarks are 1.7 times larger, with matching clear footprints',()=>{
  for(const exhibit of projectExhibits){
    assert.equal(exhibit.scale,1.7);
    assert.ok(exhibit.width>=4.7 && exhibit.depth>=3.5,'reserve the enlarged screen and circular base');
    const c=Math.cos(exhibit.rotation),s=Math.sin(exhibit.rotation);
    for(const x of [-1,0,1])for(const z of [-1,0,1]){
      const p={x:exhibit.x+c*x*exhibit.width/2+s*z*exhibit.depth/2,z:exhibit.z-s*x*exhibit.width/2+c*z*exhibit.depth/2};
      assert.equal(isOnRoad(p,.1),false,'the enlarged installation clears the pavement');
      for(const b of buildings)assert.ok(Math.abs(p.x-b.x)>b.width/2||Math.abs(p.z-b.z)>b.depth/2,'the enlarged installation clears '+b.id);
    }
  }
});

test('tree crowns leave a clear viewing approach to the enlarged real screens',()=>{
 const length=Math.hypot(12,20);
 for(const exhibit of projectExhibits)for(let distance=2;distance<=7.5;distance+=.25){
   const p={x:exhibit.x+12/length*distance,z:exhibit.z+20/length*distance};
   for(const tree of trees)assert.ok(Math.hypot(p.x-tree.x,p.z-tree.z)>2.3,`${exhibit.id} is hidden by tree ${tree.x},${tree.z}`);
 }
});
