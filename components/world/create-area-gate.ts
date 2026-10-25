import * as THREE from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { areaGate } from '../../lib/world-zones.ts';
import { createHallWordGeometry } from './create-hall-word.ts';

export function createAreaGate(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) => void, font: Font) {
  const root = new THREE.Group();
  root.name = 'area-gate'; root.position.set(areaGate.x, 0, areaGate.z); scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const metal = new THREE.MeshStandardMaterial({ color: 0xbbb8a5, metalness: .4, roughness: .32 });
  const plinth = new THREE.MeshStandardMaterial({ color: 0x384b4c, roughness: .55, metalness: .3 });
  const edge = new THREE.LineBasicMaterial({ color: 0xd6f5ec, transparent: true, opacity: .42, depthWrite: false, toneMapped: false });
  materials.add(edge);
  const light = new THREE.MeshBasicMaterial({ color: 0xe4f9e8, toneMapped: false });
  const sheen = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  const clear = new THREE.MeshPhysicalMaterial({
    color: 0xa0d1c4, transparent: true, opacity: .16, roughness: .08, metalness: 0,
    clearcoat: 1, clearcoatRoughness: .12, transmission: 0, depthWrite: false,
  });
  const smoked = clear.clone(); smoked.color.setHex(0x264d50); smoked.opacity = .46;
  [metal, plinth, light, sheen, clear, smoked].forEach(material => { materials.add(material); applyVisibility(material); });
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); root.add(object);
    object.castShadow = !Array.isArray(material) && !material.transparent; object.receiveShadow = true;
    return object;
  };
  const box = (x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material, radius = .02) =>
    mesh(new RoundedBoxGeometry(width, height, depth, 2, Math.min(radius, height / 4, depth / 4)), material, x, y, z);
  const edges: THREE.BufferGeometry[] = [];
  const glass = (x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material) => {
    const part = box(x, y, z, width, height, depth, material, .065); part.updateMatrix();
    const outline = new THREE.BoxGeometry(width - .045, height - .045, depth - .015);
    edges.push(new THREE.EdgesGeometry(outline).applyMatrix4(part.matrix)); outline.dispose();
    return part;
  };

  // Paired glass fins expose their thickness; the metalwork sits on the outer edges.
  for (const side of [-1, 1]) {
    const x = side * areaGate.postOffset;
    box(x, .08, 0, areaGate.footWidth, .16, areaGate.depth, plinth);
    box(x, .18, 0, .72, .045, .76, metal);
    for (const z of [-.28, .28]) {
      glass(x, 3.06, z, .62, 5.72, .1, clear);
      box(x + side * .275, 3.06, z, .055, 5.75, .13, metal);
      box(x - side * .25, 3.06, z + .06, .022, 5.55, .018, light);
    }
    for (const y of [.5, 5.7]) box(x, y, 0, .7, .045, .72, metal);
  }

  glass(0, 5.02, .035, 9.38, 2.05, .15, smoked);
  glass(-.08, 5.13, -.29, 9.18, 2, .12, clear);
  for (const z of [-.36, .35]) box(0, 6.08, z, 9.55, .045, .045, metal);
  for (const x of [-4.34, 4.34]) for (const y of [4.28, 5.76]) {
    const bolt = mesh(new THREE.CylinderGeometry(.065, .065, .48, 12), metal, x, y, -.08);
    bolt.rotation.x = Math.PI / 2;
  }
  for (const x of [-3.9, 3.9]) box(x, 4.02, .13, .54, .025, .04, light);
  for (const x of [2.92, 3.13]) {
    const glint = mesh(new THREE.PlaneGeometry(.055, 1.86), sheen, x, 5.02, .12);
    glint.rotation.z = -.38;
  }

  const cameraPosition = new THREE.Vector3();
  for (const [direction, title, word, other, rotation, sign] of [
    ['north', areaGate.northLabel, 'HOBBY', '南：ポートフォリオエリア', 0, 1],
    ['south', areaGate.southLabel, 'PORTFOLIO', '北：趣味エリア', Math.PI, -1],
  ] as const) {
    const face = new THREE.MeshStandardMaterial({
      color: 0xfff4dd, emissive: 0xe2f5ed, emissiveIntensity: 1.05, roughness: .3, metalness: .15,
      transparent: true, opacity: 1, depthWrite: false, toneMapped: false,
    });
    const side = new THREE.MeshStandardMaterial({
      color: 0x4b6565, emissive: 0x77a99e, emissiveIntensity: .45, roughness: .28, metalness: .55,
      transparent: true, opacity: 1, depthWrite: false, toneMapped: false,
    });
    [face, side].forEach(material => { materials.add(material); applyVisibility(material); });
    const letters = mesh(createHallWordGeometry(Array.from(word).join(' '), font, 7.8, .86), [face, side], 0, 4.9, sign * .34);
    letters.name = 'area-gate-label-' + direction; letters.userData.word = word;
    letters.rotation.y = rotation; letters.renderOrder = 3;
    letters.castShadow = false;
    // A transparent crown must not show the opposite word backwards through the glass.
    letters.onBeforeRender = (_renderer, _scene, camera, _geometry, material) => {
      camera.getWorldPosition(cameraPosition);
      material.opacity = (cameraPosition.z - areaGate.z) * sign >= 0 ? 1 : 0;
    };

    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'left'; context.textBaseline = 'middle'; context.fillStyle = '#fff7e6';
    context.font = '500 130px "Hiragino Sans", "Yu Gothic", sans-serif';
    context.fillText(title, 64, 122, direction === 'north' ? 650 : 1110);
    context.textAlign = 'right'; context.fillStyle = '#d8eee5';
    context.font = '500 90px "Hiragino Sans", "Yu Gothic", sans-serif';
    context.fillText(other, 1984, 132, direction === 'north' ? 1180 : 750);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    applyVisibility(material); materials.add(material);
    const caption = mesh(new THREE.PlaneGeometry(8.15, 1.019), material, 0, 4.4, sign * .35);
    caption.name = 'area-gate-caption-' + direction; caption.rotation.y = rotation; caption.renderOrder = 3;
    caption.castShadow = false;
  }

  root.updateMatrixWorld(true);
  for (const material of [metal, plinth, clear, smoked, light, sheen]) {
    const parts: THREE.BufferGeometry[] = [];
    for (const object of [...root.children]) {
      if (!(object instanceof THREE.Mesh) || object.material !== material) continue;
      const part = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      parts.push(part.applyMatrix4(object.matrix)); object.removeFromParent();
    }
    const merged = mergeGeometries(parts); parts.forEach(g => g.dispose());
    if (merged) {
      const object = mesh(merged, material);
      if (material === clear) object.name = 'area-gate-glass';
      if (material === smoked) object.name = 'area-gate-canopy';
      if (material.transparent) object.renderOrder = material === sheen ? 2 : 1;
    }
  }
  const edgeGeometry = mergeGeometries(edges); edges.forEach(g => g.dispose());
  if (edgeGeometry) {
    geometries.add(edgeGeometry);
    const outline = new THREE.LineSegments(edgeGeometry, edge); outline.renderOrder = 2; root.add(outline);
  }
  return {
    dispose() {
      root.removeFromParent();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    },
  };
}
