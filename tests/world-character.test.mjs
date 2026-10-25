import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadCharacter } from "../components/world/load-character.ts";

globalThis.ProgressEvent = class {
  constructor(type, details) {
    Object.assign(this, { type }, details);
  }
};

test("a zero-duration frame does not freeze the subsequent sprint animation", async () => {
  const bytes = await fs.readFile(
    new URL("../public/models/rion-walker.glb", import.meta.url),
  );
  THREE.DefaultLoadingManager.setURLModifier((url) =>
    url.startsWith("/models/")
      ? `data:application/octet-stream;base64,${bytes.toString("base64")}`
      : url,
  );
  const parent = new THREE.Group(),
    character = await loadCharacter(parent);
  try {
    // A repeated rAF timestamp makes distance / elapsed time 0 / 0.
    character.update(0, Number.NaN, false);
    const foot = parent.getObjectByName("FootL"),
      positions = [];
    for (let i = 0; i < 60; i++) {
      character.update(1 / 60, 4.6, false);
      parent.updateMatrixWorld(true);
      positions.push(foot.getWorldPosition(new THREE.Vector3()));
    }
    assert.ok(
      positions.every(
        (p) =>
          Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
      ),
    );
    assert.ok(
      Math.max(...positions.map((p) => p.distanceTo(positions[0]))) > 0.2,
      "the foot must cycle while sprinting",
    );
  } finally {
    character.dispose();
    THREE.DefaultLoadingManager.setURLModifier(undefined);
  }
});

test("the faster ordinary movement retains the walk gait instead of blending into a run", async () => {
  const bytes = await fs.readFile(
    new URL("../public/models/rion-walker.glb", import.meta.url),
  );
  THREE.DefaultLoadingManager.setURLModifier((url) =>
    url.startsWith("/models/")
      ? `data:application/octet-stream;base64,${bytes.toString("base64")}`
      : url,
  );
  const parent = new THREE.Group(),
    character = await loadCharacter(parent),
    reference = await new GLTFLoader().loadAsync("/models/rion-walker.glb"),
    mixer = new THREE.AnimationMixer(reference.scene);
  mixer.clipAction(reference.animations.find((clip) => clip.name === "Walk"))
    .setEffectiveTimeScale(3.2 / 1.32).play();
  try {
    const errors = [];
    for (let i = 0; i < 90; i++) {
      character.update(1 / 60, 3.2, false);
      mixer.update(1 / 60);
      parent.updateMatrixWorld(true);
      reference.scene.updateMatrixWorld(true);
      if (i >= 60) errors.push(
        parent.getObjectByName("FootL").getWorldPosition(new THREE.Vector3())
          .distanceTo(reference.scene.getObjectByName("FootL")
            .getWorldPosition(new THREE.Vector3())),
      );
    }
    assert.ok(Math.max(...errors) < 0.01, "normal movement should use the walk pose");
  } finally {
    mixer.stopAllAction();
    mixer.uncacheRoot(reference.scene);
    reference.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const material of Array.isArray(o.material) ? o.material : [o.material])
          material.dispose();
      }
    });
    character.dispose();
    THREE.DefaultLoadingManager.setURLModifier(undefined);
  }
});

test("jump knees bend forward without spreading sideways or accumulating a pose", async () => {
  const bytes = await fs.readFile(new URL("../public/models/rion-walker.glb", import.meta.url));
  THREE.DefaultLoadingManager.setURLModifier((url) => url.startsWith('/models/')
    ? `data:application/octet-stream;base64,${bytes.toString('base64')}` : url);
  const parent = new THREE.Group(), character = await loadCharacter(parent);
  try {
    const knees = ['LowerLegL', 'LowerLegR'].map((name) => parent.getObjectByName(name));
    const position = (bone) => bone.getWorldPosition(new THREE.Vector3());
    const grounded = knees.map(position);
    character.update(1 / 60, 0, true, 0.85);
    const airborne = knees.map(position);
    airborne.forEach((p, i) => {
      assert.ok(Math.abs(p.x - grounded[i].x) < 0.005, 'knees stay aligned with the hips');
      assert.ok(p.z - grounded[i].z > 0.08, 'knees tuck forward');
    });
    for (let i = 0; i < 60; i++) character.update(1 / 60, 0, true, 0.85);
    knees.forEach((bone, i) => assert.ok(position(bone).distanceTo(airborne[i]) < 0.001));
    character.update(1 / 60, 0, true, 0);
    knees.forEach((bone, i) => assert.ok(position(bone).distanceTo(grounded[i]) < 0.001));
  } finally {
    character.dispose();
    THREE.DefaultLoadingManager.setURLModifier(undefined);
  }
});

test('cycling keeps hands on the grips and feet on opposite pedals, then restores the walking pose', async () => {
  const bytes = await fs.readFile(new URL('../public/models/rion-walker.glb', import.meta.url));
  THREE.DefaultLoadingManager.setURLModifier(url => url.startsWith('/models/') ? `data:application/octet-stream;base64,${bytes.toString('base64')}` : url);
  const parent = new THREE.Group(), character = await loadCharacter(parent);
  try {
    const point = name => parent.getObjectByName(name).getWorldPosition(new THREE.Vector3());
    const standing = point('Body');
    const feet = [];
    for (let i = 0; i < 90; i++) {
      const phase = i / 90 * Math.PI * 2;
      character.update(1 / 60, 6, false, 0, phase);
      parent.updateMatrixWorld(true);
      for (const [side, sign] of [['L', 1], ['R', -1]]) {
        const hand = point(`Wrist${side}`);
        assert.ok(hand.distanceTo(new THREE.Vector3(sign * 0.25, 1.18, 0.44)) < 0.025, 'hands stay on the handlebar');
        const foot = point(`Foot${side}`);
        assert.ok(Math.abs(foot.x - sign * 0.16) < 0.025);
        assert.ok(foot.y > 0.28 && foot.y < 0.64, 'feet stay above ground');
      }
      feet.push(point('FootL'));
    }
    assert.ok(Math.max(...feet.map(p => p.distanceTo(feet[0]))) > 0.25, 'feet pedal with the crank');
    character.stop();
    character.update(1 / 60, 0, true, 0, 1.2);
    const parked = point('Body');
    for (let i = 0; i < 60; i++) character.update(1 / 60, 0, true, 0, 1.2);
    assert.ok(point('Body').distanceTo(parked) < 0.001, 'pose does not accumulate');
    character.stop();
    assert.ok(point('Body').distanceTo(standing) < 0.001, 'dismount restores the original pose');
  } finally {
    character.dispose();
    THREE.DefaultLoadingManager.setURLModifier(undefined);
  }
});

test('a riding character keeps both hands on the turned handlebar', async () => {
  const bytes = await fs.readFile(new URL('../public/models/rion-walker.glb', import.meta.url));
  THREE.DefaultLoadingManager.setURLModifier(url => url.startsWith('/models/') ? `data:application/octet-stream;base64,${bytes.toString('base64')}` : url);
  const parent = new THREE.Group(), character = await loadCharacter(parent);
  try {
    parent.rotation.set(0, 0.7, -0.15);
    for(const steering of [-.6,.6]){
      character.update(1/60,4,false,0,1.2,steering);
      parent.updateMatrixWorld(true);
      for(const [side,sign] of [['L',1],['R',-1]]){
        const x=sign*.25,z=.44-.48;
        const expected=parent.localToWorld(new THREE.Vector3(Math.cos(steering)*x+Math.sin(steering)*z,1.18,.48-Math.sin(steering)*x+Math.cos(steering)*z));
        const actual=parent.getObjectByName(`Wrist${side}`).getWorldPosition(new THREE.Vector3());
        assert.ok(actual.distanceTo(expected)<.025,'hands follow the steering pivot');
      }
    }
  }finally{character.dispose();THREE.DefaultLoadingManager.setURLModifier(undefined);}
});
