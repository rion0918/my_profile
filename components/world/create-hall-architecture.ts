import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Hall } from '../../lib/world-halls.ts';

type Label = (parent: THREE.Object3D, value: string, x: number, y: number, z: number, width: number, color: string) => void;

export function createHallArchitecture(building: Hall & { scale: number }, label: Label) {
  const root = new THREE.Group(); root.name = 'hall-architecture';
  const structure = new THREE.Group(); structure.name = 'hall-structure'; root.add(structure);
  const glazing = new THREE.Group(); glazing.name = 'hall-glazing'; root.add(glazing);
  const interior = new THREE.Group(); interior.name = 'hall-interior'; root.add(interior);
  const w = building.width / building.scale, d = building.depth / building.scale, theme = building.theme!;
  const geometries = new Map<string, THREE.BufferGeometry>(), materials = new Map<string, THREE.MeshStandardMaterial>();
  const standard = (color: number, roughness = .62, metalness = .05, emission = 0) => {
    const key = `${color},${roughness},${metalness},${emission}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive: color, emissiveIntensity: emission }));
    return materials.get(key)!;
  };
  const plaster = standard(theme.surface, .68), brand = standard(theme.primary, .4, .22);
  const ivory = standard(0xeee9df, .65), concrete = standard(0xb9b9ad, .83), wood = standard(0xb5916c, .7);
  const dark = standard(0x252c30, .48, .22), metal = standard(building.id === 'history' ? theme.light : 0x8d9a9c, .26, .72);
  const light = standard(theme.light, .32, .1, .55), screen = standard(0x172529, .28, .12, .08);
  const mint = standard(building.id === 'github' ? 0x69d78b : theme.primary, .38, .1, .22);
  const reflection = new Uint8Array(32 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
    const stripe = Math.exp(-Math.pow((x / 32 + y / 128 * .62 - .7) / .19, 2));
    const i = (y * 32 + x) * 4;
    reflection[i] = 207 + stripe * 48; reflection[i + 1] = 229 + stripe * 26; reflection[i + 2] = 235 + stripe * 20;
    reflection[i + 3] = 130 + stripe * 125;
  }
  const glassTexture = new THREE.DataTexture(reflection, 32, 128); glassTexture.colorSpace = THREE.SRGBColorSpace;
  glassTexture.magFilter = THREE.LinearFilter; glassTexture.minFilter = THREE.LinearFilter; glassTexture.needsUpdate = true;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdcefeb, map: glassTexture, transparent: true, opacity: .24,
    roughness: .09, metalness: .08, clearcoat: 1, clearcoatRoughness: .12, transmission: 0,
    side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false });
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z);
    object.castShadow = !material.transparent; object.receiveShadow = true; parent.add(object); return object;
  };
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material, radius = .015) => {
    const key = `box-${width},${height},${depth},${radius}`;
    if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(width, height, depth, 1, Math.min(radius, width / 4, height / 4, depth / 4)));
    return mesh(parent, geometries.get(key)!, material, x, y, z);
  };
  const cylinder = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number, height: number, material: THREE.Material, segments = 40) => {
    const key = `cylinder-${radius},${height},${segments}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.CylinderGeometry(radius, radius, height, segments));
    return mesh(parent, geometries.get(key)!, material, x, y, z);
  };
  const beam = (parent: THREE.Object3D, a: number[], b: number[], width: number, material: THREE.Material) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const object = box(parent, 0, 0, 0, width, delta.length(), width, material, .007);
    object.position.copy(from.add(to).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return object;
  };
  const pane = (x: number, y: number, z: number, width: number, height: number, rotation = 0) => {
    const object = mesh(glazing, new THREE.PlaneGeometry(width, height), glass, x, y, z); object.rotation.y = rotation;
    object.renderOrder = 2; return object;
  };
  const round = (width: number, depth: number, radius: number) => {
    const s = new THREE.Shape(), x = -width / 2, y = -depth / 2;
    s.moveTo(x + radius, y); s.lineTo(-x - radius, y); s.quadraticCurveTo(-x, y, -x, y + radius);
    s.lineTo(-x, -y - radius); s.quadraticCurveTo(-x, -y, -x - radius, -y); s.lineTo(x + radius, -y);
    s.quadraticCurveTo(x, -y, x, -y - radius); s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y); return s;
  };
  const slab = (shape: THREE.Shape, height: number, y: number, material: THREE.Material) => {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
    geometry.rotateX(-Math.PI / 2); return mesh(structure, geometry, material, 0, y, 0);
  };
  const roofRing = (width: number, depth: number, radius: number, y: number, holeWidth: number, holeDepth: number, material: THREE.Material) => {
    const shape = round(width, depth, radius), hole = round(holeWidth, holeDepth, Math.min(.3, holeWidth / 3, holeDepth / 3));
    shape.holes.push(new THREE.Path(hole.getPoints())); slab(shape, .13, y, material);
    const skylight = pane(0, y + .025, 0, holeWidth - .06, holeDepth - .06); skylight.rotation.x = -Math.PI / 2;
    for (const side of [-1, 1]) box(structure, side * holeWidth / 2, y + .065, 0, .035, .07, holeDepth, metal);
  };
  const frame = (height = 2.34) => {
    for (const x of [-w / 2 + .05, w / 2 - .05]) for (const z of [-d / 2 + .05, d / 2 - .05])
      box(structure, x, .3 + height / 2, z, .065, height, .065, brand);
    for (const side of [-1, 1]) {
      const width = w / 2 - .6, center = side * (.6 + width / 2);
      pane(center, 1.38, d / 2, width - .03, 2.08);
      box(structure, side * .57, 1.39, d / 2, .045, 2.18, .055, metal);
      pane(side * (w / 2 - .025), 1.38, 0, d - .18, 2.08, Math.PI / 2);
      box(structure, side * w / 2, .32, 0, .055, .045, d, metal);
      box(structure, side * w / 2, 2.44, 0, .06, .06, d, brand);
    }
    box(structure, 0, 1.9, d / 2, 1.16, .055, .07, metal);
    pane(0, 2.18, d / 2, 1.1, .49);
    box(structure, 0, 1.38, -d / 2 + .05, w - .1, 2.12, .1, plaster);
  };
  const chair = (x: number, z: number, rotation: number) => {
    const chair = new THREE.Group(); chair.position.set(x, 0, z); chair.rotation.y = rotation; interior.add(chair);
    box(chair, 0, .62, 0, .43, .12, .43, brand, .05);
    box(chair, 0, .87, -.18, .43, .46, .07, brand, .035);
    for (const side of [-1, 1]) beam(chair, [side * .16, .32, -.13], [side * .16, .6, .14], .025, metal);
  };
  const desk = (x: number, z: number, width: number, depth: number) => {
    box(interior, x, .91, z, width, .085, depth, wood, .035);
    for (const side of [-1, 1]) box(interior, x + side * (width / 2 - .12), .6, z, .055, .56, depth - .14, metal);
  };
  const monitor = (x: number, z: number, width: number) => {
    box(interior, x, 1.24, z, width, .44, .055, dark, .025);
    box(interior, x, 1.24, z + .032, width - .06, .37, .009, screen, .008);
    box(interior, x, 1.02, z, .04, .2, .04, metal); box(interior, x, .97, z + .015, .25, .025, .16, dark);
    for (let row = 0; row < 5; row++) {
      const length = (width - .17) * [.68, .86, .5, .75, .6][row];
      box(interior, x - width / 2 + .09 + length / 2, 1.36 - row * .052, z + .04, length, .012, .003, row % 2 ? ivory : mint, .001);
    }
    box(interior, x, .97, z + .28, width * .8, .025, .17, dark, .01);
    for (let i = 0; i < 3; i++) box(interior, x, .986, z + .23 + i * .043, width * .67, .006, .012, metal, .001);
  };
  const pendant = (x: number, z: number, length: number) => {
    const ceiling = building.model === 'music' ? 1.88 + Math.sqrt(1 - (x / (w / 2)) ** 2) * .96
      : building.model === 'atelier' ? 3.47 - (x + .38) / (w / 2 + .52) * .84 : 2.5;
    cylinder(interior, x, (ceiling + 1.92) / 2, z, .012, ceiling - 1.92, metal, 8);
    box(interior, x, 1.9, z, length, .045, .12, metal); box(interior, x, 1.873, z, length - .04, .012, .085, light, .003);
  };
  const plant = (x: number, z: number) => {
    cylinder(interior, x, .43, z, .14, .28, concrete, 24);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4, leaf = mesh(interior, new THREE.SphereGeometry(.095, 10, 8), standard(0x638573), x + Math.cos(a) * .09, .7 + i % 2 * .09, z + Math.sin(a) * .09);
      leaf.scale.set(.8, 2.2, .6); leaf.rotation.z = Math.cos(a) * .5;
    }
  };

  if (building.model === 'gallery') {
    const rx = w / 2 - .1, rz = d / 2 - .08;
    cylinder(structure, 0, .14, 0, 1, .28, concrete, 64).scale.set(rx + .15, 1, rz + .15);
    cylinder(structure, 0, .29, 0, 1, .035, ivory, 64).scale.set(rx, 1, rz);
    for (let i = 0; i < 4; i++) {
      const arc = mesh(glazing, new THREE.CylinderGeometry(1, 1, 2.17, 24, 1, true, .34 + i * (Math.PI * 2 - .68) / 4, (Math.PI * 2 - .68) / 4), glass, 0, 1.4, 0);
      arc.scale.set(rx, 1, rz); arc.renderOrder = 2;
    }
    for (let i = 0; i < 12; i++) {
      const a = .34 + i / 11 * (Math.PI * 2 - .68);
      cylinder(structure, Math.sin(a) * rx, 1.4, Math.cos(a) * rz, .022, 2.2, metal, 8);
    }
    const ring = new THREE.Shape(); ring.absellipse(0, 0, rx + .17, rz + .16, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path(); hole.absellipse(0, 0, .78, .61, 0, Math.PI * 2, true, 0); ring.holes.push(hole);
    slab(ring, .15, 2.53, brand);
    const skylightRim = new THREE.Shape(); skylightRim.absellipse(0, 0, .85, .68, 0, Math.PI * 2, false, 0);
    const skyHole = new THREE.Path(); skyHole.absellipse(0, 0, .78, .61, 0, Math.PI * 2, true, 0); skylightRim.holes.push(skyHole);
    slab(skylightRim, .035, 2.69, metal);
    const sky = mesh(glazing, new THREE.CircleGeometry(1, 48), glass, 0, 2.725, 0); sky.rotation.x = -Math.PI / 2; sky.scale.set(.78, .61, 1); sky.renderOrder = 2;
    for (const side of [-1, 1]) box(structure, side * .59, 1.25, d / 2, .045, 1.9, .07, metal);
    box(structure, 0, 2.34, d / 2 -.05, 2.95, .36, .16, brand, .025);
    ['上宮高校', '神戸電子', 'DMM・27卒内定'].forEach((value, i) => {
      const x = (i - 1) * .98;
      box(interior, x, .55, -.55, .69, .48, .46, plaster, .025);
      box(interior, x, 1.17 + i * .06, -.67, .62, .81 + i * .12, .08, ivory);
      box(interior, x - .26, 1.17 + i * .06, -.619, .026, .7 + i * .12, .015, metal, .003);
      box(interior, x, 1.65 + i * .12, -.61, .3, .018, .02, light, .002);
      label(interior, value, x, 1.29, -.619, .54, '#243b55');
    });
    cylinder(interior, -.95, .53, .45, .27, .43, wood); cylinder(interior, -.95, .76, .45, .29, .05, ivory);
    plant(1.22, -.07);
  } else if (building.model === 'music') {
    box(structure, 0, .14, 0, w + .26, .28, d + .28, concrete, .045);
    box(structure, 0, .3, 0, w - .1, .035, d, wood);
    box(structure, 0, 1.2, -d / 2 + .05, w - .1, 1.8, .1, brand);
    for (const side of [-1, 1]) {
      pane(side * w / 2, 1.12, 0, d -.12, 1.6, Math.PI / 2);
      box(structure, side * w / 2, 1.12, d / 2, .055, 1.66, .055, metal);
      const width = w / 2 - .59; pane(side * (.59 + width / 2), 1.12, d / 2, width - .02, 1.6);
    }
    const vault = (depth: number, z: number, mat: THREE.Material, parent: THREE.Group) => {
      const positions: number[] = [], uv: number[] = [], indices: number[] = [];
      for (let row = 0; row < 2; row++) for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI; positions.push(Math.cos(a) * (w / 2 + .08), 1.88 + Math.sin(a) * .96, z + (row - .5) * depth); uv.push(i / 40, row);
        if (row && i) { const n = row * 41 + i; indices.push(n - 42, n - 1, n, n - 42, n, n - 41); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
      const object = mesh(parent, geo, mat); if (mat.transparent) object.renderOrder = 2; return object;
    };
    vault(d, 0, glass, glazing);
    for (const z of [-d / 2 -.07, -d / 4, d / 4, d / 2 + .07]) {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI; const x = Math.cos(a) * (w / 2 + .13), y = 1.88 + Math.sin(a) * 1.03; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
      for (let i = 40; i >= 0; i--) { const a = i / 40 * Math.PI; shape.lineTo(Math.cos(a) * (w / 2 + .045), 1.88 + Math.sin(a) * .93); } shape.closePath();
      mesh(structure, new THREE.ExtrudeGeometry(shape, { depth: .07, bevelEnabled: false, curveSegments: 40 }), brand, 0, 0, z -.035);
    }
    const upper = new THREE.Shape(); upper.moveTo(-w / 2, 1.9);
    for (let i = 0; i <= 40; i++) { const a = Math.PI - i / 40 * Math.PI; upper.lineTo(Math.cos(a) * w / 2, 1.9 + Math.sin(a) * .9); } upper.closePath();
    mesh(glazing, new THREE.ShapeGeometry(upper), glass, 0, 0, d / 2);
    box(structure, 0, 2.19, d / 2 + .02, 2.5, .39, .12, brand);
    for (const side of [-1, 1]) {
      box(structure, side * (w / 2 + .045), 1.87, 0, .07, .1, d + .2, brand);
      box(structure, side * (w / 2 + .087), 1.886, 0, .012, .025, d + .22, metal, .003);
    }
    for (let i = 0; i < 13; i++) box(interior, -1.35 + i * .225, 1.2, -d / 2 + .15, .055, 1.68, .1, wood, .006);
    desk(-.56, -.3, 1.1, .62); monitor(-.56, -.47, .6); chair(-.56, .23, 0);
    const record = cylinder(interior, .82, 1.35, -.91, .35, .035, dark, 48); record.rotation.x = Math.PI / 2;
    for (const r of [.2, .27, .32]) mesh(interior, new THREE.TorusGeometry(r, .006, 4, 48), metal, .82, 1.35, -.885);
    const recordLabel = cylinder(interior, .82, 1.35, -.874, .09, .012, light, 32); recordLabel.rotation.x = Math.PI / 2;
    box(interior, .8, .61, -.34, .49, .6, .4, dark);
    for (const y of [.49, .72]) { const cone = cylinder(interior, .8, y, -.13, .12, .022, metal, 24); cone.rotation.x = Math.PI / 2; }
    cylinder(interior, .9, .85, .35, .016, 1.04, metal, 8); cylinder(interior, .9, .34, .35, .15, .035, dark, 24);
    const mic = mesh(interior, new THREE.SphereGeometry(.06, 12, 8), dark, .9, 1.39, .35); mic.scale.y = 1.6;
    pendant(0, -.15, 1.1);
  } else if (building.model === 'bubble') {
    slab(round(w + .28, d + .28, .45), .25, .03, concrete);
    slab(round(w, d, .4), .035, .28, ivory);
    frame(2.1);
    for (const side of [-1, 1]) box(structure, side * w / 2, 1.4, -d / 2 + .09, .09, 2.18, .18, brand, .03);
    roofRing(w + .3, d + .3, .55, 2.48, 1.25, 1.32, ivory);
    const cloudRim = round(w + .17, d + .17, .5); cloudRim.holes.push(new THREE.Path(round(1.25, 1.32, .3).getPoints()));
    slab(cloudRim, .035, 2.62, plaster);
    box(structure, 0, 2.21, d / 2 + .01, w - .15, .42, .15, plaster, .06);
    box(interior, 0, 1.28, -d / 2 + .13, 2.3, 1.54, .06, ivory, .14);
    for (let i = 0; i < 3; i++) {
      const x = -.65 + i * .65, y = .82 + i * .28;
      box(interior, x, y, -d / 2 + .2, .56, .34, .045, i === 1 ? plaster : brand, .07);
      box(interior, x + .04, y + .04, -d / 2 + .23, .27, .022, .01, ivory, .005);
      box(interior, x -.03, y -.035, -d / 2 + .23, .34, .018, .01, light, .004);
    }
    for (const [x, y, r] of [[-.76, 1.71, .23], [.76, 1.9, .18], [.37, 1.48, .13]]) {
      const bubble = mesh(glazing, new THREE.SphereGeometry(r, 24, 16), glass, x, y, -.08); bubble.renderOrder = 2;
      cylinder(interior, x, (2.48 + y + r) / 2, -.08, .007, 2.48 - y - r, metal, 8);
    }
    for (const [x, y, z, r] of [[-.23, 2.78, -.02, .31], [.28, 2.97, -.12, .19], [-.25, 3.2, -.08, .13]]) {
      const bubble = mesh(glazing, new THREE.SphereGeometry(r, 32, 20), glass, x, y, z); bubble.renderOrder = 2;
      const rim = mesh(structure, new THREE.TorusGeometry(r * .98, .007, 5, 48), metal, x, y, z); rim.rotation.set(.3, -.45, .1);
      mesh(structure, new THREE.SphereGeometry(r * .12, 10, 8), light, x - r * .28, y + r * .57, z + r * .7);
    }
    cylinder(interior, -.91, .48, .35, .3, .33, plaster); cylinder(interior, -.91, .66, .35, .3, .035, ivory);
    cylinder(interior, .86, .47, .35, .23, .31, brand); cylinder(interior, .86, .64, .35, .24, .035, ivory);
  } else if (building.model === 'atelier') {
    box(structure, 0, .14, 0, w + .28, .28, d + .3, concrete, .035);
    box(structure, 0, .3, 0, w -.1, .035, d -.02, concrete);
    frame();
    const roof = new THREE.Shape(); roof.moveTo(-w / 2 -.14, 2.45); roof.lineTo(-.38, 3.61); roof.lineTo(w / 2 + .14, 2.77);
    roof.lineTo(w / 2 + .14, 2.63); roof.lineTo(-.38, 3.47); roof.lineTo(-w / 2 -.14, 2.31); roof.closePath();
    mesh(structure, new THREE.ExtrudeGeometry(roof, { depth: d + .28, bevelEnabled: false }), dark, 0, 0, -d / 2 -.14);
    for (const z of [-d / 2 -.15, d / 2 + .15]) {
      beam(structure, [-w / 2 -.13, 2.465, z], [-.38, 3.62, z], .027, mint);
      beam(structure, [-.38, 3.62, z], [w / 2 + .13, 2.785, z], .027, mint);
    }
    const clerestory = new THREE.Shape(); clerestory.moveTo(-w / 2, 2.44); clerestory.lineTo(-.38, 3.45); clerestory.lineTo(w / 2, 2.67); clerestory.lineTo(w / 2, 2.44); clerestory.closePath();
    mesh(glazing, new THREE.ShapeGeometry(clerestory), glass, 0, 0, d / 2);
    box(structure, 0, 2.31, d / 2 + .02, w -.08, .36, .12, dark);
    box(interior, 0, 1.42, -d / 2 + .13, w -.3, 1.8, .065, dark);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++)
      box(interior, -.45 + col * .23, 1.12 + row * .21, -d / 2 + .18, .15, .14, .018, (row * 3 + col) % 4 ? mint : brand, .008);
    label(interior, 'rion0918', .4, 2.03, -d / 2 + .18, 1.35, '#c5efd2');
    desk(.45, -.18, 1.65, .65); monitor(.15, -.37, .59); monitor(.82, -.37, .59); chair(.5, .34, 0);
    box(interior, -1.21, .93, -.43, .43, 1.2, .54, dark, .03);
    for (let i = 0; i < 7; i++) {
      box(interior, -1.21, .47 + i * .15, -.15, .31, .024, .02, metal, .003);
      box(interior, -1.39, .47 + i * .15, -.135, .018, .018, .008, mint, .002);
    }
    pendant(.3, -.15, 1.6); plant(-1.28, .58);
  } else if (building.icon === 'x') {
    box(structure, 0, .14, 0, w + .3, .28, d + .3, dark, .035);
    box(structure, 0, .29, 0, w -.1, .035, d -.1, concrete);
    frame();
    box(structure, 0, 2.57, 0, w + .3, .19, d + .28, dark, .02);
    box(structure, -.42, 2.76, -.1, w -.66, .14, d + .05, dark, .02);
    box(structure, .88, 2.69, -.08, .025, .05, d -.1, light, .004);
    box(structure, 0, 2.28, d / 2 + .025, w -.08, .46, .13, dark);
    for (const [a, b] of [[[-w / 2, .34, -.91], [-w / 2, 2.4, .91]], [[-w / 2, .34, .91], [-w / 2, 2.4, -.91]]]) beam(structure, a, b, .05, metal);
    box(interior, 0, 1.43, -d / 2 + .12, w -.27, 1.86, .07, dark);
    label(interior, 'rioi7_0918', .25, 1.94, -d / 2 + .17, 1.65, '#eff2f5');
    for (let i = 0; i < 3; i++) {
      const x = -.9 + i * .9;
      box(interior, x, 1.26, -d / 2 + .18, .65, .76, .035, ivory, .02);
      for (let row = 0; row < 4; row++) box(interior, x -.04, 1.48 - row * .1, -d / 2 + .203, .4 - row % 2 * .09, .016, .008, dark, .002);
      box(interior, x, .83, -d / 2 + .2, .42, .015, .02, light, .002);
    }
    box(interior, -1.09, .57, .05, .45, .48, 1.05, dark, .1);
    box(interior, -1.23, .84, .05, .15, .36, 1.05, dark, .05);
    cylinder(interior, .94, .57, .1, .32, .5, dark); cylinder(interior, .94, .84, .1, .34, .025, metal);
    pendant(0, -.2, 1.85);
  } else {
    const bookshop = building.model === 'bookshop';
    box(structure, 0, .14, 0, w + .28, .28, d + .28, concrete, .04);
    box(structure, 0, .3, 0, w -.08, .035, d -.08, bookshop ? ivory : wood);
    frame();
    if (bookshop) {
      for (const side of [-1, 1]) {
        const leaf = box(structure, side * (w / 4 + .07), 2.65, 0, w / 2, .13, d + .28, plaster, .025); leaf.rotation.z = side * .13;
        const edge = box(structure, side * (w / 4 + .07), 2.647, d / 2 + .148, w / 2, .045, .025, brand, .005); edge.rotation.z = side * .13;
      }
      const spine = pane(0, 2.535, 0, .27, d + .2); spine.rotation.x = -Math.PI / 2;
      for (const z of [-d / 2 -.14, d / 2 + .14]) box(structure, 0, 2.535, z, .22, .04, .04, metal, .005);
    } else {
      roofRing(w + .28, d + .28, .08, 2.5, w * .43, d * .48, ivory);
      box(structure, -w * .23, 2.76, -.15, w * .6, .09, d + .12, plaster, .025);
      box(structure, w * .31, 2.65, -.06, .07, .22, d -.08, brand);
    }
    box(structure, 0, 2.29, d / 2 + .025, w -.08, .39, .13, bookshop ? plaster : brand);
    for (let i = 0; i < 7; i++) {
      const z = -d / 2 + .23 + i * .19;
      box(structure, -w / 2 -.03, 1.42, z, .1, 2.24, .035, bookshop ? brand : wood, .005);
    }
    if (bookshop) {
      for (const x of [-.87, .38]) {
        box(interior, x, 1.36, -d / 2 + .15, 1.07, 1.95, .06, plaster);
        for (let row = 0; row < 4; row++) {
          box(interior, x, .48 + row * .43, -d / 2 + .3, 1.1, .045, .38, wood, .007);
          for (let i = 0; i < 6; i++) box(interior, x -.44 + i * .17, .66 + row * .43, -d / 2 + .28, .105, .24 + (i % 3) * .025, .2,
            [brand, ivory, metal, light][(i + row) % 4], .006);
        }
      }
      label(interior, 'riozenn', -.2, 2.22, -d / 2 + .2, 1.2, '#3ea8ff');
      desk(w / 2 -.4, -.04, .48, 1.25);
      for (const z of [-.42, .2]) { cylinder(interior, w / 2 -.89, .5, z, .15, .37, wood, 24); cylinder(interior, w / 2 -.89, .7, z, .18, .035, brand, 24); }
      box(interior, -1.14, .8, .15, .42, .94, .29, plaster);
      for (let i = 0; i < 3; i++) box(interior, -1.14, .54 + i * .27, .32, .35, .2, .05, i % 2 ? ivory : brand);
      pendant(.1, -.08, 1.4);
    } else {
      box(interior, 0, 1.6, -d / 2 + .14, w -.48, 1.29, .09, brand, .025);
      label(interior, 'Sky / We部', 0, 1.93, -d / 2 + .197, 2.18, '#f0eadb');
      for (let i = 0; i < 6; i++) {
        const x = -.98 + i % 3 * .74, y = 1.51 - Math.floor(i / 3) * .28;
        box(interior, x, y, -d / 2 + .2, .47, .19, .018, i % 2 ? ivory : light, .009);
        box(interior, x, y, -d / 2 + .214, .31, .014, .004, brand, .001);
      }
      desk(0, -.3, 2.18, .84);
      for (const x of [-.71, .71]) { chair(x, .39, 0); chair(x, -.99, Math.PI); }
      box(interior, -.45, .98, -.24, .41, .025, .26, dark, .01);
      box(interior, .5, .98, -.26, .4, .018, .29, ivory, .006);
      box(interior, .5, .992, -.28, .25, .006, .11, brand, .002);
      pendant(0, -.3, 1.85); plant(1.62, -.9);
    }
  }
  return root;
}
