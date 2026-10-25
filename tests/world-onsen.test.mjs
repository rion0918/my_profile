import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { onsen, onsenObstacles, onsenBambooGroves, isOnsenClearing, isInsideBathhouse } from '../lib/world-onsen.ts';
import { obstacles, trees, streetlights, benches, roadCurves, roads } from '../lib/world-layout.ts';
import { findPath, isWalkable, moveCharacter, getGroundHeight } from '../lib/world-navigation.ts';
import { createWorldMapData } from '../lib/world-map-data.ts';
import { mapPoint } from '../lib/world-map.ts';
import { createOnsen } from '../components/world/create-onsen.ts';

test('the onsen sits behind town and both baths are reachable without crossing walls or water', () => {
  assert.ok(onsen.z < -20);
  assert.ok(onsen.outdoorBath.z>onsen.bathhouse.z+onsen.bathhouse.depth/2,'the open-air bath is in front of the indoor building');
  for (const target of [onsen.entry, onsen.outdoor, onsen.indoor]) {
    const path = findPath({ x: 0, z: 6 }, target, obstacles);
    assert.ok(path.length, JSON.stringify(target));
    let previous = { x: 0, z: 6 };
    for (const point of path) {
      for (let i = 0; i <= 20; i++) assert.ok(isWalkable({
        x: previous.x + (point.x - previous.x) * i / 20,
        z: previous.z + (point.z - previous.z) * i / 20,
      }, obstacles));
      previous = point;
    }
  }
  assert.equal(isInsideBathhouse(onsen.indoor), true);
  assert.equal(isInsideBathhouse(onsen.outdoor), false);
  for (const bath of [onsen.outdoorBath, onsen.indoorBath]) {
    assert.equal(isWalkable(bath, obstacles), false);
    assert.ok(onsenObstacles.some(o => o.x === bath.x && o.z === bath.z));
  }
  const wall = onsenObstacles[0];
  assert.equal(isWalkable(wall, obstacles), false);
  const moved = moveCharacter(onsen.outdoor, { x: onsen.outdoorBath.x-onsen.outdoor.x, z: onsen.outdoorBath.z-onsen.outdoor.z }, obstacles);
  assert.ok(Math.hypot(moved.x-onsen.outdoorBath.x,moved.z-onsen.outdoorBath.z)>1.5,'bath rim stops a dash');
});

test('the organic garden connects the falls, three pottery baths and a visible indoor threshold',async()=>{
  const {onsenBoundary}=await import('../lib/world-onsen.ts');
  assert.ok(onsenBoundary?.length>20,'the ground and map use a curved, shared outline');
  assert.equal(onsen.potBaths.length,3);
  for(const pot of onsen.potBaths){assert.ok(findPath(onsen.outdoor,pot.approach,obstacles).length);assert.equal(isWalkable(pot,obstacles),false);}
  assert.equal(isInsideBathhouse(onsen.doorApproach),false);assert.ok(findPath(onsen.doorApproach,onsen.indoor,obstacles).length);
  for(const dx of [-.5,0,.5])assert.ok(isWalkable({x:onsen.indoor.x+dx,z:onsen.bathhouse.z+onsen.bathhouse.depth/2},obstacles),'the doorway admits a person without clipping a wall');
  for(const point of onsenBoundary)assert.equal(getGroundHeight(point),0,'the garden follows dry land within the existing coastline');
  assert.ok(createWorldMapData().onsen.outline.startsWith('M'),'the guide shows the real garden outline');
  for(const p of onsenBambooGroves)assert.ok(Math.abs(p.x-onsen.bathhouse.x)>onsen.bathhouse.width/2+.6||Math.abs(p.z-onsen.bathhouse.z)>onsen.bathhouse.depth/2+.6,'bamboo culms stand outside the roof eaves');
});

test('the new site keeps streets and existing furniture clear and appears in the guide map', () => {
  for (const item of [...trees, ...streetlights, ...benches]) {
    assert.equal(isOnsenClearing(item, trees.includes(item) ? 2.3 : 0.3), false, JSON.stringify(item));
  }
  for (let x = onsen.x - onsen.width / 2; x <= onsen.x + onsen.width / 2; x += 0.5)
    for (let z = onsen.z - onsen.depth / 2; z <= onsen.z + onsen.depth / 2; z += 0.5)
      if(isOnsenClearing({x,z}))assert.equal(getGroundHeight({ x, z }), 0, 'the terrace stays on dry, level land');
  for (let index = 0; index < roadCurves.length; index++) {
    for (const p of roadCurves[index].getPoints(150)) {
      for (const o of onsenObstacles) assert.ok(
        Math.abs(p.x - o.x) > o.width / 2 + roads[index].width / 2 ||
        Math.abs(p.z - o.z) > o.depth / 2 + roads[index].width / 2,
        'onsen walls leave the existing streets open',
      );
    }
  }
  assert.deepEqual({ x: createWorldMapData().onsen.x, y: createWorldMapData().onsen.y }, mapPoint(onsen));
  const promenade=roadCurves[roads.findIndex(r=>r.closed)];
  for(const p of promenade.getPoints(1200))assert.ok(isWalkable(p,obstacles),'the coastal walk continues past the garden and the harbor railings');
});

test('the bathhouse has a real roof, reveals its interior on entry, rests in low settings and disposes resources', () => {
  const context = { fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {} };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const scene = new THREE.Scene(), world = createOnsen(scene, () => {});
  try {
    const roof = scene.getObjectByName('onsen-roof');
    assert.ok(roof && roof.children.length > 0);
    for(const name of ['onsen-waterfall','onsen-pot-baths','onsen-bamboo','onsen-ferns','onsen-entry'])assert.ok(scene.getObjectByName(name)?.children.length,'real geometry for '+name);
    scene.updateMatrixWorld(true);
    const walls=[scene.getObjectByName('onsen-bathhouse'),scene.getObjectByName('onsen-cutaway')];
    const h=onsen.bathhouse;
    for(const y of [.35,.6,1.25])for(const [origin,direction] of [
      [new THREE.Vector3(-24.2,y,h.z+h.depth/2+1),new THREE.Vector3(0,0,-1)],
      [new THREE.Vector3(h.x+h.width/2+1,y,h.z-.7),new THREE.Vector3(-1,0,0)],
    ]){
      const hits=new THREE.Raycaster(origin,direction,0,1.3).intersectObjects(walls,true);
      assert.ok(hits.length,'the exterior wall still encloses the bathhouse');
      for(let i=1;i<hits.length;i++)assert.ok(hits[i].distance-hits[i-1].distance>.001,'exterior walls have no coplanar faces that fight for depth during movement');
    }
    const bathWater=[];
    scene.traverse(o=>{if(o.isMesh&&o.material.uniforms?.waterLight&&!o.name)bathWater.push(o.material);});
    assert.equal(bathWater.length,5,'the outdoor, indoor and three pottery baths share clear water');
    for(const m of bathWater){assert.ok(m.transparent&&!m.depthWrite);assert.ok(m.uniforms.waterOpacity?.value>=.5&&m.uniforms.waterOpacity.value<=.75,'bath water reveals the basin beneath it while retaining its color');}
    const falls=scene.getObjectByName('onsen-waterfall'),sheets=falls.children.filter(o=>o.name==='onsen-cascade'),rocks=falls.children.filter(o=>o.isMesh&&!o.material.transparent),direction=new THREE.Vector3(12,12.4,20).normalize();
    assert.equal(sheets.length,3,'three actual cascade surfaces descend into the outdoor bath');
    for(const sheet of sheets)for(const row of [3,8,13,18,23]){
      const point=new THREE.Vector3().fromBufferAttribute(sheet.geometry.getAttribute('position'),row*9+4).applyMatrix4(sheet.matrixWorld);
      const ray=new THREE.Raycaster(point.clone().addScaledVector(direction,20),direction.clone().negate());
      assert.ok(ray.intersectObjects(rocks,false).every(hit=>hit.distance>19.97),'the waterfall remains visible in front of its rock face');
    }
    const original = [];
    scene.traverse(o => { if (o instanceof THREE.Mesh) original.push(o.geometry); });
    world.update(0, onsen.outdoor, false);
    assert.equal(roof.visible, true);
    world.update(.5,onsen.doorApproach,false);assert.equal(roof.visible,false,'the roof clears the view before entering the doorway');
    world.update(1, onsen.indoor, false);
    assert.equal(roof.visible, false);assert.equal(scene.getObjectByName('onsen-cutaway').visible,false,'the foreground walls also clear the indoor view');
    world.update(2, onsen.indoor, true);
    assert.equal(roof.visible, false, 'roof behavior is identical in low settings');
    const steam = scene.getObjectByName('onsen-steam');
    assert.equal(steam.visible, false);
    const water = [];
    scene.traverse(o => { if (o instanceof THREE.Mesh && o.material.uniforms?.time) water.push(o.material); });
    assert.ok(water.length>=5,'the rock bath, indoor bath and pottery baths all contain actual water surfaces');
    assert.ok(water.every(material => material.uniforms.time.value === 0), 'low settings freeze both water surfaces');
    world.update(3, onsen.outdoor, false);
    assert.equal(roof.visible, true); assert.equal(steam.visible, true);
    assert.ok(water.every(material => material.uniforms.time.value === 3));
    const after = []; scene.traverse(o => { if (o instanceof THREE.Mesh) after.push(o.geometry); });
    assert.deepEqual(after, original, 'changing settings keeps all bath and building geometry');
    const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.isInstancedMesh)resources.add(o);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});
    let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
    world.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,resources.size,'all garden geometry, instancing, textures and materials are released');

  } finally { world.dispose(); delete globalThis.document; }
});
