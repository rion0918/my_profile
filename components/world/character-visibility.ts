import * as THREE from "three";

export function createCharacterVisibility(person: THREE.Object3D) {
  const focus = new THREE.Vector3();
  const buildings: {
    group: THREE.Group; bounds: THREE.Box3; blockers: THREE.Mesh[]; opacity: number;
    meshes: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
    materials: Map<THREE.Material, THREE.Material>;
  }[] = [];
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(), target = new THREE.Vector3(), hit = new THREE.Vector3();
  const intersections: THREE.Intersection[] = [];
  return {
    focus,
    update() {
      focus.set(0, 0.95, 0);
      person.localToWorld(focus);
    },
    trackBuilding(group: THREE.Group) {
      const copies = new Map<THREE.Material, THREE.Material>();
      const meshes = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(), blockers: THREE.Mesh[] = [];
      const copy = (original: THREE.Material) => {
        if (!copies.has(original)) {
          const material = original.clone();
          material.onBeforeCompile = original.onBeforeCompile;
          material.customProgramCacheKey = original.customProgramCacheKey;
          copies.set(original, material);
        }
        return copies.get(original)!;
      };
      group.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const original = object.material;
        meshes.set(object, original);
        const materials = Array.isArray(original) ? original : [original];
        if (materials.some(material => !material.transparent)) blockers.push(object);
        object.material = Array.isArray(original) ? original.map(copy) : copy(original);
      });
      buildings.push({ group, bounds: new THREE.Box3().setFromObject(group), blockers, opacity: 1, meshes, materials: copies });
    },
    fadeBuildings(camera: THREE.Camera, delta: number, reduced: boolean) {
      camera.getWorldDirection(direction);
      let animating = false;
      for (const building of buildings) {
        let blocked = false;
        if (building.group.visible) for (const height of [0, .55, -.55]) {
          target.copy(focus); target.y += height;
          const distance = direction.dot(target) - direction.dot(camera.position);
          ray.ray.origin.copy(target).addScaledVector(direction, -distance);
          ray.ray.direction.copy(direction); ray.far = distance - .2;
          if (distance <= .2 || !ray.ray.intersectBox(building.bounds, hit) || ray.ray.origin.distanceTo(hit) > ray.far) continue;
          intersections.length = 0;
          ray.intersectObjects(building.blockers, false, intersections);
          if (intersections.length) { blocked = true; break; }
        }
        const opacity = blocked ? .38 : 1;
        building.opacity = reduced ? opacity : THREE.MathUtils.damp(building.opacity, opacity, 14, delta);
        if (Math.abs(building.opacity - opacity) < .005) building.opacity = opacity;
        else animating = true;
        for (const [original, material] of building.materials) {
          const transparent = original.transparent || building.opacity < 1;
          if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
          material.opacity = original.opacity * building.opacity;
          material.depthWrite = building.opacity < 1 ? false : original.depthWrite;
          material.forceSinglePass = building.opacity < 1 || original.forceSinglePass;
          if (original instanceof THREE.MeshStandardMaterial && material instanceof THREE.MeshStandardMaterial) {
            material.emissive.copy(original.emissive); material.emissiveIntensity = original.emissiveIntensity;
          }
        }
      }
      return animating;
    },
    dispose() {
      for (const building of buildings) {
        building.meshes.forEach((material, mesh) => { mesh.material = material; });
        building.materials.forEach(material => material.dispose());
      }
      buildings.length = 0;
    },
    apply(material: THREE.MeshStandardMaterial|THREE.MeshBasicMaterial) {
      const compile = material.onBeforeCompile;
      const programKey = material.customProgramCacheKey();
      material.onBeforeCompile = function (shader, renderer) {
        compile.call(this, shader, renderer);
        shader.uniforms.characterFocus = { value: focus };
        shader.vertexShader = "varying vec3 occluderView;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <project_vertex>",
          "#include <project_vertex>\noccluderView = mvPosition.xyz;",
        );
        shader.fragmentShader = "varying vec3 occluderView; uniform vec3 characterFocus;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <alphatest_fragment>",
          `#include <alphatest_fragment>
          vec3 characterView = (viewMatrix * vec4(characterFocus, 1.)).xyz;
          vec2 offset = (occluderView.xy - characterView.xy) / vec2(.85, 1.25);
          if (occluderView.z > characterView.z + .2 && length(offset) < .825) discard;`,
        );
      };
      material.customProgramCacheKey = () => programKey + "|character-visibility-v2";
    },
  };
}
