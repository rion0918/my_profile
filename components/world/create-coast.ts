import * as THREE from "three";
import {
  coastPoint,
  distanceToShore,
  getGroundHeight,
} from "../../lib/world-navigation";

export function createCoast(scene: THREE.Scene) {
  const positions: number[] = [],
    colors: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const sectors = 256,
    offsets = [-7, -5, -3, -2, -1, 0, 1, 2.2, 4, 8, 16];
  const rings = 5 + offsets.length;
  const grass = new THREE.Color(0xa0bd4f),
    sand = new THREE.Color(0xffd19d),
    wet = new THREE.Color(0xc5ac93);
  for (let ring = 0; ring < rings; ring++)
    for (let i = 0; i <= sectors; i++) {
      const angle = (i / sectors) * Math.PI * 2,
        edge = coastPoint(angle),
        radius = Math.hypot(edge.x, edge.z);
      const r = ring < 5 ? radius * ring * 0.16 : radius + offsets[ring - 5];
      const p = { x: Math.cos(angle) * r, z: Math.sin(angle) * r },
        d = distanceToShore(p);
      positions.push(p.x, getGroundHeight(p) - 0.025, p.z);
      uvs.push(p.x / 5, p.z / 5);
      const color = grass
        .clone()
        .lerp(sand, THREE.MathUtils.smoothstep(d, -5, -1.4))
        .lerp(wet, THREE.MathUtils.smoothstep(d, -0.6, 2.5));
      color.multiplyScalar(
        0.96 + 0.035 * Math.sin(p.x * 0.71) * Math.sin(p.z * 0.57),
      );
      colors.push(color.r, color.g, color.b);
      if (ring < rings - 1 && i < sectors) {
        const a = ring * (sectors + 1) + i,
          b = a + sectors + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!,
    pixels = context.createImageData(256, 256);
  let seed = 915;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 222 + (seed >>> 24) * 0.12;
    pixels.data[i] = value;
    pixels.data[i + 1] = value;
    pixels.data[i + 2] = value - 3;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const groundMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: texture,
    roughness: 1,
  });
  const terrain = new THREE.Mesh(geometry, groundMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain);
  return {
    dispose() {
      geometry.dispose();
      groundMaterial.dispose();
      texture.dispose();
    },
  };
}
