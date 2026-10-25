import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterVisibility } from '../components/world/character-visibility.ts';

function buildingScene() {
  const person=new THREE.Group(),visibility=createCharacterVisibility(person);
  const material=new THREE.MeshStandardMaterial({color:0x356f5d}),geometry=new THREE.BoxGeometry(4,4,.5);
  const building=new THREE.Group(),wall=new THREE.Mesh(geometry,material);wall.position.set(0,2,3);building.add(wall);
  const neighbor=new THREE.Mesh(geometry,material);neighbor.position.set(8,2,3);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(0,2,10);camera.lookAt(0,1,0);
  visibility.trackBuilding(building);visibility.apply(material);
  return {person,visibility,material,geometry,building,wall,neighbor,camera};
}

test('a blocking building fades as a whole without cutting a hole or fading shared neighboring materials',()=>{
  const q=buildingScene();
  try{
    q.visibility.update();q.visibility.fadeBuildings(q.camera,.04,true);
    assert.ok(q.wall.material.transparent);
    assert.ok(q.wall.material.opacity>=.3&&q.wall.material.opacity<=.45,'the building remains visibly translucent');
    assert.equal(q.wall.material.depthWrite,false,'the translucent roof must not hide the person through its depth buffer');
    assert.notEqual(q.wall.material,q.material);
    assert.equal(q.neighbor.material,q.material);assert.equal(q.material.opacity,1);assert.equal(q.material.transparent,false);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    q.wall.material.onBeforeCompile(shader,{});
    assert.ok(!shader.fragmentShader.includes('characterFocus'),'the faded building has no torso-shaped cutout');
    q.person.position.x=6;q.visibility.update();q.visibility.fadeBuildings(q.camera,.04,true);
    assert.equal(q.wall.material.opacity,1);assert.equal(q.wall.material.transparent,false);assert.equal(q.wall.material.depthWrite,true);
  }finally{q.visibility.dispose();q.material.dispose();q.geometry.dispose();}
});

test('building fading follows camera occlusion, eases in both directions and releases its materials',()=>{
  const q=buildingScene(),faded=q.wall.material;let disposed=0;faded.addEventListener('dispose',()=>disposed++);
  try{
    q.visibility.update();assert.equal(q.visibility.fadeBuildings(q.camera,1/60,false),true);
    assert.ok(faded.opacity>.45&&faded.opacity<1,'fade begins gradually');
    for(let i=0;i<60;i++)q.visibility.fadeBuildings(q.camera,1/60,false);
    assert.ok(faded.opacity>=.3&&faded.opacity<=.45);
    q.material.emissive.setHex(0xffaa22);q.material.emissiveIntensity=.8;
    q.visibility.fadeBuildings(q.camera,1/60,false);
    assert.equal(faded.emissive.getHex(),0xffaa22);assert.equal(faded.emissiveIntensity,.8,'night lighting survives the material copy');
    q.camera.position.z=-10;q.camera.lookAt(0,1,0);
    assert.equal(q.visibility.fadeBuildings(q.camera,1/60,false),true);assert.ok(faded.opacity<1);
    for(let i=0;i<60;i++)q.visibility.fadeBuildings(q.camera,1/60,false);
    assert.equal(faded.opacity,1);assert.equal(faded.transparent,false,'a building behind the person stays opaque');
  }finally{q.visibility.dispose();q.material.dispose();q.geometry.dispose();}
  assert.equal(q.wall.material,q.material);assert.equal(disposed,1);
});

test('the see-through opening follows the actual torso, including jumps and bicycle banking', () => {
  const person = new THREE.Group(), visibility = createCharacterVisibility(person);
  for (const [x,y,z,bank] of [[-10,0.08,-7,0], [12,0.94,5,0], [-3,0.6,11,0.22]]) {
    person.position.set(x,y,z); person.rotation.set(0,0.7,bank);
    visibility.update();
    const torso = person.localToWorld(new THREE.Vector3(0,0.95,0));
    assert.ok(visibility.focus.distanceTo(torso)<1e-6);
    const camera = new THREE.OrthographicCamera(-12,12,6.3,-6.3,0.1,600);
    camera.position.copy(person.position).add(new THREE.Vector3(12,12.4,20));
    camera.lookAt(person.position); camera.updateMatrixWorld();
    const view = visibility.focus.clone().applyMatrix4(camera.matrixWorldInverse);
    const blocker = view.clone().add(new THREE.Vector3(0,0,4)).applyMatrix4(camera.matrixWorld);
    const a=blocker.project(camera), b=torso.project(camera);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6, 'the cutout aligns with the torso on screen, despite different world heights');
  }
});

test('visibility preserves foliage animation, shares the live focus and keeps distinct shader programs', () => {
  const visibility = createCharacterVisibility(new THREE.Group());
  const material = new THREE.MeshStandardMaterial();
  material.onBeforeCompile = shader => { shader.uniforms.natureTime={value:7}; shader.vertexShader='// foliage sway\n'+shader.vertexShader; };
  const previousKey = material.customProgramCacheKey();
  visibility.apply(material);
  const shader = {uniforms:{}, vertexShader:THREE.ShaderLib.standard.vertexShader, fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.natureTime.value,7);
  assert.equal(shader.uniforms.characterFocus.value,visibility.focus);
  assert.ok(shader.vertexShader.includes('// foliage sway'));
  assert.ok(!shader.fragmentShader.includes('gl_FragCoord'), 'moving the camera must not crawl screen-space grain across walls');
  assert.ok(!shader.fragmentShader.includes('float grain'), 'the torso opening has a continuous boundary without noisy wall fragments');
  assert.ok(material.customProgramCacheKey().startsWith(previousKey));
  assert.notEqual(material.customProgramCacheKey(),previousKey);
  assert.equal(material.transparent,false, 'retain opaque depth rendering');
  assert.equal(material.depthWrite,true);
  material.dispose();
});
