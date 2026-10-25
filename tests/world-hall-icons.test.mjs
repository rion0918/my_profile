import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { halls } from '../lib/world-halls.ts';
import * as layout from '../lib/world-layout.ts';
import { findPath, isWalkable, getGroundHeight } from '../lib/world-navigation.ts';
import { cyclingObstacles } from '../lib/world-bike.ts';

test('GitHub, Zenn and X have official ground-level marks, with local high-resolution assets',async()=>{
  assert.deepEqual(halls.filter(h=>h.icon).map(h=>h.id),['github','zenn','x']);
  const { hallIcons }=await import('../components/world/create-hall-icon.ts');
  for(const hall of halls.filter(h=>h.icon)){
    assert.equal(hall.roofIcon,undefined,'there is no longer a rooftop icon');
    const icon=hallIcons[hall.icon];
    const svg=readFileSync(new URL('../public'+icon.source,import.meta.url));
    assert.equal(createHash('sha256').update(svg).digest('hex'),icon.sha256,'unaltered official SVG');
    const png=readFileSync(new URL('../public'+icon.texture,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    assert.ok(width>=1024,'the logo stays sharp when zooming');
    assert.ok(Math.abs(width/height-icon.width/icon.height)<.002,'official proportions are preserved');
    const source=svg.toString();
    assert.ok(source.includes(hall.id==='zenn'?'#3EA8FF':'fill="white"'),'the official white / blue artwork is retained');
  }
});

test('ground-level logos sit on solid mounts and face correctly on both sides without lighting effects',async()=>{
  const { createHallIcon, hallIcons }=await import('../components/world/create-hall-icon.ts');
  for(const id of ['github','zenn','x']){
    const texture=new THREE.Texture(),group=createHallIcon(id,texture),definition=hallIcons[id];
    const site=layout.hallIconSites.find(s=>s.id===id);assert.ok(site);
    assert.equal(group.name,'service-icon-'+id);assert.equal(group.userData.brand,id);
    assert.equal(group.position.y,0);
    group.scale.setScalar(site.scale);
    const bounds=new THREE.Box3().setFromObject(group);
    assert.ok(Math.abs(bounds.min.y)<.001,'mounts rest on the ground');
    assert.ok(bounds.max.y<=3.1,'the whole sign stays below the building roof');
    assert.ok(bounds.max.x-bounds.min.x<3.6);
    assert.ok(bounds.max.z-bounds.min.z<2.7);
    for(const [side,angle] of [['front',0],['back',Math.PI]]){
      const face=group.getObjectByName('hall-icon-'+side);assert.ok(face?.isMesh);
      assert.equal(face.rotation.y,angle,'the back is readable rather than mirrored');
      assert.equal(face.material.map,texture);assert.equal(face.material.color.getHex(),0xffffff,'do not tint the official artwork');
      assert.equal(face.material.toneMapped,false);assert.equal(face.castShadow,false);
      assert.ok(!face.children.length,'no glow, gradients or decorative effects on the mark');
      assert.equal(face.geometry.parameters.width,definition.width);assert.equal(face.geometry.parameters.height,definition.height);
    }
    assert.ok(group.getObjectByName('hall-icon-mount')?.isMesh,'a physical ground mount');
    assert.ok(!group.children.some(o=>o.isLight),'no additional light passes');
    const geometries=new Set(),materials=new Set();group.traverse(o=>{
      if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}
    });
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();texture.dispose();
  }
});

test('the three icon monuments stand beside their halls without blocking paths, doors or vegetation',()=>{
  const sites=layout.hallIconSites;assert.equal(sites?.length,3);
  for(const site of sites){
    const hall=layout.buildings.find(b=>b.id===site.id),c=Math.cos(site.rotation),s=Math.sin(site.rotation);
    assert.ok(Math.abs(site.x-hall.x)>hall.width/2||Math.abs(site.z-hall.z)>hall.depth/2,'outside the building');
    for(let x=-site.width/2;x<=site.width/2;x+=.1)for(let z=-site.depth/2;z<=site.depth/2;z+=.1){
      const p={x:site.x+c*x+s*z,z:site.z-s*x+c*z};
      assert.equal(layout.isOnRoad(p,.25),false,'the pavement stays clear');
      assert.equal(getGroundHeight(p),0,'the entire base stands on level land');
      assert.equal(isWalkable(p,layout.obstacles),false,'the physical sign has collision');
      assert.ok(Math.abs(p.x-hall.x)>hall.width/2||Math.abs(p.z-hall.z)>hall.depth/2,'no overlap with the building');
    }
    for(const tree of layout.trees)assert.ok(Math.hypot(tree.x-site.x,tree.z-site.z)>=4.1,'crowns do not obscure the icon');
    const direction=new THREE.Vector3(12,12.4,20).normalize();
    for(const x of [-1.09,0,1.09])for(const y of [.33,1.42,2.51]){
      const target=new THREE.Vector3(site.x+x*site.scale*c,y*site.scale,site.z-x*site.scale*s);
      const origin=target.clone().addScaledVector(direction,30),ray=new THREE.Ray(origin,direction.clone().negate());
      for(const tree of layout.trees){
        const crown=new THREE.Box3(new THREE.Vector3(tree.x-2,2.6,tree.z-1.9),new THREE.Vector3(tree.x+2,5.5,tree.z+1.9));
        const hit=ray.intersectBox(crown,new THREE.Vector3());
        assert.ok(!hit||origin.distanceTo(hit)>30,`${site.id} icon is hidden by the tree at ${tree.x},${tree.z}`);
      }
      for(const building of layout.buildings){
        const bounds=new THREE.Box3(new THREE.Vector3(building.x-building.width/2,0,building.z-building.depth/2),new THREE.Vector3(building.x+building.width/2,building.height,building.z+building.depth/2));
        const hit=ray.intersectBox(bounds,new THREE.Vector3());
        assert.ok(!hit||origin.distanceTo(hit)>30,`${site.id} icon is hidden by ${building.id}`);
      }
    }
    for(const obstacles of [layout.obstacles,cyclingObstacles(layout.obstacles)])
      assert.ok(findPath({x:0,z:0},hall.entry.outside,obstacles).length,'walking and cycling still reach '+site.id);
    assert.ok(findPath(hall.entry.outside,hall.entry.inside,layout.obstacles).length,'the hall entrance stays open');
  }
});
