import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {buildings,obstacles,trees,benches,streetlights,isOnRoad} from '../lib/world-layout.ts';
import {findPath,isWalkable,getGroundHeight} from '../lib/world-navigation.ts';
import {cyclingObstacles} from '../lib/world-bike.ts';
import {onsen} from '../lib/world-onsen.ts';
import {harbor} from '../lib/world-harbor.ts';
import {gamingPC} from '../lib/world-gaming-pc.ts';

test('the carbonara kitchen occupies dry hobby land and preserves every destination',async()=>{
  const {pastaKitchen,isPastaClearing}=await import('../lib/world-pasta.ts');
  assert.ok(pastaKitchen.z+pastaKitchen.depth/2<0);
  for(let x=-pastaKitchen.width/2;x<=pastaKitchen.width/2;x+=.25)for(let z=-pastaKitchen.depth/2;z<=pastaKitchen.depth/2;z+=.25){
    const p={x:pastaKitchen.x+x,z:pastaKitchen.z+z};
    assert.equal(isOnRoad(p,.25),false,'no pavement under the kitchen');
    assert.equal(getGroundHeight(p),0,'level dry footing');
    assert.equal(isWalkable(p,obstacles),false,'the physical plinth has matching collision');
  }
  for(const prop of [...trees,...benches,...streetlights])assert.equal(isPastaClearing(prop,trees.includes(prop)?2.4:.2),false,'vegetation and furniture clear the kitchen and its viewing approach');
  for(const target of [pastaKitchen.approach,gamingPC.approach,onsen.indoor,onsen.outdoor,harbor.destination,...buildings.map(b=>b.entry.inside)])
    assert.ok(findPath({x:0,z:0},target,obstacles).length,'walking route '+JSON.stringify(target));
  assert.ok(findPath({x:0,z:0},pastaKitchen.approach,cyclingObstacles(obstacles)).length,'cycle to the kitchen');
});

test('the kitchen contains detailed three-dimensional carbonara, cooking tools and a readable hobby caption',async()=>{
  const {createPastaKitchen}=await import('../components/world/create-pasta-kitchen.ts');
  const {pastaKitchen}=await import('../lib/world-pasta.ts');
  const labels=[];globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},fillRect(){},fillText(value){labels.push(value);}})})};
  const font=new FontLoader().parse(JSON.parse(readFileSync(new URL('../components/world/assets/helvetiker_regular.typeface.json',import.meta.url))));
  const scene=new THREE.Scene(),kitchen=createPastaKitchen(scene,()=>{},font);
  try{
    const root=scene.getObjectByName('pasta-kitchen');assert.ok(root);
    assert.deepEqual([root.position.x,root.position.z],[pastaKitchen.x,pastaKitchen.z]);
    const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());assert.ok(size.y<4.6,'the food and title remain at a visible height');
    for(const name of ['plate','noodles','fork','guanciale','pepper','cheese','worktop','stove','ingredients','title']){
      const part=root.getObjectByName('pasta-'+name);assert.ok(part,'missing '+name);
      let vertices=0;part.traverse(o=>{if(o.isMesh)vertices+=o.geometry.getAttribute('position').count;});assert.ok(vertices>0,'actual geometry for '+name);
    }
    const noodles=root.getObjectByName('pasta-noodles');let noodleVertices=0;noodles.traverse(o=>{if(o.isMesh)noodleVertices+=o.geometry.getAttribute('position').count;});
    assert.ok(noodleVertices>30000,'the strands have actual depth and overlapping curves');
    const moundSize=new THREE.Box3().setFromObject(noodles).getSize(new THREE.Vector3());
    assert.ok(moundSize.y>1,'the serving has a raised, irregular nest silhouette rather than flat concentric layers');
    const lifted=root.getObjectByName('pasta-lifted-noodles');assert.ok(lifted,'separate strands connect the forkful back to the serving');
    assert.ok(new THREE.Box3().setFromObject(lifted).getSize(new THREE.Vector3()).y>.5,'the lifted strands drape down from the fork');
    const noodleMaterial=noodles.children.find(o=>o.isMesh).material;
    assert.ok(noodleMaterial.bumpMap&&noodleMaterial.envMap,'the sauce has surface relief and soft reflections, including in low mode');
    root.updateMatrixWorld(true);
    const toppings=root.getObjectByName('pasta-guanciale').children.find(o=>o.isInstancedMesh),matrix=new THREE.Matrix4();let supported=0;
    for(let i=0;i<toppings.count;i++){
      toppings.getMatrixAt(i,matrix);const point=new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(toppings.matrixWorld);
      const ray=new THREE.Raycaster(new THREE.Vector3(point.x,10,point.z),new THREE.Vector3(0,-1,0)),hit=ray.intersectObject(noodles,true)[0];
      if(hit&&point.y-hit.point.y>-.015&&point.y-hit.point.y<.16)supported++;
    }
    assert.ok(supported>=toppings.count*.9,'the browned toppings rest on the visible serving instead of floating or disappearing into lower layers');
    const plate=root.getObjectByName('pasta-plate'),center=plate.getWorldPosition(new THREE.Vector3());
    const plateRay=new THREE.Raycaster(new THREE.Vector3(center.x+2.1,10,center.z),new THREE.Vector3(0,-1,0));
    const rimHits=plateRay.intersectObjects(plate.children.filter(o=>o.isMesh),false);
    assert.ok(rimHits.length&&rimHits[0].point.y>center.y+.49,'the glazed upper face of the concave plate faces upward');
    const title=root.getObjectByName('pasta-title').children.find(o=>o.geometry?.type==='TextGeometry');
    title.geometry.computeBoundingBox();const titleBox=title.geometry.boundingBox,direction=new THREE.Vector3(12,12.4,20).normalize();
    for(const x of [titleBox.min.x/2,0,titleBox.max.x/2]){
      const target=title.localToWorld(new THREE.Vector3(x,titleBox.max.y-.03,titleBox.max.z+.01));
      const ray=new THREE.Raycaster(target.clone().addScaledVector(direction,30),direction.clone().negate());
      assert.ok(ray.intersectObject(root.getObjectByName('pasta-worktop'),true).every(hit=>hit.distance>=29.99),'the canopy does not cover the main title');
    }
    assert.ok(labels.some(s=>s.includes('パスタ作りが趣味')));assert.ok(labels.some(s=>s.includes('カルボナーラ')));
    const geometry=[],steams=[];let draws=0;root.traverse(o=>{if(o.isMesh){geometry.push(o.geometry);draws++;}if(o.name==='pasta-steam')steams.push(o);});
    assert.ok(draws<90,'small details are batched rather than submitted one by one');assert.ok(steams.length);
    kitchen.update(0,false);const before=steams.map(o=>o.position.y);kitchen.update(1,false);assert.ok(steams.some((o,i)=>o.position.y!==before[i]));
    kitchen.update(2,true);assert.ok(steams.every(o=>!o.visible),'low settings and reduced motion rest the optional steam');
    const after=[];root.traverse(o=>{if(o.isMesh)after.push(o.geometry);if(o.isLight){assert.equal(o.castShadow,false);assert.equal(o.visible,false);}});
    assert.deepEqual(after,geometry,'both quality modes keep the same detailed kitchen');
    kitchen.update(3,false);kitchen.updateTime(1);assert.ok(steams.every(o=>o.visible));
    const resources=new Set();root.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});
    let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
    kitchen.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,resources.size,'all display resources are released');
  }finally{delete globalThis.document;}
});
