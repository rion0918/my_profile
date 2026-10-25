import { BufferGeometry, type Object3D } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Construction-only cache: source attributes must be final before the first clone.
export function createStaticGeometryCache() {
  let indexed = new WeakMap<BufferGeometry, BufferGeometry>();
  const scratch = new Set<BufferGeometry>();
  return {
    clone(source: BufferGeometry) {
      if (source.index) return new BufferGeometry().copy(source);
      let geometry = indexed.get(source);
      if (!geometry) {
        geometry = mergeVertices(source, .000001);
        indexed.set(source, geometry);
        scratch.add(geometry);
      }
      return new BufferGeometry().copy(geometry);
    },
    dispose() {
      scratch.forEach(geometry => geometry.dispose());
      scratch.clear();
      indexed = new WeakMap();
    },
  };
}

export function releaseUnusedGeometries(root: Object3D, owned: Set<BufferGeometry>) {
  const live = new Set<BufferGeometry>();
  root.traverse(object => {
    if ("geometry" in object && object.geometry instanceof BufferGeometry) live.add(object.geometry);
  });
  for (const geometry of owned) if (!live.has(geometry)) {
    geometry.dispose();
    owned.delete(geometry);
  }
}
