import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hallIconDisplay } from '../../lib/world-halls.ts';

export const hallIcons = {
  github: {
    source: '/images/brands/github-invertocat-white.svg', texture: '/images/brands/github-invertocat-white.png',
    sha256: 'ccd84c89b1056345608fc3489357f8acc7397e49a3cdc2d418b6c8016911d47b',
    width: 1.45, height: 1.45 * 96 / 98, background: 0x101713, edge: 0x64746c,
  },
  zenn: {
    source: '/images/brands/zenn-mark.svg', texture: '/images/brands/zenn-mark.png',
    sha256: 'af4620da91465a91896a9b839186e42e2008b6cd036b2ca205d4686c324808e2',
    width: 1, height: 1, background: 0xffffff, edge: 0xa2c4dc,
  },
};

export function createHallIcon(brand: keyof typeof hallIcons, texture: THREE.Texture) {
  const definition = hallIcons[brand], group = new THREE.Group();
  group.name = 'service-icon-' + brand; group.userData.brand = brand;
  group.rotation.y = hallIconDisplay.rotation;
  const metal = new THREE.MeshStandardMaterial({ color: definition.edge, metalness: .65, roughness: .28 });
  const face = new THREE.MeshBasicMaterial({ color: definition.background, toneMapped: false, fog: false });
  const artwork = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const box = (w: number, h: number, d: number, material: THREE.Material, y: number, z = 0, radius = .025) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 4, h / 4, d / 4)), material);
    mesh.position.set(0, y, z); mesh.castShadow = material === metal; group.add(mesh); return mesh;
  };
  const mount = box(1.65, .1, hallIconDisplay.depth, metal, .05);
  mount.name = 'hall-icon-mount';
  box(.15, .4, .15, metal, .24);
  box(1.25, .07, .2, metal, .35);
  box(hallIconDisplay.width, hallIconDisplay.width, .2, metal, 1.42, 0, .1);
  const logoGeometry = new THREE.PlaneGeometry(definition.width, definition.height);
  for (const [side, sign] of [['front', 1], ['back', -1]] as const) {
    box(2.1, 2.1, .02, face, 1.42, sign * .108, .06);
    const logo = new THREE.Mesh(logoGeometry, artwork); logo.name = 'hall-icon-' + side;
    logo.position.set(0, 1.42, sign * .131); logo.rotation.y = sign === 1 ? 0 : Math.PI; group.add(logo);
  }
  return group;
}
