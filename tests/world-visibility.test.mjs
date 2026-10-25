import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterVisibility } from '../components/world/character-visibility.ts';

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
