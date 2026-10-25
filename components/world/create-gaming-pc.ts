import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gamingPC, gamingPCSpecs } from '../../lib/world-gaming-pc.ts';

export function createGamingPC(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) => void) {
  const root = new THREE.Group(); root.name = 'gaming-pc'; root.position.set(gamingPC.x, 0, gamingPC.z); scene.add(root);
  const body = new THREE.Group(); body.position.y = gamingPC.plinthHeight; root.add(body);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const cache = new Map<string, THREE.BufferGeometry>();
  const groups: THREE.Group[] = [], rotors: THREE.Mesh[] = [];
  const part = (name: string, parent: THREE.Object3D = body) => {
    const group = new THREE.Group(); group.name = 'pc-' + name; parent.add(group); groups.push(group); return group;
  };
  const standard = (color: number, roughness = .45, metalness = .1, emission = .04) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive: color, emissiveIntensity: emission });
    applyVisibility(material); materials.add(material); return material;
  };
  const white = standard(0xf0f3f1, .3, .12, .16), porcelain = standard(0xffffff, .38, .05, .12);
  const silver = standard(0x9aaab0, .27, .65), dark = standard(0x23323b, .6, .25), pcb = standard(0x27383e, .7, .12);
  const rubber = standard(0x303b3f, .85, 0), gold = standard(0xc0ae79, .32, .6), cableWhite = standard(0xe6eae7, .66, 0);
  const cyan = new THREE.MeshBasicMaterial({ color: 0xb0f6f4, toneMapped: false });
  const lilac = new THREE.MeshBasicMaterial({ color: 0xd4c5ff, toneMapped: false });
  [cyan, lilac].forEach(m => { materials.add(m); applyVisibility(m); });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0xc4e7e7, transparent: true, opacity: .065, roughness: .065,
    metalness: 0, clearcoat: 1, clearcoatRoughness: .08, transmission: 0, depthWrite: false });
  materials.add(glassMaterial); applyVisibility(glassMaterial);
  const led = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); materials.add(led); applyVisibility(led);
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.add(geometry); const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.castShadow = !material.transparent && !(material instanceof THREE.MeshBasicMaterial); object.receiveShadow = true;
    parent.add(object); return object;
  };
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, radius = .025) => {
    const key = `${w},${h},${d},${radius}`;
    if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)));
    return mesh(parent, cache.get(key)!, material, x, y, z);
  };
  const cylinder = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number, depth: number, material: THREE.Material, axis = 'z') => {
    const key = `cylinder-${radius},${depth}`;
    if (!cache.has(key)) cache.set(key, new THREE.CylinderGeometry(radius, radius, depth, 32));
    const object = mesh(parent, cache.get(key)!, material, x, y, z);
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    return object;
  };
  const tube = (parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material) =>
    mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius, 8, false), material);
  const text = (parent: THREE.Object3D, value: string, x: number, y: number, z: number, width: number, color = '#566b74') => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
    const c = canvas.getContext('2d')!; c.clearRect(0, 0, 1024, 160); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 84px sans-serif'; c.fillText(value, 512, 83, 960);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }); materials.add(material); applyVisibility(material);
    const object = mesh(parent, new THREE.PlaneGeometry(width, width / 6.4), material, x, y, z); object.castShadow = false; return object;
  };
  const rounded = (width: number, height: number, radius: number) => {
    const s = new THREE.Shape(), x = -width / 2, y = -height / 2;
    s.moveTo(x + radius, y); s.lineTo(-x - radius, y); s.quadraticCurveTo(-x, y, -x, y + radius);
    s.lineTo(-x, -y - radius); s.quadraticCurveTo(-x, -y, -x - radius, -y); s.lineTo(x + radius, -y);
    s.quadraticCurveTo(x, -y, x, -y - radius); s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y); return s;
  };

  const base = part('plinth', root);
  box(base, 0, .15, 0, gamingPC.width, .3, gamingPC.depth, white, .1);
  box(base, 0, .37, 0, gamingPC.width - .28, .22, gamingPC.depth - .28, porcelain, .08);
  for (const z of [-gamingPC.depth / 2 + .12, gamingPC.depth / 2 - .12]) box(base, 0, .28, z, gamingPC.width - .45, .035, .025, cyan);
  for (const x of [-gamingPC.width / 2 + .12, gamingPC.width / 2 - .12]) box(base, x, .28, 0, .025, .035, gamingPC.depth - .45, lilac);

  const board = gamingPC.specBoard, sign = part('spec-board', root);
  sign.position.set(board.x - gamingPC.x, 0, board.z - gamingPC.z); sign.rotation.y = board.rotation;
  box(sign, 0, .09, 0, board.width, .18, board.depth, white, .07);
  box(sign, 0, .21, 0, board.width - .2, .06, board.depth - .16, silver, .025);
  for (const x of [-1.12, 1.12]) box(sign, x, .53, -.08, .12, .65, .18, silver);
  box(sign, 0, 2.43, 0, 3.12, 3.94, .16, porcelain, .08);
  box(sign, 0, 2.43, .092, 2.97, 3.79, .025, dark, .045);
  box(sign, -1.51, 2.43, .13, .022, 3.72, .018, cyan, .004);
  box(sign, 1.56, 2.43, -.025, .035, 3.86, .37, glassMaterial, .008);
  for (const x of [-1.48, 1.48]) for (const y of [.55, 4.3]) {
    cylinder(sign, x, y, .098, .032, .025, silver);
    box(sign, x, y, .113, .032, .005, .004, dark, .001);
  }
  const specsCanvas = document.createElement('canvas'); specsCanvas.width = 768; specsCanvas.height = 1000;
  const specsContext = specsCanvas.getContext('2d')!;
  specsContext.fillStyle = '#172b36'; specsContext.fillRect(0, 0, 768, 1000);
  specsContext.textAlign = 'left'; specsContext.textBaseline = 'middle';
  specsContext.fillStyle = '#9beae5'; specsContext.font = '500 24px sans-serif'; specsContext.fillText('PERSONAL SETUP', 52, 64);
  specsContext.fillStyle = '#f0f8fc'; specsContext.font = '600 86px sans-serif'; specsContext.fillText('MY PC', 48, 139);
  specsContext.fillStyle = '#638c9c'; specsContext.fillRect(52, 208, 664, 2);
  gamingPCSpecs.forEach(({ label, value }, i) => {
    const y = 260 + i * 177;
    specsContext.fillStyle = '#afc9d3'; specsContext.font = '500 31px sans-serif'; specsContext.fillText(label, 54, y);
    specsContext.fillStyle = i < 2 ? '#f0f8fc' : '#a8ede8';
    specsContext.font = i < 2 ? '600 66px sans-serif' : '500 78px sans-serif'; specsContext.fillText(value, 49, y + 72, 667);
    if (i < 3) { specsContext.fillStyle = '#385561'; specsContext.fillRect(52, y + 124, 664, 1); }
  });
  const specsTexture = new THREE.CanvasTexture(specsCanvas); specsTexture.colorSpace = THREE.SRGBColorSpace; specsTexture.anisotropy = 8; textures.add(specsTexture);
  const specsMaterial = new THREE.MeshBasicMaterial({ map: specsTexture, toneMapped: false }); materials.add(specsMaterial); applyVisibility(specsMaterial);
  const screen = mesh(sign, new THREE.PlaneGeometry(2.9, 3.74), specsMaterial, 0, 2.43, .109); screen.name = 'pc-spec-screen';

  const chassis = part('chassis');
  for (const x of [-2.85, 2.85]) for (const z of [-1.62, 1.62]) {
    cylinder(chassis, x, .09, z, .24, .18, rubber, 'y'); cylinder(chassis, x, .23, z, .25, .19, white, 'y');
  }
  box(chassis, 0, .53, 0, 6.78, .32, 4.22, white, .045);
  box(chassis, 0, .715, .6, 6.5, .06, 2.9, porcelain);
  box(chassis, 0, 7.05, -1.51, 6.78, .22, 1.2, white);
  box(chassis, 0, 3.84, -2.065, 6.75, 6.3, .09, white);
  box(chassis, 0, 3.82, -.91, 6.5, 6.12, .1, white);
  box(chassis, 3.34, 3.83, -1.52, .1, 6.34, 1.12, white);
  box(chassis, -3.34, 3.83, -1.52, .1, 6.34, 1.12, white);
  for (const z of [-.95, 2.055]) box(chassis, 0, 7.035, z, 6.78, .15, .12, white);
  for (const x of [-3.32, 3.32]) box(chassis, x, 7.035, .55, .13, .15, 3.08, white);
  box(chassis, -3.32, 3.83, 2.06, .13, 6.3, .12, white);
  for (let i = 0; i < 28; i++) box(chassis, -3.14 + i * .23, 7.165, -1.51, .065, .013, .77, dark, .002);
  for (const y of [1.1, 1.36, 1.62, 1.88, 2.14, 2.4, 2.66]) box(chassis, -3.37, y, .4, .055, .1, 1.62, silver, .008);
  box(chassis, 1.24, 3.87, -.6, .36, 5.6, .48, porcelain);
  box(chassis, 1.41, 3.87, -.35, .018, 5.42, .018, cyan, .002);
  for (const x of [-3.17, 3.17]) for (const y of [.85, 6.82]) {
    cylinder(chassis, x, y, 2.115, .052, .025, silver);
    box(chassis, x, y, 2.13, .044, .008, .006, dark, .001);
  }
  text(chassis, 'NZXT', -2.67, .565, 2.123, .67);
  // Top I/O remains separate from the panoramic glass rather than crossing the viewing corner.
  cylinder(chassis, 2.85, 7.175, -1.45, .115, .025, silver, 'y');
  cylinder(chassis, 2.85, 7.191, -1.45, .074, .012, cyan, 'y');
  for (const x of [2.1, 2.43]) box(chassis, x, 7.173, -1.45, .19, .015, .075, dark, .005);
  box(chassis, 1.73, 7.173, -1.45, .13, .015, .045, dark, .005);

  const motherboard = part('motherboard');
  box(motherboard, -1.02, 3.96, -.77, 3.68, 4.67, .09, pcb, .035);
  for (const x of [-2.72, .67]) for (const y of [1.8, 3.97, 6.13]) {
    cylinder(motherboard, x, y, -.68, .06, .024, gold); box(motherboard, x, y, -.663, .055, .009, .009, dark, .002);
  }
  box(motherboard, -2.4, 5.08, -.57, .63, 2.11, .28, white);
  box(motherboard, -1.32, 6.02, -.54, 1.45, .44, .32, white);
  for (let i = 0; i < 13; i++) box(motherboard, -2.65 + i * .039, 5.1, -.414, .013, 1.9, .018, silver, .002);
  for (let i = 0; i < 16; i++) box(motherboard, -1.98 + i * .087, 6.015, -.37, .025, .35, .025, silver, .003);
  for (let i = 0; i < 12; i++) cylinder(motherboard, -2.05 + i * .19, 5.63, -.59, .055, .16, silver);
  for (let row = 0; row < 3; row++) {
    box(motherboard, -1.25, 2.04 + row * .37, -.64, 2.75, .13, .13, dark, .009);
    box(motherboard, -1.25, 2.06 + row * .37, -.563, 2.4, .018, .012, silver, .002);
  }
  box(motherboard, -1.1, 3.48, -.56, 2.34, .36, .2, silver);
  box(motherboard, -.78, 2.99, -.54, 1.32, .49, .23, white);
  text(motherboard, 'N7 / WHITE', -1.02, 3.48, -.448, 1.1, '#dce4e4');
  for (let i = 0; i < 34; i++) {
    const x = -2.55 + (i % 9) * .36, y = 2.88 + Math.floor(i / 9) * .48;
    box(motherboard, x, y, -.69, .11, .065, .043, dark, .004);
    box(motherboard, x - .06, y, -.66, .014, .052, .014, silver, .002);
    box(motherboard, x + .06, y, -.66, .014, .052, .014, silver, .002);
  }
  for (let i = 0; i < 18; i++) {
    const x = -2.5 + i * .18, y = 3.88 + (i % 5) * .19;
    box(motherboard, x, y, -.708, .009, .35 + (i % 4) * .14, .008, gold, .002);
    box(motherboard, x + .07, y - .17, -.708, .15, .009, .008, gold, .002);
  }
  const memory = part('memory');
  for (let i = 0; i < 4; i++) {
    const x = -.07 + i * .255;
    box(memory, x, 4.91, -.59, .19, 1.93, .26, dark);
    box(memory, x, 4.96, -.42, .155, 1.78, .13, white);
    box(memory, x, 4.96, -.344, .065, 1.7, .035, i % 2 ? cyan : lilac, .015);
    for (const y of [3.97, 5.9]) box(memory, x, y, -.54, .2, .12, .25, porcelain);
  }

  const fanStatics = part('fan-frames');
  const frameShape = rounded(1.74, 1.74, .11), hole = new THREE.Path(); hole.absarc(0, 0, .738, 0, Math.PI * 2, true); frameShape.holes.push(hole);
  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, { depth: .12, bevelEnabled: true, bevelSize: .018, bevelThickness: .012, bevelSegments: 2, curveSegments: 40 });
  const ringGeometry = new THREE.TorusGeometry(.71, .047, 8, 64), ringColors: number[] = [];
  const position = ringGeometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const a = Math.atan2(position.getY(i), position.getX(i));
    const color = new THREE.Color().setHSL(.48 + .32 * (a + Math.PI) / (Math.PI * 2), .75, .61); ringColors.push(...color.toArray());
  }
  ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ringColors, 3));
  const blade = new THREE.Shape(); blade.moveTo(.12, -.04); blade.quadraticCurveTo(.34, -.17, .61, -.08);
  blade.quadraticCurveTo(.72, .05, .54, .2); blade.quadraticCurveTo(.32, .23, .12, .13); blade.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, { depth: .038, bevelEnabled: true, bevelSize: .012, bevelThickness: .009, bevelSegments: 1, curveSegments: 8 });
  const rotorParts: THREE.BufferGeometry[] = Array.from({ length: 7 }, (_, i) => bladeGeometry.clone().rotateZ(i / 7 * Math.PI * 2));
  const hub = new THREE.CylinderGeometry(.17, .17, .1, 24); hub.rotateX(Math.PI / 2); hub.translate(0, 0, .045); rotorParts.push(hub);
  const rotorTriangles = rotorParts.map(g => g.index ? g.toNonIndexed() : g);
  const rotorGeometry = mergeGeometries(rotorTriangles)!;
  new Set([...rotorParts, ...rotorTriangles]).forEach(g => g.dispose()); bladeGeometry.dispose();
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d')!, gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [stop, alpha] of [[0, 0], [.52, 0], [.66, .25], [.73, .1], [1, 0]]) gradient.addColorStop(stop, `rgba(185,190,255,${alpha})`);
  glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 128, 128);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace; textures.add(glowTexture);
  const halo = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  materials.add(halo); applyVisibility(halo);
  const haloGeometry = new THREE.PlaneGeometry(2.24, 2.24);
  const fanRecess = new THREE.CircleGeometry(.7, 48);
  const fan = (name: string, x: number, y: number, z: number, orientation = 'z', scale = 1, gpu = false) => {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(orientation === 'y' ? -Math.PI / 2 : 0, orientation === 'x' ? Math.PI / 2 : 0, 0));
    matrix.setPosition(x, y, z); matrix.scale(new THREE.Vector3(scale, scale, scale));
    const addStatic = (geometry: THREE.BufferGeometry, material: THREE.Material, dz = 0) => {
      const transformed = geometry.clone().translate(0, 0, dz).applyMatrix4(matrix); return mesh(fanStatics, transformed, material);
    };
    if (!gpu) addStatic(frameGeometry, porcelain);
    addStatic(fanRecess, dark, -.018);
    addStatic(ringGeometry, led, .15);
    const torus = new THREE.TorusGeometry(.657, .014, 6, 56); addStatic(torus, silver, .15); torus.dispose();
    const glow = addStatic(haloGeometry, halo, .17); glow.renderOrder = 1;
    const rotor = new THREE.Mesh(rotorGeometry, white); geometries.add(rotorGeometry);
    const mount = new THREE.Group(); mount.applyMatrix4(matrix); body.add(mount); mount.add(rotor);
    rotor.position.z = .07; rotor.name = 'pc-fan-rotor-' + name; rotors.push(rotor);
    rotor.castShadow = true; rotor.receiveShadow = true;
    for (const dx of [-.72, .72]) for (const dy of [-.72, .72]) {
      if (gpu) continue;
      const screw = new THREE.CylinderGeometry(.032, .032, .028, 8); screw.rotateX(Math.PI / 2); screw.translate(dx, dy, .15); addStatic(screw, silver); screw.dispose();
    }
  };
  for (let i = 0; i < 3; i++) {
    fan('side-' + i, 2.32, 1.56 + i * 1.86, -.62);
    fan('bottom-' + i, -2.16 + i * 2.12, .84, .66, 'y');
    fan('top-' + i, -2.16 + i * 2.12, 6.48, .66, 'y');
  }
  fan('rear', -3.18, 5.34, .54, 'x');
  frameGeometry.dispose(); ringGeometry.dispose();

  const radiator = part('radiator');
  box(radiator, -.04, 6.16, .66, 6.15, .32, 1.83, white);
  for (let i = 0; i < 70; i++) box(radiator, -2.97 + i * .086, 6.12, .66, .025, .2, 1.6, silver, .003);
  for (const z of [-.22, 1.54]) box(radiator, -.04, 6.17, z, 6.2, .34, .1, porcelain);
  const cooler = part('cpu-cooler');
  cylinder(cooler, -1.12, 4.55, -.4, .59, .28, white);
  cylinder(cooler, -1.12, 4.55, -.23, .53, .06, silver);
  cylinder(cooler, -1.12, 4.55, -.185, .49, .05, dark);
  const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = lcdCanvas.height = 256;
  const c = lcdCanvas.getContext('2d')!; c.fillStyle = '#172832'; c.fillRect(0, 0, 256, 256); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#a6e8ed'; c.font = '500 28px sans-serif'; c.fillText('RYZEN 7', 128, 64); c.fillStyle = '#f1f8fa'; c.font = '500 59px sans-serif'; c.fillText('5700X', 128, 135);
  c.fillStyle = '#a7adf1'; c.font = '500 21px sans-serif'; c.fillText('AMD', 128, 204);
  const lcdTexture = new THREE.CanvasTexture(lcdCanvas); lcdTexture.colorSpace = THREE.SRGBColorSpace; textures.add(lcdTexture);
  const lcdMaterial = new THREE.MeshBasicMaterial({ map: lcdTexture, toneMapped: false }); materials.add(lcdMaterial); applyVisibility(lcdMaterial);
  mesh(cooler, new THREE.CircleGeometry(.465, 48), lcdMaterial, -1.12, 4.55, -.149);
  for (const offset of [-.16, .16]) {
    tube(cooler, [[-1.0 + offset, 4.78, -.12], [-.68 + offset, 5.22, .45], [.28 + offset, 5.55, .52], [.63 + offset, 6.03, .36]], .071, rubber);
    cylinder(cooler, -.92 + offset, 4.9, -.04, .104, .18, silver);
  }

  const gpu = part('gpu'); gpu.position.x = .4;
  box(gpu, -1, 2.48, .65, 5.18, 1.49, .39, dark, .08);
  box(gpu, -1, 2.48, .41, 5.21, 1.45, .09, silver);
  for (let i = 0; i < 65; i++) box(gpu, -3.42 + i * .076, 2.48, .88, .024, 1.32, .29, silver, .002);
  const heatpipes = part('gpu-heatpipes', gpu);
  for (let i = 0; i < 4; i++) tube(heatpipes, [[-3.35, 3.14, .48 + i * .08], [-3.18, 3.36 + i * .035, .48 + i * .08], [.9, 3.36 + i * .035, .48 + i * .08], [1.38, 3.13, .48 + i * .08]], .029, silver);
  const ports = part('gpu-ports', gpu);
  box(ports, -3.65, 2.48, .7, .055, 1.5, .52, silver, .012);
  for (const y of [2.04, 2.48, 2.92]) {
    box(ports, -3.687, y, .7, .025, .23, .36, dark, .013);
    box(ports, -3.705, y, .7, .008, .1, .25, gold, .004);
  }
  const shroud = rounded(5.24, 1.55, .15);
  for (const x of [-1.53, 0, 1.53]) { const h = new THREE.Path(); h.absarc(x, 0, .594, 0, Math.PI * 2, true); shroud.holes.push(h); }
  const shroudGeometry = new THREE.ExtrudeGeometry(shroud, { depth: .12, bevelEnabled: true, bevelSize: .025, bevelThickness: .015, bevelSegments: 2, curveSegments: 36 });
  mesh(gpu, shroudGeometry, white, -1, 2.48, 1.06);
  for (let i = 0; i < 3; i++) fan('gpu-' + i, -2.13 + i * 1.53, 2.48, 1.09, 'z', .78, true);
  haloGeometry.dispose(); fanRecess.dispose();
  box(gpu, -1, 3.255, 1.13, 4.93, .02, .07, lilac, .008);
  const gpuLabel = text(gpu, 'RTX 3070 Ti', -.92, 3.15, 1.222, 2.2, '#516873'); gpuLabel.scale.y = .8;
  box(gpu, .8, 1.46, .6, .14, 1.38, .25, white); box(gpu, .8, .82, .6, .57, .1, .59, silver);
  for (let i = 0; i < 4; i++) cylinder(gpu, -3.44, 1.98 + i * .32, 1.226, .038, .025, silver);
  const cables = part('cables');
  const connectors = part('cable-connectors');
  box(connectors, 1.04, 3.27, 1.05, .59, .17, .25, white, .012);
  box(connectors, 1.04, 3.18, 1.05, .55, .06, .22, dark, .006);
  box(connectors, 1.04, 3.3, 1.19, .13, .07, .05, porcelain, .005);
  box(connectors, .91, 5.51, -.51, .57, .19, .24, white, .01);
  for (let i = 0; i < 8; i++) {
    box(connectors, .82 + i * .062, 3.36, 1.05, .041, .014, .12, rubber, .003);
    box(connectors, .67 + i * .065, 5.61, -.51, .025, .013, .13, dark, .002);
  }
  for (let i = 0; i < 8; i++) {
    const x = .82 + i * .062;
    tube(cables, [[x, 3.26, 1.05], [x + .18, 3.52, 1.24], [x + .27, 3.95, .78], [x + .23, 4.21, -.36]], .025, cableWhite);
  }
  for (const [x, y, z] of [[1.22, 3.52, 1.24], [1.3, 3.87, .88]]) {
    box(cables, x, y, z, .58, .065, .075, white);
    for (const side of [-1, 1]) box(cables, x + side * .3, y, z, .035, .11, .11, porcelain, .006);
  }
  for (let i = 0; i < 6; i++) tube(cables, [[.66 + i * .065, 5.49, -.53], [1.05 + i * .04, 5.69, -.34], [1.42, 5.5 + i * .05, -.71]], .023, cableWhite);
  const psu = part('power-supply');
  box(psu, -1.78, 1.3, -1.51, 2.1, 1.05, .96, dark);
  for (let i = 0; i < 15; i++) box(psu, -2.68 + i * .13, 1.3, -2.007, .045, .8, .014, silver, .002);

  for (const [name, x, y, z, w, h, d] of [
    ['side', 0, 3.85, 2.122, 6.56, 6.2, .035],
    ['front', 3.405, 3.85, .62, .035, 6.2, 2.97],
    ['top', 0, 7.153, .55, 6.45, .035, 2.95],
  ] as const) {
    const panel = box(body, x, y, z, w, h, d, glassMaterial, .008); panel.name = 'pc-glass-' + name; panel.renderOrder = 2;
  }
  const reflections = part('glass-reflections');
  const sheen = new THREE.MeshBasicMaterial({ color: 0xecffff, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  materials.add(sheen); applyVisibility(sheen);
  for (const x of [-2.48, 2.52]) {
    const glint = mesh(reflections, new THREE.PlaneGeometry(.045, 5.6), sheen, x, 3.91, 2.147); glint.rotation.z = -.13; glint.renderOrder = 3;
  }
  const corner = box(reflections, 3.427, 3.85, 2.13, .011, 6.14, .011, sheen, .002); corner.renderOrder = 3;

  const lights = [new THREE.PointLight(0x8ee8f5, 12, 7, 2), new THREE.PointLight(0xb4a1ff, 10, 7, 2)];
  lights[0].position.set(-1.4, 4.1, 1.5); lights[1].position.set(2, 2.4, 1.3);
  lights.forEach(l => { l.castShadow = false; body.add(l); });
  // Keep the numerous screws, fins and circuit parts, but submit each static material in one draw per component.
  root.updateMatrixWorld(true);
  for (const group of groups) {
    const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const object of [...group.children]) {
      if (!(object instanceof THREE.Mesh)) continue;
      const material = object.material as THREE.Material;
      if (object === screen) continue;
      if (material.transparent && material !== halo) continue;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone(); geometry.applyMatrix4(object.matrix);
      const parts = byMaterial.get(material) ?? []; parts.push(geometry); byMaterial.set(material, parts); object.removeFromParent();
    }
    for (const [material, parts] of byMaterial) {
      const merged = mergeGeometries(parts); parts.forEach(g => g.dispose()); if (merged) {
        const object = mesh(group, merged, material); if (material === halo) object.renderOrder = 1;
      }
    }
  }
  return {
    update(time: number, reduced: boolean) {
      rotors.forEach((rotor, i) => { rotor.rotation.z = reduced ? 0 : time * (i < 10 ? 2.6 : 1.8) + i * .37; });
      lights.forEach(light => { light.visible = !reduced; });
    },
    updateTime(night: number) { lights[0].intensity = 8 + night * 12; lights[1].intensity = 6 + night * 10; },
    dispose() {
      root.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    },
  };
}
