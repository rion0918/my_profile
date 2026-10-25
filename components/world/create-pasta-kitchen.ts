import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStaticGeometryCache } from './static-geometry.ts';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { createHallWordGeometry, createHallWordMaterials } from './create-hall-word.ts';
import { pastaKitchen } from '../../lib/world-pasta.ts';

export function createPastaKitchen(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) => void, font: Font) {
  const root = new THREE.Group(); root.name = 'pasta-kitchen'; root.position.set(pastaKitchen.x, 0, pastaKitchen.z); scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const batchGeometry = createStaticGeometryCache();
  const cache = new Map<string, THREE.BufferGeometry>(), groups: THREE.Group[] = [];
  let seed = 418; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const part = (name: string, parent: THREE.Object3D = root) => {
    const group = new THREE.Group(); group.name = 'pasta-' + name; parent.add(group); groups.push(group); return group;
  };
  const standard = (color: number, roughness = .5, metalness = 0, emission = .08) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive: color, emissiveIntensity: emission }); materials.add(m); applyVisibility(m); return m;
  };
  const physical = (color: number, roughness: number, clearcoat: number) => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat, clearcoatRoughness: .16, emissive: color, emissiveIntensity: .16 }); materials.add(m); applyVisibility(m); return m;
  };
  const ceramic = physical(0xf3f0df, .23, .8), rim = standard(0x899f91, .3, .3);
  const stone = standard(0xe5d9c3, .67), walnut = standard(0x805338, .48), endgrain = standard(0xa37550, .59);
  const steel = standard(0xbccbd0, .22, .86), copper = standard(0xb47a4c, .28, .75), brass = standard(0xc3a577, .28, .7);
  const charcoal = standard(0x233637, .48, .2), fat = standard(0xe6c49a, .47), crust = standard(0x93472c, .53), cheese = standard(0xf5e3ad, .65);
  const pasta = [physical(0xd8aa60, .31, .65), physical(0xe2b773, .32, .6), physical(0xcfa05b, .35, .6)];
  pasta.forEach(m => { m.emissiveIntensity = .025; m.vertexColors = true; });
  const sauce = physical(0xddb46a, .24, .8), pepper = standard(0x3a2d24, .82), eggshell = standard(0xe9d8b4, .62);
  const yolk = physical(0xeea931, .2, .85), linen = standard(0xe4e5d5, .9), olive = physical(0x405d3b, .24, .7);
  const light = new THREE.MeshBasicMaterial({ color: 0xffdfa3, toneMapped: false }); materials.add(light); applyVisibility(light);
  const grain = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4, value = 215 + random() * 35 - (random() > .97 ? 50 : 0);
    grain[i] = grain[i + 1] = grain[i + 2] = value; grain[i + 3] = 255;
  }
  const stoneTexture = new THREE.DataTexture(grain, 64, 64); stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping; stoneTexture.repeat.set(5, 5); stoneTexture.needsUpdate = true;
  textures.add(stoneTexture); stone.map = stoneTexture;
  const relief = (size: number, grainScale: number) => {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const v = 142 + (noise - Math.floor(noise) - .5) * grainScale + 12 * Math.sin(x * .18 + Math.sin(y * .07));
      const i = (y * size + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
    textures.add(texture); return texture;
  };
  const sauceRelief = relief(128, 44), glazeRelief = relief(128, 18), woodRelief = relief(128, 37), searRelief = relief(64, 110);
  sauceRelief.repeat.set(7, 1); woodRelief.repeat.set(2, 8); searRelief.repeat.set(2, 2);
  for (const m of [...pasta, sauce]) { m.bumpMap = sauceRelief; m.bumpScale = .009; m.emissiveIntensity = .025; }
  ceramic.bumpMap = glazeRelief; ceramic.bumpScale = .005;
  walnut.bumpMap = endgrain.bumpMap = woodRelief; walnut.bumpScale = endgrain.bumpScale = .018;
  crust.bumpMap = fat.bumpMap = searRelief; crust.bumpScale = .025; fat.bumpScale = .009; fat.roughness = .27;
  // Local studio reflections keep the glaze, sauce and polished cutlery legible without changing the world's lighting.
  const envWidth = 256, envHeight = 128, envData = new Uint8Array(envWidth * envHeight * 4);
  for (let y = 0; y < envHeight; y++) for (let x = 0; x < envWidth; x++) {
    const u = x / envWidth, v = y / envHeight;
    const softbox = Math.exp(-(((u - .28) / .085) ** 2) - ((v - .32) / .11) ** 2) * 164 + Math.exp(-(((u - .76) / .045) ** 2) - ((v - .4) / .19) ** 2) * 112;
    const sky = 34 + 48 * Math.max(0, Math.cos(v * Math.PI)); const i = (y * envWidth + x) * 4;
    envData[i] = sky + softbox; envData[i + 1] = sky * .94 + softbox * .97; envData[i + 2] = sky * .83 + softbox * .9; envData[i + 3] = 255;
  }
  const reflections = new THREE.DataTexture(envData, envWidth, envHeight); reflections.mapping = THREE.EquirectangularReflectionMapping;
  reflections.colorSpace = THREE.SRGBColorSpace; reflections.needsUpdate = true; textures.add(reflections);
  for (const m of [...pasta, sauce, ceramic, steel, copper, brass, fat, yolk]) { m.envMap = reflections; m.envMapIntensity = m === steel ? 1.65 : .65; }

  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    geometries.add(g); const object = new THREE.Mesh(g, m); object.position.set(x, y, z);
    object.castShadow = !Array.isArray(m) && !m.transparent && !(m instanceof THREE.MeshBasicMaterial); object.receiveShadow = true; parent.add(object); return object;
  };
  const box = (p: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material, r = .025) => {
    const key = [w, h, d, r].join(','); if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 4, h / 4, d / 4)));
    return mesh(p, cache.get(key)!, m, x, y, z);
  };
  const sphere = (p: THREE.Object3D, x: number, y: number, z: number, r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1) => {
    const key = 'sphere-' + r; if (!cache.has(key)) cache.set(key, new THREE.SphereGeometry(r, 24, 16));
    const object = mesh(p, cache.get(key)!, m, x, y, z); object.scale.set(sx, sy, sz); return object;
  };
  const cylinder = (p: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, m: THREE.Material) => {
    const key = 'cyl-' + [r, h].join(','); if (!cache.has(key)) cache.set(key, new THREE.CylinderGeometry(r, r, h, 64)); return mesh(p, cache.get(key)!, m, x, y, z);
  };
  const ring = (p: THREE.Object3D, x: number, y: number, z: number, r: number, thickness: number, m: THREE.Material) => {
    const g = new THREE.TorusGeometry(r, thickness, 8, 96); g.rotateX(Math.PI / 2); return mesh(p, g, m, x, y, z);
  };
  const tube = (p: THREE.Object3D, points: THREE.Vector3[], radius: number, m: THREE.Material, segments = 64) => mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 6, false), m);
  const lathe = (p: THREE.Object3D, profile: number[][], m: THREE.Material, x = 0, y = 0, z = 0) => mesh(p, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 128), m, x, y, z);
  const instances = (p: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, count: number) => {
    geometries.add(geometry); const value = new THREE.InstancedMesh(geometry, material, count); value.castShadow = true; value.receiveShadow = true; p.add(value); return value;
  };
  const dummy = new THREE.Object3D();

  const floor = part('floor');
  box(floor, 0, .12, 0, pastaKitchen.width, .24, pastaKitchen.depth, stone, .1);
  box(floor, 0, .255, 0, pastaKitchen.width - .18, .03, pastaKitchen.depth - .18, ceramic, .06);
  for (let i = 0; i < 9; i++) box(floor, -3.6 + i * .9, .276, 0, .009, .007, 7.36, endgrain, .001);
  for (const z of [-2.5, -1.1, .3, 1.7, 3.1]) box(floor, 0, .276, z, 8.16, .007, .009, endgrain, .001);
  const worktop = part('worktop');
  box(worktop, 0, .78, -2.5, 7.45, 1.02, 1.35, walnut, .07);
  for (let i = 0; i < 52; i++) box(worktop, -3.62 + i * .14, .8, -1.809, .07, .92, .055, endgrain, .016);
  box(worktop, 0, 1.32, -2.5, 7.72, .14, 1.56, stone, .045);
  box(worktop, 0, 1.22, -1.71, 7.5, .025, .025, brass, .004);
  for (const x of [-3.6, 3.6]) box(worktop, x, 2.11, -3.02, .12, 3.68, .12, charcoal);
  box(worktop, 0, 3.89, -2.79, 7.52, .18, .75, walnut, .035);
  for (const x of [-3.24, -2.16, -1.08, 0, 1.08, 2.16, 3.24]) box(worktop, x, 3.98, -2.79, .06, .035, .81, brass, .007);
  box(worktop, 0, 3.78, -2.43, 7.16, .025, .025, light, .003);
  box(worktop, 0, 3.1, -2.54, 7.2, 1.3, .12, charcoal, .04);
  const title = part('title');
  const titleMaterials = createHallWordMaterials(0xffe8be, 0xb68d58); titleMaterials.forEach(m => { materials.add(m); applyVisibility(m); });
  mesh(title, createHallWordGeometry('CARBONARA', font, 6.3, .48), titleMaterials, 0, 3.27, -2.45);
  const captionCanvas = document.createElement('canvas'); captionCanvas.width = 1536; captionCanvas.height = 210;
  const context = captionCanvas.getContext('2d')!; context.clearRect(0, 0, 1536, 210); context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#eadac2'; context.font = '500 60px sans-serif'; context.fillText('パスタ作りが趣味。', 768, 62);
  context.fillStyle = '#d0c4ac'; context.font = '400 43px sans-serif'; context.fillText('よく作るのは、カルボナーラ。', 768, 142);
  const captionTexture = new THREE.CanvasTexture(captionCanvas); captionTexture.colorSpace = THREE.SRGBColorSpace; captionTexture.anisotropy = 8; textures.add(captionTexture);
  const captionMaterial = new THREE.MeshBasicMaterial({ map: captionTexture, transparent: true, depthWrite: false, toneMapped: false }); materials.add(captionMaterial); applyVisibility(captionMaterial);
  mesh(title, new THREE.PlaneGeometry(5.6, .766), captionMaterial, 0, 2.77, -2.463);

  const island = part('island'); island.position.set(-.6, 0, .8);
  cylinder(island, 0, .72, 0, 2.59, .86, walnut);
  for (let i = 0; i < 100; i++) {
    const a = i / 100 * Math.PI * 2;
    const slat = box(island, Math.cos(a) * 2.59, .72, Math.sin(a) * 2.59, .075, .79, .06, endgrain, .018); slat.rotation.y = -a;
  }
  cylinder(island, 0, 1.17, 0, 2.69, .14, stone); ring(island, 0, 1.105, 0, 2.61, .018, light);
  const plate = part('plate'); plate.position.set(-.6, 1.25, .8);
  lathe(plate, [[0,.16],[.7,.16],[1.1,.20],[1.5,.29],[1.75,.40],[1.96,.51],[2.2,.58],[2.42,.60],[2.49,.585],[2.52,.55],[2.51,.515],[2.46,.48],[2.17,.45],[1.8,.32],[1.42,.14],[1.1,.065],[.8,.045],[0,.045]].reverse(), ceramic);
  ring(plate, 0, .582, 0, 2.46, .009, rim); ring(plate, 0, .065, 0, 1.05, .04, ceramic);
  const noodles = part('noodles', plate), foodSurface = new Map<string, number>();
  const cell = .035;
  const recordSurface = (p: THREE.Vector3, radius: number) => {
    const ix = Math.round(p.x / cell), iz = Math.round(p.z / cell);
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      const d2 = ((ix + x) * cell - p.x) ** 2 + ((iz + z) * cell - p.z) ** 2;
      if (d2 > radius * radius) continue;
      const key = `${ix + x},${iz + z}`, y = p.y + Math.sqrt(radius * radius - d2);
      foodSurface.set(key, Math.max(foodSurface.get(key) ?? 0, y));
    }
  };
  const surfaceAt = (x: number, z: number) => foodSurface.get(`${Math.round(x / cell)},${Math.round(z / cell)}`);
  const strand = (parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 112, onPlate = false) => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'), g = new THREE.TubeGeometry(curve, segments, radius, 8, false);
    const positions = g.getAttribute('position'), colors = [], center = new THREE.Vector3();
    for (let j = 0; j <= segments; j++) {
      curve.getPointAt(j / segments, center);
      const taper = .92 + .055 * Math.sin(j * .23) + .025 * Math.cos(j * .71);
      if (onPlate) recordSurface(center, radius * taper);
      for (let k = 0; k <= 8; k++) {
        const i = j * 9 + k;
        positions.setXYZ(i, center.x + (positions.getX(i) - center.x) * taper, center.y + (positions.getY(i) - center.y) * taper, center.z + (positions.getZ(i) - center.z) * taper);
        const warmth = .94 + .06 * Math.sin(j / segments * Math.PI * 2 + points[0].x) ** 2;
        colors.push(warmth, warmth * .99, warmth * .94);
      }
    }
    const indices = Array.from(g.getIndex()!.array);
    for (let k = 1; k < 7; k++) { const last = segments * 9; indices.push(0, k + 1, k, last, last + k, last + k + 1); }
    g.setIndex(indices); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
    return mesh(parent, g, material);
  };
  // A broad, asymmetric nest: each strand climbs and falls across the mound rather than occupying a horizontal ring.
  for (let i = 0; i < 112; i++) {
    const phase = random() * Math.PI * 2, base = .32 + Math.sqrt(random()) * 1.17, turns = .8 + random() * .8, points = [];
    const offsetX = (random() - .5) * .12, offsetZ = (random() - .5) * .13;
    for (let j = 0; j <= 48; j++) {
      const t = j / 48, a = phase + t * Math.PI * 2 * turns;
      const r = base + .17 * Math.sin(a * 2 + phase) + .11 * Math.sin(a * 3.7 + i) + .16 * Math.sin(t * Math.PI * 2);
      const x = Math.cos(a) * r * 1.04 + offsetX, z = Math.sin(a) * r * .86 + offsetZ;
      const height = .31 + 1.06 * Math.max(0, 1 - (Math.hypot(x, z / .9) / 1.9) ** 1.5);
      points.push(new THREE.Vector3(x, height + .065 * Math.sin(a * 2.5 + phase) + (random() - .5) * .01, z));
    }
    strand(noodles, points, .043 + random() * .006, pasta[i % 3], 112, true);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * .83, points = [];
    for (let j = 0; j <= 28; j++) {
      const t = j / 28, angle = a + t * 1.5, r = 1.65 + .28 * Math.sin(t * Math.PI);
      points.push(new THREE.Vector3(Math.cos(angle) * r, .43 + .1 * Math.sin(t * Math.PI) + .03 * Math.cos(t * 8 + i), Math.sin(angle) * r * .86));
    }
    strand(noodles, points, .043, pasta[i % 3], 64, true);
  }
  const saucePart = part('sauce', plate);
  const plateHeight = (r: number) => {
    const profile = [[0,.16],[.7,.16],[1.1,.20],[1.5,.29],[1.75,.40],[1.96,.51],[2.2,.58],[2.42,.60],[2.49,.585]];
    for (let i = 1; i < profile.length; i++) if (r <= profile[i][0]) {
      const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; return y0 + (y1 - y0) * (r - r0) / (r1 - r0);
    }
    return .585;
  };
  const sauceVertices = [], sauceUvs = [], sauceIndices = [];
  for (let ringIndex = 0; ringIndex <= 12; ringIndex++) for (let i = 0; i <= 96; i++) {
    const a = i / 96 * Math.PI * 2, r = ringIndex / 12 * (1.82 + .065 * Math.sin(a * 5) + .04 * Math.cos(a * 9));
    const x = Math.cos(a) * r, z = Math.sin(a) * r * .85;
    sauceVertices.push(x, plateHeight(Math.hypot(x, z)) + .014, z); sauceUvs.push(x * .5, z * .5);
    if (ringIndex < 12 && i < 96) { const k = ringIndex * 97 + i; sauceIndices.push(k, k + 97, k + 1, k + 1, k + 97, k + 98); }
  }
  const sauceGeometry = new THREE.BufferGeometry(); sauceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sauceVertices, 3));
  sauceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(sauceUvs, 2)); sauceGeometry.setIndex(sauceIndices); sauceGeometry.computeVertexNormals(); mesh(saucePart, sauceGeometry, sauce);
  const garnishPoint = (radius = 1.65) => {
    let x = 0, z = 0, y: number | undefined;
    do { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * radius; x = Math.cos(a) * r; z = Math.sin(a) * r * .85; y = surfaceAt(x, z); } while (y === undefined);
    return new THREE.Vector3(x, y, z);
  };
  const guanciale = part('guanciale', plate);
  const seared = new THREE.MeshPhysicalMaterial({ color: 0x8b4b2e, roughness: .4, clearcoat: .32, clearcoatRoughness: .25, bumpMap: searRelief, bumpScale: .025, envMap: reflections, envMapIntensity: .55 });
  const renderedFat = new THREE.MeshPhysicalMaterial({ color: 0xe5bd7e, roughness: .29, clearcoat: .7, clearcoatRoughness: .2, bumpMap: searRelief, bumpScale: .01, envMap: reflections, envMapIntensity: .7 });
  for (const m of [seared, renderedFat]) { materials.add(m); applyVisibility(m); }
  const morselGeometry = new RoundedBoxGeometry(.245, .10, .115, 3, .032), morselPositions = morselGeometry.getAttribute('position');
  for (let i = 0; i < morselPositions.count; i++) {
    const x = morselPositions.getX(i), y = morselPositions.getY(i), z = morselPositions.getZ(i);
    morselPositions.setXYZ(i, x * (1 + .14 * Math.sin(y * 61 + z * 39)), y + .009 * Math.sin(x * 40 + z * 52), z + .015 * Math.sin(x * 33));
  }
  morselGeometry.computeVertexNormals();
  const bacon = instances(guanciale, morselGeometry, seared, 38), streaks = instances(guanciale, new RoundedBoxGeometry(.16, .026, .048, 3, .012), renderedFat, 38);
  const char = standard(0x4b2d20, .64);
  const charred = instances(guanciale, new THREE.DodecahedronGeometry(.019, 0), char, 114);
  for (let i = 0; i < 38; i++) {
    const point = garnishPoint(i % 4 ? 1.4 : 1.7); dummy.position.copy(point); dummy.position.y += .065;
    dummy.rotation.set((random() - .5) * .6, random() * Math.PI, (random() - .5) * .35); dummy.scale.set(.7 + random() * .7, .75 + random() * .5, .8 + random() * .4); dummy.updateMatrix(); bacon.setMatrixAt(i, dummy.matrix);
    const browned = .72 + random() * .28; bacon.setColorAt(i, new THREE.Color().setRGB(browned, browned * (.93 + random() * .07), browned * .85));
    const base = dummy.position.clone(), rotation = dummy.rotation.clone(), scale = dummy.scale.clone();
    dummy.position.add(new THREE.Vector3(.012, .045, -.018).applyEuler(rotation)); dummy.rotation.y += .16; dummy.updateMatrix(); streaks.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 3; j++) {
      dummy.position.copy(base).add(new THREE.Vector3((random() - .5) * .18, .06, (random() - .5) * .07).multiply(scale).applyEuler(rotation)); dummy.scale.set(.5 + random(), .2 + random() * .3, .4 + random()); dummy.updateMatrix(); charred.setMatrixAt(i * 3 + j, dummy.matrix);
    }
  }
  const pepperPart = part('pepper', plate), pepperBits = instances(pepperPart, new THREE.DodecahedronGeometry(.016, 0), pepper, 540);
  const cheesePart = part('cheese', plate), shavings = instances(cheesePart, new THREE.BoxGeometry(.01, .007, .043), cheese, 940);
  for (const [value, count, lift] of [[pepperBits, 540, .012], [shavings, 940, .014]] as const) for (let i = 0; i < count; i++) {
    const point = garnishPoint(1.77); dummy.position.copy(point); dummy.position.y += lift;
    dummy.rotation.set((random() - .5) * 1.5, random() * Math.PI, (random() - .5) * .7); dummy.scale.setScalar(.5 + random()); dummy.updateMatrix(); value.setMatrixAt(i, dummy.matrix);
    if (value === pepperBits) value.setColorAt(i, new THREE.Color().setHSL(.08, .12, .35 + random() * .35));
  }
  const shavingVertices = [], shavingIndices = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, w = .023 * Math.sin(t * Math.PI * .85 + .3);
    shavingVertices.push(-w, .016 * Math.sin(t * Math.PI), t * .12 - .06, w, .016 * Math.sin(t * Math.PI) + .003, t * .12 - .06);
    if (i < 8) { const k = i * 2; shavingIndices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const shavingGeometry = new THREE.BufferGeometry(); shavingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shavingVertices, 3)); shavingGeometry.setIndex(shavingIndices); shavingGeometry.computeVertexNormals();
  const curls = instances(cheesePart, shavingGeometry, cheese, 36);
  for (let i = 0; i < 36; i++) {
    dummy.position.copy(garnishPoint()); dummy.position.y += .022; dummy.rotation.set((random() - .5) * .5, random() * Math.PI, (random() - .5) * .4); dummy.scale.set(.6 + random(), 1, .65 + random() * .7); dummy.updateMatrix(); curls.setMatrixAt(i, dummy.matrix);
  }
  const rimPepper = instances(pepperPart, new THREE.DodecahedronGeometry(.01, 0), pepper, 38);
  for (let i = 0; i < 38; i++) {
    const a = .3 + random() * 2, r = 1.95 + random() * .3; dummy.position.set(Math.cos(a) * r, plateHeight(r) + .012, Math.sin(a) * r);
    dummy.rotation.set(random(), random(), random()); dummy.scale.setScalar(.6 + random()); dummy.updateMatrix(); rimPepper.setMatrixAt(i, dummy.matrix);
  }
  for (const detail of [pepperBits, shavings, curls, rimPepper, charred]) detail.castShadow = false;
  const fork = part('fork', plate); fork.position.set(.85, 1.9, .25); fork.rotation.set(.08, .22, -.3);
  const handleShape = new THREE.Shape(); handleShape.moveTo(-.048, .22); handleShape.bezierCurveTo(-.06,.65,-.15,1.1,-.12,1.39); handleShape.bezierCurveTo(-.11,1.52,.11,1.52,.12,1.39); handleShape.bezierCurveTo(.15,1.1,.06,.65,.048,.22); handleShape.closePath();
  const forkHandle = mesh(fork, new THREE.ExtrudeGeometry(handleShape, { depth: .045, bevelEnabled: true, bevelSegments: 3, bevelSize: .02, bevelThickness: .015, curveSegments: 20 }), steel); forkHandle.scale.y = .88;
  const shoulders = new THREE.Shape(); shoulders.moveTo(-.05,.29); shoulders.bezierCurveTo(-.09,.17,-.32,.16,-.32,0); shoulders.lineTo(.32,0); shoulders.bezierCurveTo(.32,.16,.09,.17,.05,.29); shoulders.closePath();
  mesh(fork, new THREE.ExtrudeGeometry(shoulders, { depth: .04, bevelEnabled: true, bevelSegments: 3, bevelSize: .012, bevelThickness: .009, curveSegments: 12 }), steel);
  for (const x of [-.255, -.085, .085, .255]) tube(fork, [new THREE.Vector3(x,-.025,.035), new THREE.Vector3(x,-.36,.08),new THREE.Vector3(x * .9,-.77,.19)], .03, steel, 32);
  fork.updateMatrix();
  const lifted = part('lifted-noodles', plate);
  for (let i = 0; i < 7; i++) {
    const points = [], phase = i * .83, turns = 1.15 + i * .045;
    for (let j = 0; j <= 56; j++) {
      const t = j / 56, a = phase + t * Math.PI * 2 * turns, r = .265 + .035 * Math.sin(a * 2.2 + i);
      points.push(new THREE.Vector3(Math.cos(a) * r, -.3 + t * .51 + .025 * Math.sin(a * 3), Math.sin(a) * r + .05));
    }
    strand(fork, points, .043, pasta[i % 3], 80);
    const start = points[0].clone().applyMatrix4(fork.matrix), angle = -.9 + i * .47;
    const end = new THREE.Vector3(Math.cos(angle) * (.8 + i * .06), 0, Math.sin(angle) * .78 + .25); end.y = surfaceAt(end.x, end.z) ?? .85;
    strand(lifted, [start, start.clone().add(new THREE.Vector3(.04, -.18, .06)), new THREE.Vector3(start.x * .7 + end.x * .3, Math.max(end.y + .12, start.y - .47), start.z * .6 + end.z * .4 + .16), end], .043, pasta[i % 3], 72);
  }

  const stove = part('stove');
  box(stove, 2.35, 1.405, -2.47, 2.26, .045, 1.18, charcoal, .055);
  for (const x of [1.74,2.9]) { ring(stove,x,1.434,-2.48,.42,.009,steel); ring(stove,x,1.435,-2.48,.36,.005,steel); }
  for (let i=0;i<3;i++) box(stove,1.55+i*.14,1.435,-1.98,.05,.005,.022,light,.002);
  const pan=part('pan',stove); pan.position.set(2.87,1.44,-2.48);
  lathe(pan,[[0,.025],[.35,.025],[.48,.08],[.52,.26],[.51,.28],[.48,.26],[.43,.09],[0,.065]],steel);
  box(pan,.9,.22,0,.78,.075,.12,charcoal,.03);box(pan,.54,.17,0,.19,.12,.16,steel);
  for(let i=0;i<16;i++){const a=random()*Math.PI*2,r=.35*Math.sqrt(random());box(pan,Math.cos(a)*r,.1,Math.sin(a)*r,.08,.05,.06,i%3?crust:fat,.012);}
  const ingredients=part('ingredients');
  box(ingredients,-2.8,1.43,-2.4,1.67,.08,1.02,endgrain,.08);
  box(ingredients,-2.8,1.476,-2.4,1.53,.007,.89,walnut,.07);
  mesh(ingredients,new THREE.CylinderGeometry(.4,.4,.29,48,1,false,0,Math.PI*.54),cheese,-2.97,1.62,-2.45);
  const blade=box(ingredients,-2.47,1.508,-2.2,.57,.018,.13,steel,.005);blade.rotation.y=-.24;
  const handle=box(ingredients,-2.06,1.515,-2.1,.31,.055,.12,charcoal,.018);handle.rotation.y=-.24;
  for(const x of [-2.13,-2.04])sphere(ingredients,x,1.547,-2.1,.012,steel);
  const mixing=part('mixing-bowl',ingredients);mixing.position.set(.26,1.4,-2.44);
  lathe(mixing,[[0,.015],[.25,.015],[.44,.12],[.52,.34],[.5,.36],[.47,.33],[.4,.14],[.22,.045],[0,.045]],steel);
  sphere(mixing,0,.14,0,1,yolk,.4,.035,.36);
  for(const [x,z] of [[-.12,0],[.1,.1]])sphere(mixing,x,.19,z,.12,yolk,1,.5,1);
  for(let i=0;i<5;i++) { const a=i/5*Math.PI*2; tube(mixing,[new THREE.Vector3(-.08,.12,0),new THREE.Vector3(Math.cos(a)*.17,.33,Math.sin(a)*.17),new THREE.Vector3(.13,.56,.06)],.008,steel,24); }
  const whiskHandle=box(mixing,.21,.73,.07,.065,.38,.07,walnut,.02);whiskHandle.rotation.z=-.22;
  box(ingredients,-.76,1.44,-2.57,.65,.075,.47,eggshell,.04);
  for(let i=0;i<3;i++)sphere(ingredients,-.95+i*.19,1.61,-2.57,.11,eggshell,1,1.4,.95);
  const brokenEggs = part('eggshells', ingredients), shellMaterial = standard(0xe9d0a5, .78); shellMaterial.side = THREE.DoubleSide;
  for (let i = 0; i < 2; i++) {
    const shellGeometry = new THREE.SphereGeometry(.12, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), positions = shellGeometry.getAttribute('position');
    for (let j = 0; j < positions.count; j++) {
      const y = positions.getY(j), edge = Math.max(0, 1 + y / .025), angle = Math.atan2(positions.getZ(j), positions.getX(j));
      positions.setY(j, y * 1.15 + edge * (.006 * Math.sin(angle * 13) + .004 * Math.cos(angle * 19)));
    }
    shellGeometry.computeVertexNormals(); const shell = mesh(brokenEggs, shellGeometry, shellMaterial, -.39 + i * .27, 1.54, -2.07 + i * .03); shell.rotation.set(.08, i, .15 - i * .25);
  }
  const cheeseRind = standard(0xb49258, .78), cheeseCrumb = standard(0xe1ca8d, .76);
  mesh(ingredients, new THREE.CylinderGeometry(.405,.405,.287,48,1,true,0,Math.PI*.54), cheeseRind, -2.97,1.62,-2.45);
  const crumbs = instances(ingredients, new THREE.DodecahedronGeometry(.012, 0), cheeseCrumb, 45);
  crumbs.castShadow = false;
  for (let i = 0; i < 45; i++) {
    dummy.position.set(-2.9 + random() * .58, 1.488, -2.55 + random() * .45); dummy.rotation.set(random(),random(),random()); dummy.scale.setScalar(.4 + random()); dummy.updateMatrix(); crumbs.setMatrixAt(i,dummy.matrix);
  }

  const mill=part('pepper-mill',ingredients);mill.position.set(-1.36,1.39,-2.75);
  lathe(mill,[[0,0],[.17,0],[.19,.05],[.16,.12],[.11,.2],[.1,.4],[.17,.53],[.18,.61],[.1,.68],[0,.69]],walnut);
  cylinder(mill,0,.71,0,.032,.05,steel);ring(mill,0,.16,0,.13,.012,brass);
  const grater=part('grater',ingredients);grater.position.set(-1.78,1.44,-2.25);grater.rotation.y=.3;
  const sheet=new THREE.Shape();sheet.moveTo(-.2,0);sheet.lineTo(.2,0);sheet.lineTo(.16,.63);sheet.lineTo(-.16,.63);sheet.closePath();
  for(let row=0;row<7;row++)for(let col=0;col<4;col++){const hole=new THREE.Path();hole.absellipse(-.12+col*.08,.07+row*.077,.021,.015,0,Math.PI*2,true,0);sheet.holes.push(hole);}
  mesh(grater,new THREE.ExtrudeGeometry(sheet,{depth:.018,bevelEnabled:false,curveSegments:8}),steel);
  tube(grater,[new THREE.Vector3(-.13,.61,0),new THREE.Vector3(-.12,.78,0),new THREE.Vector3(.12,.78,0),new THREE.Vector3(.13,.61,0)],.025,charcoal,24);
  tube(grater,[new THREE.Vector3(0,.58,0),new THREE.Vector3(0,.48,-.21),new THREE.Vector3(0,.02,-.33)],.022,steel,24);
  for(let i=0;i<3;i++)lathe(ingredients,[[0,0],[.24,0],[.3,.055],[.34,.08],[.35,.06],[.32,.02],[0,-.015]].reverse(),ceramic,-3.21,1.44+i*.085,-1.99);
  const towel=box(ingredients,-3.33,1.47,-2.9,.4,.04,.49,linen,.012);towel.rotation.y=.12;
  for(let i=0;i<5;i++)box(ingredients,-3.5+i*.08,1.494,-2.9,.007,.005,.45,walnut,.001);
  const bottle=part('bottle',ingredients);bottle.position.set(.99,1.4,-2.9);
  lathe(bottle,[[0,0],[.12,0],[.13,.06],[.12,.48],[.055,.56],[.05,.74],[0,.74]],olive);cylinder(bottle,0,.76,0,.058,.08,brass);
  for(const [x,y] of [[-2.8,2.12],[2.78,2.14]]){
    const hanging=part('hanging-pan',ingredients);hanging.position.set(x,y,-2.89);hanging.rotation.x=Math.PI/2;
    lathe(hanging,[[0,0],[.21,0],[.29,.06],[.3,.11],[.28,.13],[.24,.07],[0,.025]],copper);
    box(hanging,0,.05,-.58,.085,.07,.62,walnut,.02);ring(hanging,0,.05,-.89,.065,.012,brass);
    tube(ingredients,[new THREE.Vector3(x,3.74,-2.91),new THREE.Vector3(x,3.59,-2.86),new THREE.Vector3(x,3.35,-2.84),new THREE.Vector3(x,3.26,-2.91)],.016,brass,24);
  }

  const steamMaterial = new THREE.ShaderMaterial({ transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{opacity:{value:.1}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float opacity; varying vec2 vUv; void main(){float a=sin(vUv.x*3.14159)*pow(1.-vUv.y,1.5)*opacity;gl_FragColor=vec4(1.,.97,.9,a);}' });materials.add(steamMaterial);
  const steams:THREE.Mesh[]=[];
  for(let i=0;i<3;i++){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    for(let j=0;j<=20;j++){const t=j/20,x=Math.sin(t*8+i)*.1;for(const side of [-1,1]){positions.push(x+side*(.035+.07*t),t*.9,Math.sin(t*4+i)*.03);uvs.push(side===-1?0:1,t);}if(j<20){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
    const vapor=mesh(root,g,steamMaterial,-.8+i*.45,2.8,.65+i*.17);vapor.name='pasta-steam';vapor.castShadow=false;steams.push(vapor);
  }
  const lamp=new THREE.PointLight(0xffe4af,18,11,2);lamp.position.set(-.3,4.1,1.7);lamp.castShadow=false;root.add(lamp);
  root.updateMatrixWorld(true);
  for(const group of groups){
    const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const object of [...group.children]){
      if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material)||object.material.transparent)continue;
      object.updateMatrix();const g=batchGeometry.clone(object.geometry);g.applyMatrix4(object.matrix);
      const items=buckets.get(object.material)??[];items.push(g);buckets.set(object.material,items);object.removeFromParent();
    }
    for(const [material,parts] of buckets){
      const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
      if(merged)mesh(group,merged,material);
    }
  }
  batchGeometry.dispose();
  const liveGeometry=new Set<THREE.BufferGeometry>();root.traverse(o=>{if(o instanceof THREE.Mesh)liveGeometry.add(o.geometry);});
  for(const g of geometries)if(!liveGeometry.has(g)){g.dispose();geometries.delete(g);}
  const instanced:THREE.InstancedMesh[]=[];root.traverse(o=>{if(o instanceof THREE.InstancedMesh)instanced.push(o);});
  return {
    update(time:number,reduced:boolean){steams.forEach((s,i)=>{s.visible=!reduced;s.position.y=2.8+((time*.18+i/3)%1)*.35;});lamp.visible=!reduced;},
    updateTime(night:number){lamp.intensity=2+night*14;for(const m of pasta)m.emissiveIntensity=.025+night*.1;sauce.emissiveIntensity=.025+night*.08;},
    dispose(){root.removeFromParent();instanced.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
