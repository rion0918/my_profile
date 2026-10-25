import * as THREE from "three";

export function createCharacterVisibility(person: THREE.Object3D) {
  const focus = new THREE.Vector3();
  return {
    focus,
    update() {
      focus.set(0, 0.95, 0);
      person.localToWorld(focus);
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
