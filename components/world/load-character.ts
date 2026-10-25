import * as THREE from "three";
import { bikeGeometry, getBikeGrip } from "../../lib/world-bike.ts";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export async function loadCharacter(parent: THREE.Group) {
  const gltf = await new GLTFLoader().loadAsync("/models/rion-walker.glb");
  const model = gltf.scene;
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  parent.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const idle = mixer
    .clipAction(gltf.animations.find((c) => c.name === "Idle")!)
    .play();
  const walk = mixer
    .clipAction(gltf.animations.find((c) => c.name === "Walk")!)
    .play();
  const run = mixer
    .clipAction(gltf.animations.find((c) => c.name === "Run")!)
    .play();
  run.setEffectiveWeight(0);
  walk.setEffectiveWeight(0);
  mixer.update(0);
  let weight = 0,
    runWeight = 0;
  const jumpBones = ["UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR"]
    .map((name) => model.getObjectByName(name)!);
  const axis = new THREE.Vector3(), orientation = new THREE.Quaternion(), bend = new THREE.Quaternion();
  let jumpPose: THREE.Quaternion[] | null = null;
  const restoreJumpPose = () => {
    jumpPose?.forEach((q, i) => jumpBones[i].quaternion.copy(q));
    jumpPose = null;
  };
  const cycleBones = ["Body", "Hips", "Abdomen", "Torso", "Chest", "Neck", "Head", "UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "FootL", "FootR", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "WristL", "WristR"]
    .map(name => model.getObjectByName(name)!);
  let cyclePose: { position: THREE.Vector3; quaternion: THREE.Quaternion }[] | null = null;
  const restoreCyclePose = () => {
    cyclePose?.forEach((pose, i) => { cycleBones[i].position.copy(pose.position); cycleBones[i].quaternion.copy(pose.quaternion); });
    cyclePose = null;
  };
  const greetingBones=["Abdomen","Chest","Neck","UpperArmR","LowerArmR","WristR"].map(name=>model.getObjectByName(name)!);
  let greeting:{target:THREE.Vector3;remaining:number}|null=null,greetingPose:THREE.Quaternion[]|null=null;
  const restoreGreeting=()=>{greetingPose?.forEach((q,i)=>greetingBones[i].quaternion.copy(q));greetingPose=null;};
  const localPoint = (point: THREE.Vector3) => parent.localToWorld(point.clone());
  const aim = (bone: THREE.Object3D, target: THREE.Vector3) => {
    const q = bone.getWorldQuaternion(new THREE.Quaternion());
    const direction = target.clone().sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
    q.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0).applyQuaternion(q), direction));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
    bone.updateWorldMatrix(false, true);
  };
  const solveLimb = (upper: THREE.Object3D, lower: THREE.Object3D, target: THREE.Vector3, length: number, pole: THREE.Vector3) => {
    const root = upper.getWorldPosition(new THREE.Vector3());
    const direction = target.clone().sub(root), distance = direction.length(); direction.normalize();
    const first = lower.position.length(), reach = Math.min(distance, first + length - 0.0001);
    const along = (first * first - length * length + reach * reach) / (2 * reach);
    const bendDirection = pole.sub(direction.clone().multiplyScalar(pole.dot(direction))).normalize();
    const joint = root.clone().addScaledVector(direction, along).addScaledVector(bendDirection, Math.sqrt(Math.max(0, first * first - along * along)));
    aim(upper, joint); aim(lower, target);
  };
  const applyCyclePose = (phase: number, steering: number) => {
    cyclePose = cycleBones.map(b => ({ position: b.position.clone(), quaternion: b.quaternion.clone() }));
    const bone = (name: string) => model.getObjectByName(name)!;
    bone("Body").position.set(0, 0.9, bikeGeometry.saddle.z);
    bone("Body").quaternion.identity();
    for (const [name, angle] of [["Hips", 0.15], ["Abdomen", 0.3], ["Torso", 0.35], ["Chest", 0], ["Neck", -0.5], ["Head", -0.15]] as const)
      bone(name).quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
    parent.updateWorldMatrix(true, true);
    const worldRotation = parent.getWorldQuaternion(new THREE.Quaternion());
    const chest = bone("Chest");
    const turnAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(worldRotation)
      .applyQuaternion(chest.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
    chest.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(turnAxis, steering * 0.85));
    parent.updateWorldMatrix(true, true);
    for (const [side, sign] of [["L", 1], ["R", -1]] as const) {
      const angle = phase + (sign < 0 ? Math.PI : 0);
      const footTarget = localPoint(new THREE.Vector3(sign * 0.16, bikeGeometry.crank.y - Math.sin(angle) * bikeGeometry.crankRadius + 0.075,
        bikeGeometry.crank.z + Math.cos(angle) * bikeGeometry.crankRadius - 0.07));
      solveLimb(bone(`UpperLeg${side}`), bone(`LowerLeg${side}`), footTarget, 0.47, new THREE.Vector3(0, 0, 1).applyQuaternion(worldRotation));
      const foot = bone(`Foot${side}`);
      foot.position.copy(foot.parent!.worldToLocal(footTarget.clone()));
      const grip = getBikeGrip(sign, steering);
      const hand = localPoint(new THREE.Vector3(grip.x, grip.y, grip.z));
      solveLimb(bone(`UpperArm${side}`), bone(`LowerArm${side}`), hand, bone(`Wrist${side}`).position.length(), new THREE.Vector3(sign * 0.3, -1, -0.2).applyQuaternion(worldRotation));
    }
    parent.updateWorldMatrix(true, true);
  };
  return {
    greet(target:THREE.Vector3){greeting={target:target.clone(),remaining:1.6};},
    update(delta: number, speed: number, reduced: boolean, jumpHeight = 0, cyclePhase?: number, steering = 0) {
      if (delta <= 0) return;
      restoreGreeting();
      if(speed>.05||cyclePhase!==undefined)greeting=null;
      restoreJumpPose();
      restoreCyclePose();
      if (cyclePhase !== undefined) {
        run.setEffectiveWeight(0); walk.setEffectiveWeight(0); idle.setEffectiveWeight(1); mixer.update(0);
        applyCyclePose(cyclePhase, steering);
        return;
      }
      weight = THREE.MathUtils.damp(weight, speed > 0.05 ? 1 : 0, 10, delta);
      runWeight = THREE.MathUtils.damp(
        runWeight,
        THREE.MathUtils.smoothstep(speed, 3.5, 4.5),
        10,
        delta,
      );
      walk.setEffectiveWeight(weight * (1 - runWeight));
      run.setEffectiveWeight(weight * runWeight);
      run.setEffectiveTimeScale(Math.max(0.3, speed / 3.02));
      idle.setEffectiveWeight(1 - weight);
      // Calibrated from the planted foot: median backward velocity is 1.318 m/s.
      walk.setEffectiveTimeScale(Math.max(0.3, speed / 1.32));
      if (!reduced) mixer.update(delta);
      if (jumpHeight > 0) {
        jumpPose = jumpBones.map((bone) => bone.quaternion.clone());
        const tuck = Math.sqrt(Math.min(1, jumpHeight / 0.86));
        const lateral = new THREE.Vector3(1, 0, 0).applyQuaternion(model.getWorldQuaternion(orientation));
        jumpBones.forEach((bone, i) => {
          axis.copy(lateral).applyQuaternion(bone.parent!.getWorldQuaternion(orientation).invert());
          bend.setFromAxisAngle(axis, [-0.4, -0.4, 0.8, 0.8, -0.35, -0.35, -0.65, -0.65][i] * tuck);
          bone.quaternion.premultiply(bend);
        });
      }
      if(greeting&&!reduced&&jumpHeight===0){
        greeting.remaining=Math.max(0,greeting.remaining-delta);
        const weight=Math.sin((1-greeting.remaining/1.6)*Math.PI);
        if(greeting.remaining===0)greeting=null;
        else{
          greetingPose=greetingBones.map(b=>b.quaternion.clone());
          parent.updateWorldMatrix(true,true);
          const rotation=parent.getWorldQuaternion(new THREE.Quaternion()),abdomen=greetingBones[0];
          const leanAxis=new THREE.Vector3(1,0,0).applyQuaternion(rotation).applyQuaternion(abdomen.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
          abdomen.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(leanAxis,weight*.26));
          parent.updateWorldMatrix(true,true);
          const hand=greetingBones[5].getWorldPosition(new THREE.Vector3()).lerp(greeting.target,weight);
          solveLimb(greetingBones[3],greetingBones[4],hand,greetingBones[5].position.length(),new THREE.Vector3(-.6,-.5,1).applyQuaternion(rotation));
        }
      }
    },
    stop() {
      restoreGreeting();greeting=null;
      restoreJumpPose();
      restoreCyclePose();
      weight = 0;
      runWeight = 0;
      run.setEffectiveWeight(0);
      walk.setEffectiveWeight(0);
      idle.setEffectiveWeight(1);
      mixer.update(0);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      model.removeFromParent();
    },
  };
}
