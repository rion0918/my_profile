import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { onsen, isInsideBathhouse } from '../../lib/world-onsen.ts';

export function createOnsen(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial) => void) {
  const root = new THREE.Group(), fixed = new THREE.Group(), roof = new THREE.Group();
  root.name = 'onsen'; roof.name = 'onsen-roof';
  root.position.set(onsen.x, 0, onsen.z); root.add(fixed, roof); scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const palette = { timber: 0x70513c, cedar: 0xa57c52, hinoki: 0xd0ae79, plaster: 0xe9e0c8, tile: 0x546365, tileEdge: 0x71807c, moss: 0x81985c, stone: 0x929a8e, darkStone: 0x65746e, linen: 0x3e7574 };
  const cache = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!cache.has(color)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: .88 });
      applyVisibility(m); materials.add(m); cache.set(color, m);
    }
    return cache.get(color)!;
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.add(geometry); const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.castShadow = !material.transparent; object.receiveShadow = true; parent.add(object); return object;
  };
  const boxes = new Map<string, THREE.BufferGeometry>();
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: number | THREE.Material) => {
    const key = `${w},${h},${d}`;
    if (!boxes.has(key)) boxes.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(.035, w / 5, h / 5, d / 5)));
    return mesh(parent, boxes.get(key)!, typeof material === 'number' ? mat(material) : material, x, y, z);
  };
  const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const beam = (parent: THREE.Object3D, a: number[], b: number[], radius: number, color: number) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const object = mesh(parent, beamGeometry, mat(color));
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    object.scale.set(radius, start.distanceTo(end), radius); return object;
  };
  const pebbleGeometry = new THREE.IcosahedronGeometry(1, 1);
  const rock = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color = palette.stone, angle = 0) => {
    const object = mesh(fixed, pebbleGeometry, mat(color), x, y, z);
    object.scale.set(sx, sy, sz); object.rotation.set(.12 * Math.sin(angle), angle, .08 * Math.cos(angle)); return object;
  };
  const label = (value: string, x: number, y: number, z: number, width: number, background = '#70513c', color = '#fff0cf') => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160;
    const context = canvas.getContext('2d')!;
    context.fillStyle = background; context.fillRect(0, 0, 768, 160);
    context.fillStyle = color; context.font = '600 76px serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(value, 384, 83, 720);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .9, side: THREE.DoubleSide }); applyVisibility(material); materials.add(material);
    return mesh(fixed, new THREE.PlaneGeometry(width, width * 160 / 768), material, x, y, z);
  };

  // Stone paving and visible timber grain keep the close view from looking like flat boxes.
  const paving = document.createElement('canvas'); paving.width = paving.height = 256;
  const p = paving.getContext('2d')!; p.fillStyle = '#9da394'; p.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) for (let column = -1; column < 4; column++) {
    p.fillStyle = ['#c9c5ae', '#d3cdb6', '#bebea9', '#d9d1bb'][(row * 3 + column + 4) % 4];
    p.fillRect(column * 85 + (row % 2) * 42 + 2, row * 64 + 2, 81, 60);
  }
  const stoneTexture = new THREE.CanvasTexture(paving); stoneTexture.colorSpace = THREE.SRGBColorSpace;
  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping; stoneTexture.repeat.set(8, 4); textures.add(stoneTexture);
  const stoneFloor = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: .97 }); applyVisibility(stoneFloor); materials.add(stoneFloor);
  box(fixed, 0, -.025, 0, 16, .15, 8, palette.darkStone);
  box(fixed, 0, .035, 0, 15.85, .025, 7.85, stoneFloor);
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = 128; woodCanvas.height = 256;
  const w = woodCanvas.getContext('2d')!; w.fillStyle = '#d4b17d'; w.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 55; i++) {
    w.strokeStyle = i % 4 ? '#b18c5a55' : '#f2d3a26b'; w.beginPath(); w.moveTo(i * 2.6, 0); w.lineTo(i * 2.6 + Math.sin(i) * 3, 256); w.stroke();
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas); woodTexture.colorSpace = THREE.SRGBColorSpace; textures.add(woodTexture);
  const hinoki = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xfff1d6, roughness: .82 }); applyVisibility(hinoki); materials.add(hinoki);

  // An irregular stone approach joins the existing northern street, without rerouting it.
  for (let i = 0; i < 8; i++) rock(-.4 + Math.sin(i * 2.3) * .18, .025, 4.3 + i * .46, .76, .065, .37, i % 2 ? 0xb9b5a0 : 0xc7c4ac, i * .7);
  const fence = (a: number[], b: number[], height: number) => {
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .16);
    for (let i = 0; i <= count; i++) {
      const t = i / count, x = THREE.MathUtils.lerp(a[0], b[0], t), z = THREE.MathUtils.lerp(a[1], b[1], t);
      beam(fixed, [x, .12, z], [x, height + .03 * Math.sin(i * 2), z], .055, i % 4 ? 0xb5aa74 : 0xc6b989);
    }
    for (const y of [.3, height * .72]) beam(fixed, [a[0], y, a[1]], [b[0], y, b[1]], .045, palette.timber);
    for (let i = 0; i <= count; i += 5) {
      const x = THREE.MathUtils.lerp(a[0], b[0], i / count), z = THREE.MathUtils.lerp(a[1], b[1], i / count);
      beam(fixed, [x, .03, z], [x, height + .12, z], .085, palette.cedar);
    }
  };
  fence([-7.9, -3.9], [.9, -3.9], 1.75);
  fence([-7.9, -3.9], [-7.9, 3.3], 1.55);
  fence([-7.9, 3.3], [-1.7, 3.3], 1.05);

  const tiledRoof = (parent: THREE.Group, x: number, z: number, width: number, depth: number, eave: number, rise: number) => {
    const profile = (u: number) => eave + rise * (1 - u) + .16 * u ** 4;
    for (const side of [-1, 1]) {
      const positions = [], indices = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        for (const end of [-1, 1]) positions.push(x + end * width / 2, profile(u), z + side * depth / 2 * u);
        if (i < 10) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const material = mat(palette.tile); material.side = THREE.DoubleSide; mesh(parent, geometry, material);
      const lanes = Math.ceil(width / .28);
      for (let lane = 0; lane <= lanes; lane++) {
        const xx = x - width / 2 + lane / lanes * width;
        const points = Array.from({ length: 8 }, (_, i) => { const u = i / 7; return new THREE.Vector3(xx, profile(u) + .025, z + side * depth / 2 * u); });
        mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, .058, 6, false), mat(palette.tileEdge));
        const cap = mesh(parent, new THREE.CylinderGeometry(.083, .083, .12, 10), mat(palette.tileEdge), xx, profile(1) + .015, z + side * depth / 2);
        cap.rotation.x = Math.PI / 2;
      }
      for (const u of [.32, .64, .94]) beam(parent, [x - width / 2, profile(u) + .028, z + side * depth / 2 * u], [x + width / 2, profile(u) + .028, z + side * depth / 2 * u], .018, palette.tile);
      box(parent, x, profile(1) - .12, z + side * depth / 2, width + .1, .2, .13, palette.timber);
    }
    beam(parent, [x - width / 2 - .12, eave + rise + .09, z], [x + width / 2 + .12, eave + rise + .09, z], .13, palette.tileEdge);
    for (const end of [-1, 1]) {
      const xx = x + end * (width / 2 + .09);
      beam(parent, [xx, eave + rise, z], [xx + end * .12, eave + rise + .32, z], .095, palette.tile);
    }
  };

  // The entry has its own small tiled gate and split, walk-through noren.
  for (const x of [-1.65, .85]) box(fixed, x, 1.35, 3.9, .23, 2.7, .23, palette.timber);
  box(fixed, -.4, 2.58, 3.9, 2.9, .24, .32, palette.timber);
  const gateRoof = new THREE.Group(); fixed.add(gateRoof); tiledRoof(gateRoof, -.4, 3.9, 3.25, 1.25, 2.78, .47);
  label(onsen.name, -.4, 2.58, 4.08, 2.1);
  for (let i = 0; i < 6; i++) box(fixed, -1.42 + i * .405, 2.04, 3.92, .385, .73, .025, palette.linen);
  label('ゆ', -.4, 2.04, 3.95, .56, '#3e7574');

  const light = new THREE.MeshStandardMaterial({ color: 0xffe9b4, emissive: 0xffbc63, emissiveIntensity: .4, roughness: .8 }); applyVisibility(light); materials.add(light);
  const lantern = (x: number, z: number) => {
    box(fixed, x, .1, z, .6, .18, .6, palette.darkStone);
    box(fixed, x, .45, z, .22, .6, .22, palette.stone);
    box(fixed, x, .86, z, .42, .34, .42, light);
    for (const dx of [-.19, .19]) for (const dz of [-.19, .19]) box(fixed, x + dx, .86, z + dz, .06, .38, .06, palette.darkStone);
    const top = mesh(fixed, new THREE.ConeGeometry(.47, .25, 4), mat(palette.darkStone), x, 1.17, z); top.rotation.y = Math.PI / 4;
    rock(x, 1.34, z, .09, .09, .09, palette.darkStone);
  };
  lantern(-6.8, 2.7); lantern(.1, -3);

  // A rock-lined, milky jade rotenburo. Its outer rim matches the navigation blocker.
  const outdoor = { x: onsen.outdoorBath.x - onsen.x, z: onsen.outdoorBath.z - onsen.z };
  const poolShape = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * Math.PI * 2, r = 1 + .035 * Math.sin(a * 5);
    const x = Math.cos(a) * 2.55 * r, z = Math.sin(a) * 1.75 * r;
    if (i === 0) poolShape.moveTo(x, z); else poolShape.lineTo(x, z);
  }
  poolShape.closePath();
  const basin = mesh(fixed, new THREE.ShapeGeometry(poolShape), mat(0x6c9e8d), outdoor.x, .07, outdoor.z); basin.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2, size = .38 + (i % 4) * .045;
    rock(outdoor.x + Math.cos(a) * 2.77, .22, outdoor.z + Math.sin(a) * 1.96, size * 1.1, .22 + (i % 3) * .035, size, i % 3 ? palette.stone : palette.darkStone, a * 1.7);
  }
  for (let i = 0; i < 7; i++) rock(-5.4 + Math.sin(i * 2) * .48, .28 + (i % 2) * .17, -2.55 + Math.cos(i * 1.8) * .35, .48, .4, .4, palette.darkStone, i);
  box(fixed, -5.25, .62, -2.28, .32, .2, .76, hinoki);
  const stream = new THREE.MeshBasicMaterial({ color: 0xd4eee0, transparent: true, opacity: .65, depthWrite: false }); materials.add(stream);
  mesh(fixed, new THREE.CylinderGeometry(.035, .045, .31, 8), stream, -5.25, .36, -1.94).castShadow = false;
  label('露天風呂', -.95, .88, 1.9, 1.2);
  box(fixed, -.95, .88, 1.865, 1.3, .33, .055, palette.timber);
  box(fixed, -.95, .43, 1.86, .075, .8, .075, palette.timber);
  for (const x of [-6, -3.2]) box(fixed, x, .23, 3, .16, .42, .4, palette.timber);
  for (let i = 0; i < 4; i++) box(fixed, -4.6, .48, 2.85 + i * .11, 3.2, .09, .095, hinoki);

  // Enclosed hinoki bathhouse: plaster walls, cedar structure, shoji, washing stations.
  const house = { x: onsen.bathhouse.x - onsen.x, z: 0 };
  box(fixed, house.x, .025, 0, 6.4, .12, 6.6, hinoki);
  box(fixed, house.x, 1.36, -3.3, 6.4, 2.65, .18, palette.plaster);
  for (const x of [1.2, 7.6]) box(fixed, x, 1.36, 0, .18, 2.65, 6.6, palette.plaster);
  for (const x of [2.25, 6.55]) box(fixed, x, 1.36, 3.3, 2.1, 2.65, .18, palette.plaster);
  for (const x of [1.2, 4.4, 7.6]) for (const z of [-3.3, 3.3]) box(fixed, x, 1.4, z, .17, 2.8, .2, palette.timber);
  for (const y of [.25, 2.5, 2.72]) {
    box(fixed, 4.4, y, -3.3, 6.6, .15, .2, palette.timber);
    box(fixed, 4.4, y, 3.3, 6.6, .15, .2, palette.timber);
    for (const x of [1.2, 7.6]) box(fixed, x, y, 0, .2, .15, 6.6, palette.timber);
  }
  for (let i = 0; i < 17; i++) box(fixed, 1.35 + i * .38, .09, 0, .012, .012, 6.4, palette.cedar);
  for (const x of [2.25, 6.55]) {
    box(fixed, x, 1.55, 3.405, 1.64, 1.35, .035, light);
    for (let i = 0; i < 6; i++) box(fixed, x - .8 + i * .32, 1.55, 3.44, .038, 1.4, .045, palette.timber);
    for (const y of [.87, 1.32, 1.77, 2.22]) box(fixed, x, y, 3.45, 1.66, .038, .045, palette.timber);
  }
  for (const x of [2.5, 6.3]) {
    box(fixed, x, 1.75, -3.185, 2.15, 1.05, .04, light);
    for (let i = 0; i < 7; i++) box(fixed, x - 1.05 + i * .35, 1.75, -3.15, .04, 1.08, .045, palette.timber);
    for (const y of [1.23, 1.75, 2.27]) box(fixed, x, y, -3.14, 2.17, .04, .05, palette.timber);
  }
  for (let i = 0; i < 17; i++) box(fixed, 7.715, .56, -3.12 + i * .39, .045, .79, .36, i % 3 ? palette.cedar : palette.timber);
  box(fixed, 7.72, 1.62, -.25, .035, 1.16, 3.65, light);
  for (let i = 0; i <= 10; i++) box(fixed, 7.76, 1.62, -2.08 + i * .366, .045, 1.2, .04, palette.timber);
  for (const y of [1.04, 1.62, 2.2]) box(fixed, 7.77, y, -.25, .05, .04, 3.7, palette.timber);
  for (let i = 0; i < 5; i++) box(fixed, 3.43 + i * .48, 2.08, 3.33, .45, .68, .025, palette.linen);
  label('内 湯', 4.4, 2.57, 3.46, 1.3);
  for (const z of [-2.5, -.5, 1.5]) box(fixed, house.x, 2.64, z, 6.45, .11, .12, palette.cedar);
  tiledRoof(roof, 4.4, 0, 7.8, 7.65, 2.77, 1.2);
  const gable = new THREE.Shape(); gable.moveTo(-3.3, 0); gable.lineTo(0, 1.18); gable.lineTo(3.3, 0); gable.closePath();
  for (const [x, side] of [[.95, -1], [7.85, 1]]) {
    const panel = mesh(roof, new THREE.ShapeGeometry(gable), mat(palette.plaster), x, 2.78, 0); panel.rotation.y = side * Math.PI / 2;
  }
  for (const x of [.95, 7.85]) for (const side of [-1, 1]) beam(roof, [x, 2.78, side * 3.3], [x, 3.96, 0], .075, palette.timber);
  const indoor = { x: onsen.indoorBath.x - onsen.x, z: onsen.indoorBath.z - onsen.z };
  box(fixed, indoor.x, .15, indoor.z, 4.9, .25, 2.9, 0x709e8e);
  for (const z of [indoor.z - 1.45, indoor.z + 1.45]) box(fixed, indoor.x, .35, z, 5.08, .34, .2, hinoki);
  for (const x of [indoor.x - 2.45, indoor.x + 2.45]) box(fixed, x, .35, indoor.z, .2, .34, 2.9, hinoki);
  for (const x of [2.1, 6.7]) {
    for (const dx of [-.15, .15]) box(fixed, x + dx, .18, 1.2, .07, .23, .34, hinoki);
    box(fixed, x, .32, 1.2, .4, .07, .42, hinoki);
    mesh(fixed, new THREE.CylinderGeometry(.23, .18, .23, 16, 1, true), hinoki, x, .2, 1.8);
    for (const y of [.14, .26]) {
      const hoop = mesh(fixed, new THREE.TorusGeometry(y < .2 ? .195 : .221, .012, 5, 20), mat(palette.timber), x, y, 1.8); hoop.rotation.x = Math.PI / 2;
    }
    beam(fixed, [x, .45, 2.8], [x, .75, 2.8], .035, 0xadab99);
    beam(fixed, [x, .75, 2.8], [x, .75, 2.58], .035, 0xadab99);
    box(fixed, x, 1.2, 3.17, .72, .8, .045, palette.tileEdge);
  }
  box(fixed, 4.4, .63, -2.75, .65, .2, .35, hinoki);
  mesh(fixed, new THREE.CylinderGeometry(.035, .045, .28, 8), stream, 4.4, .4, -2.53).castShadow = false;

  // Garden planting belongs to the facility; the town's grass and trees stay outside.
  for (let i = 0; i < 16; i++) {
    const x = -7.55 + (i % 4) * .24, z = -3.45 + Math.floor(i / 4) * 1.6, h = 1.7 + (i % 3) * .4;
    beam(fixed, [x, .1, z], [x + .1, h, z], .042, 0x7b945c);
    for (let j = 1; j < 5; j++) beam(fixed, [x - .045, h * j / 5, z], [x + .06, h * j / 5, z], .045, 0xa7b07a);
    for (const side of [-1, 1]) {
      beam(fixed, [x, h * .75, z], [x + side * .38, h, z + .12], .012, 0x6f8755);
      const leaf = rock(x + side * .3, h, z + .1, .35, .055, .12, 0x738b54, i); leaf.rotation.z = side * .35;
    }
  }
  for (const [x, z, color] of [[-6.4, -3.1, 0xc78357], [-1.9, -3.1, 0xa8b66c]]) {
    beam(fixed, [x, .1, z], [x + .12, 1.8, z], .075, palette.timber);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, xx = x + Math.cos(a) * .52, zz = z + Math.sin(a) * .44, yy = 1.7 + (i % 3) * .26;
      beam(fixed, [x + .08, 1.25, z], [xx, yy, zz], .025, palette.timber);
      rock(xx, yy, zz, .65, .25, .52, color, a);
    }
  }
  for (let i = 0; i < 14; i++) rock(-7.25 + i * .43, .065, -3.53 + Math.sin(i * 2.3) * .17, .29, .12, .2, palette.moss, i);

  const time = { value: 0 }, waterLight = { value: 1 };
  const waterMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), time, waterLight },
    vertexShader: `varying vec2 bathUv;
      #include <fog_pars_vertex>
      void main(){bathUv=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 bathUv;uniform float time;uniform float waterLight;
      #include <fog_pars_fragment>
      void main(){float wave=sin(bathUv.x*8.+bathUv.y*5.-time*.8)*sin(bathUv.y*10.-time*.65);
      float rings=pow(max(0.,sin(length(bathUv-vec2(.4,.6))*18.-time*1.5)),16.);
      vec3 color=mix(vec3(.36,.65,.57),vec3(.73,.86,.69),.55+wave*.08)+vec3(.09,.12,.08)*rings;
      gl_FragColor=vec4(color*waterLight,.96);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }`,
  }); materials.add(waterMaterial);
  const openWater = mesh(root, new THREE.ShapeGeometry(poolShape), waterMaterial, outdoor.x, .25, outdoor.z); openWater.rotation.x = -Math.PI / 2; openWater.castShadow = false;
  const indoorWater = mesh(root, new THREE.PlaneGeometry(4.65, 2.65), waterMaterial, indoor.x, .33, indoor.z); indoorWater.rotation.x = -Math.PI / 2; indoorWater.castShadow = false;

  const steam = new THREE.Group(); steam.name = 'onsen-steam'; root.add(steam);
  const steamGeometry = new THREE.BufferGeometry(), positions = [], phases = [];
  for (let i = 0; i < 42; i++) {
    const bath = i < 28 ? outdoor : indoor, angle = i * 2.4, r = Math.sqrt((i % 14 + .5) / 14);
    positions.push(bath.x + Math.cos(angle) * r * 1.9, .45, bath.z + Math.sin(angle) * r * 1.1); phases.push((i * .618) % 1);
  }
  steamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); steamGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1)); geometries.add(steamGeometry);
  steamGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 12);
  const steamMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time },
    vertexShader: `attribute float phase;uniform float time;varying float opacity;
      void main(){float age=fract(time*.16+phase);vec3 p=position;p.y+=age*2.6;p.x+=sin(time*.4+phase*6.)*.17;
      opacity=sin(age*3.14159)*.22;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=44.+age*44.;}`,
    fragmentShader: `varying float opacity;void main(){float d=length(gl_PointCoord-vec2(.5));gl_FragColor=vec4(1.,.99,.94,(1.-smoothstep(.1,.5,d))*opacity);}`,
  }); materials.add(steamMaterial); steam.add(new THREE.Points(steamGeometry, steamMaterial));

  // Merge static construction by material, keeping the roof independently removable.
  const batch = (group: THREE.Group) => {
    group.updateWorldMatrix(true, true); const inverse = group.matrixWorld.clone().invert(), buckets = new Map<THREE.Material, THREE.Mesh[]>();
    group.traverse(object => {
      if (object instanceof THREE.Mesh && !Array.isArray(object.material)) {
        const items = buckets.get(object.material) ?? []; items.push(object); buckets.set(object.material, items);
      }
    });
    for (const [material, objects] of buckets) {
      if (objects.length < 2) continue;
      const parts = objects.map(object => {
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
        geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld)); return geometry;
      });
      const geometry = mergeGeometries(parts); parts.forEach(part => part.dispose());
      if (geometry) { objects.forEach(object => object.removeFromParent()); mesh(group, geometry, material); }
    }
  };
  batch(fixed); batch(roof);
  let disposed = false;
  return {
    update(elapsed: number, position: { x: number; z: number }, reduced: boolean) {
      roof.visible = !isInsideBathhouse(position);
      steam.visible = !reduced;
      time.value = reduced ? 0 : elapsed;
    },
    updateTime(lamps: number) { light.emissiveIntensity = .12 + lamps * 1.5; waterLight.value = 1 - lamps * .38; },
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
    },
  };
}
