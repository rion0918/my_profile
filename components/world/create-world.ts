import type { WorldMapData } from "../../lib/world-map-data";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { createCoast } from "./create-coast";
import { createWater } from "./create-water";
import { createStreets } from "./create-streets";
import { bikeStation } from "../../lib/world-bike";
import { createBike } from "./create-bike";
import { createHarbor } from "./create-harbor";
import { createOnsen } from "./create-onsen";
import { isOnsenClearing } from "../../lib/world-onsen";
import { createCharacterVisibility } from "./character-visibility";
import { createWildlife } from "./create-wildlife";
import { createProjectExhibits } from "./create-project-exhibits";
import { isWildlifeClearing } from "../../lib/world-wildlife";
import { getHarborDeckHeight } from "../../lib/world-harbor";
import { getWorldTime } from "../../lib/world-time";
import {
  coastPoint,
  distanceToShore,
  getGroundHeight,
} from "../../lib/world-navigation";
import { createHallWordGeometry, createHallWordMaterials, createHallWordGlow } from "./create-hall-word";
import roundedHallFontData from "./assets/fuwatto.typeface.json";
import hallFontData from "./assets/helvetiker_regular.typeface.json";
import fontData from "./assets/riomaru.typeface.json";
import {
  buildings,
  entranceGardens,
  trees,
  streetlights,
  lightSupports,
  isOnRoad,
  exhibits,
  zoneSigns,
  benches,
  ponds,
  landmark,
  projectExhibits,
} from "../../lib/world-layout";

export async function createWorld(person: THREE.Group,requestRender:()=>void,streetNetwork:WorldMapData["streets"],signal:AbortSignal) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd4d3);
  scene.fog = new THREE.FogExp2(0xbcd4d3, 0.007);
  const landscape = new THREE.Group();
  scene.add(landscape);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const resources: (()=>void)[] = [];
  const instances = new Set<THREE.InstancedMesh>();
  const dispose = () => {
    resources.forEach(release=>release());
    instances.forEach(value=>value.dispose());
    geometries.forEach(value=>value.dispose());
    materials.forEach(value=>value.dispose());
    textures.forEach(value=>value.dispose());
    scene.clear();
  };
  let complete = false, lastYield = performance.now();
  const pause = async () => {
    if(performance.now()-lastYield>12){
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      lastYield=performance.now();
    }
    signal.throwIfAborted();
  };
  try {
  signal.throwIfAborted();
  const materialCache = new Map<number, THREE.MeshStandardMaterial>();
  const geometryCache = new Map<string, THREE.BufferGeometry>();
  let seed = 914;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const material = (color: number) => {
    if (!materialCache.has(color)) {
      const value = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
      materials.add(value);
      materialCache.set(color, value);
    }
    return materialCache.get(color)!;
  };
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffbc67,
    emissive: 0xff8d36,
    emissiveIntensity: 0.75,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xb8ece4,
    metalness: 0.25,
    roughness: 0.22,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const darkGlass = new THREE.MeshStandardMaterial({
    color: 0x647e9d,
    metalness: 0.4,
    roughness: 0.25,
  });
  [glow, glass, darkGlass].forEach((value) => materials.add(value));
  const mesh = (
    geometry: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = Array.isArray(mat) || !mat.transparent;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number | THREE.Material,
    bevel = 0.025,
  ) => {
    const key = `${w},${h},${d},${bevel}`;
    if (!geometryCache.has(key))
      geometryCache.set(
        key,
        new RoundedBoxGeometry(
          w,
          h,
          d,
          2,
          Math.min(bevel, w / 4, h / 4, d / 4),
        ),
      );
    return mesh(
      geometryCache.get(key)!,
      typeof color === "number" ? material(color) : color,
      parent,
      x,
      y,
      z,
    );
  };
  const cylinder = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    top: number,
    bottom: number,
    h: number,
    color: number | THREE.Material,
    sides = 32,
  ) =>
    mesh(
      new THREE.CylinderGeometry(top, bottom, h, sides),
      typeof color === "number" ? material(color) : color,
      parent,
      x,
      y,
      z,
    );
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  const sphere = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    color: number | THREE.Material,
  ) => {
    const result = mesh(
      sphereGeometry,
      typeof color === "number" ? material(color) : color,
      parent,
      x,
      y,
      z,
    );
    result.scale.setScalar(r);
    return result;
  };
  const beam = (
    parent: THREE.Object3D,
    from: number[],
    to: number[],
    r: number,
    color: number | THREE.Material,
  ) => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const result = cylinder(
      parent,
      0,
      0,
      0,
      r * 0.78,
      r,
      a.distanceTo(b),
      color,
      8,
    );
    result.position.copy(a.add(b).multiplyScalar(0.5));
    result.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(new THREE.Vector3(...from)).normalize(),
    );
    return result;
  };
  const tube = (
    parent: THREE.Object3D,
    points: THREE.Vector3[],
    radius: number,
    color: number | THREE.Material,
    closed = false,
  ) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points, closed),
        Math.max(16, points.length * 5),
        radius,
        6,
        closed,
      ),
      typeof color === "number" ? material(color) : color,
      parent,
    );
  const extrude = (
    parent: THREE.Object3D,
    shape: THREE.Shape,
    depth: number,
    color: number | THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    bevel = 0.04,
  ) =>
    mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 2,
        curveSegments: 24,
      }),
      typeof color === "number" ? material(color) : color,
      parent,
      x,
      y,
      z,
    );
  const text = (
    parent: THREE.Object3D,
    label: string,
    x: number,
    y: number,
    z: number,
    width: number,
    color = "#eed9af",
    background?: string,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const context = canvas.getContext("2d")!;
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, 1024, 160);
    }
    context.font = "500 76px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(label, 512, 83, 960);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.add(mat);
    return mesh(
      new THREE.PlaneGeometry(width, width / 6.4),
      mat,
      parent,
      x,
      y,
      z,
    );
  };

  const ambient = new THREE.HemisphereLight(0xc6d4ff, 0xb29acb, 1.65);
  scene.add(ambient);
  const sunset = new THREE.DirectionalLight(0xffd0a1, 3.0);
  sunset.position.set(-22, 32, 19);
  resources.push(()=>sunset.shadow.map?.dispose());
  sunset.castShadow = true;
  sunset.shadow.mapSize.set(2048, 2048);
  Object.assign(sunset.shadow.camera, {
    left: -35,
    right: 35,
    top: 35,
    bottom: -35,
    near: 0.5,
    far: 100,
  });
  sunset.shadow.normalBias = 0.025;
  sunset.shadow.bias = -0.0002;
  sunset.shadow.radius = 4;
  sunset.shadow.blurSamples = 8;
  scene.add(sunset);
  const fill = new THREE.DirectionalLight(0xb3a2ff, 1.35);
  fill.position.set(7, 5, -8);
  scene.add(fill);

  const coast = createCoast(scene);
  resources.push(coast.dispose); await pause();
  const water = createWater(scene, ponds);
  resources.push(water.dispose); await pause();
  const streets = createStreets(scene,streetNetwork);
  resources.push(streets.dispose); await pause();
  const harbor = createHarbor(scene);
  resources.push(harbor.dispose); await pause();
  const windowLights: THREE.PointLight[] = [];

  // Soft contact shadows remain available when real-time shadows are off on phones.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, "rgba(79,52,105,.22)");
  gradient.addColorStop(0.55, "rgba(79,52,105,.12)");
  gradient.addColorStop(1, "rgba(79,52,105,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  textures.add(shadowTexture);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  materials.add(shadowMaterial);
  const shadow = (
    parent: THREE.Object3D,
    x: number,
    z: number,
    w: number,
    d: number,
  ) => {
    const m = mesh(
      new THREE.PlaneGeometry(w, d),
      shadowMaterial,
      parent,
      x,
      0.018,
      z,
    );
    m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
    return m;
  };
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = 64;
  const haloContext = haloCanvas.getContext("2d")!;
  const haloGradient = haloContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  haloGradient.addColorStop(0, "rgba(255,190,94,.6)");
  haloGradient.addColorStop(0.18, "rgba(255,160,60,.22)");
  haloGradient.addColorStop(1, "rgba(255,130,30,0)");
  haloContext.fillStyle = haloGradient;
  haloContext.fillRect(0, 0, 64, 64);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(haloTexture);
  const haloMaterial = new THREE.SpriteMaterial({
    map: haloTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(haloMaterial);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: haloTexture, color: 0xffc579, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
  });
  materials.add(poolMaterial);
  const halo = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    size: number,
  ) => {
    const sprite = new THREE.Sprite(haloMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    parent.add(sprite);
  };
  const arch = (width: number, spring: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, spring);
    shape.absarc(0, spring, width / 2, 0, Math.PI, false);
    shape.closePath();
    return shape;
  };
  const pot = (
    parent: THREE.Object3D,
    x: number,
    z: number,
    scale = 1,
    y = 0,
  ) => {
    cylinder(
      parent,
      x,
      y + 0.2 * scale,
      z,
      0.25 * scale,
      0.18 * scale,
      0.4 * scale,
      0xd98370,
      16,
    );
    cylinder(
      parent,
      x,
      y + 0.4 * scale,
      z,
      0.26 * scale,
      0.26 * scale,
      0.07 * scale,
      0xf3ab86,
      16,
    );
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      const leaf = sphere(
        parent,
        x + Math.cos(a) * 0.12 * scale,
        y + 0.62 * scale,
        z + Math.sin(a) * 0.12 * scale,
        0.16 * scale,
        0x8cc75c,
      );
      leaf.scale.y *= 1.7;
    }
  };
  const addWordGlow=(sign:THREE.Mesh,word:string,font:ReturnType<FontLoader['parse']>,color:number)=>{
    const aura=createHallWordGlow(word,font,sign.geometry,color);
    sign.add(aura);geometries.add(aura.geometry);materials.add(aura.material);textures.add(aura.material.map!);
  };
  const selectable: THREE.Group[] = [];
  const hallFont = new FontLoader().parse(hallFontData);
  const roundedHallFont = new FontLoader().parse(roundedHallFontData);
  for (const building of buildings) {
    await pause();
    const group = new THREE.Group();
    group.position.set(building.x, 0, building.z);
    group.name = `hall-${building.id}`;
    group.userData.detail = building.id;
    group.userData.hallModel = building.model;
    scene.add(group);
    selectable.push(group);
    group.scale.setScalar(building.scale);
    const w = building.width / building.scale,
      d = building.depth / building.scale;
    shadow(landscape, building.x + 0.1, building.z + 0.15, w + 2.2, d + 1.7);
    const theme = building.theme;
    if (building.model === "atelier") {
      // Timber A-frame: open, furnished interior behind a triangular glass facade.
      box(group, 0, 0.12, 0, w + 0.3, 0.24, d + 0.65, theme?.surface ?? 0xaca58c, 0.08);
      for (let i = 0; i < 13; i++)
        box(group, -1.5 + i * 0.25, 0.26, 0, 0.22, 0.06, d + 0.4, 0xe4b17c);
      const roof = new THREE.Shape();
      roof.moveTo(-1.95, 0.32);
      roof.lineTo(0, 3.8);
      roof.lineTo(1.95, 0.32);
      roof.lineTo(1.68, 0.32);
      roof.lineTo(0, 3.34);
      roof.lineTo(-1.68, 0.32);
      roof.closePath();
      extrude(group, roof, d + 0.35, theme?.surface ?? 0x38aaa5, 0, 0, -(d + 0.35) / 2);
      const facade = new THREE.Shape();
      facade.moveTo(-1.61, 0.3);
      facade.lineTo(1.61, 0.3);
      facade.lineTo(0, 3.25);
      facade.closePath();
      const opening = new THREE.Path();
      opening.moveTo(-0.56, 0.28);
      opening.lineTo(0.56, 0.28);
      opening.lineTo(0.56, 1.85);
      opening.lineTo(-0.56, 1.85);
      opening.closePath();
      facade.holes.push(opening);
      mesh(new THREE.ShapeGeometry(facade), glass, group, 0, 0, d / 2 + 0.06);
      for (const z of [-1.3, -0.75, -0.2, 0.35, 0.9, 1.5])
        for (const side of [-1, 1])
          beam(group, [0, 3.83, z], [side * 1.97, 0.32, z], 0.035, theme?.primary ?? 0x88d7c1);
      for (const side of [-1, 1])
        beam(group, [0, 3.35, 1.42], [side * 1.7, 0.3, 1.42], 0.075, theme?.light ?? 0xffe2bb);

      box(group, 0, 1.9, 1.45, 1.8, 0.065, 0.065, theme?.primary ?? 0xf7d6ad);
      box(group, 0.4, 0.94, 0.35, 1.35, 0.09, 0.7, 0xf1c89b);
      for (const x of [-0.15, 0.95])
        box(group, x, 0.6, 0.35, 0.07, 0.7, 0.45, 0x4c5550);
      box(group, 0.35, 1.19, 0.2, 0.54, 0.34, 0.07, 0x2d4144);
      box(group, 0.35, 1.19, 0.245, 0.47, 0.26, 0.01, glow);
      box(group, -1.05, 1.05, -0.6, 0.55, 1.6, 0.5, 0xb29064);
      for (let i = 0; i < 12; i++)
        box(
          group,
          -1.23 + (i % 4) * 0.12,
          0.58 + Math.floor(i / 4) * 0.43,
          -0.31,
          0.08,
          0.27,
          0.14,
          [0x8b5642, 0xc3b782, 0x496568][i % 3],
        );
      cylinder(group, -0.5, 2.45, 0.25, 0.12, 0.34, 0.25, 0xd0a86e);
      sphere(group, -0.5, 2.29, 0.25, 0.12, glow);
      if (!theme) text(group, building.name, 0, 2.45, 1.64, 2, "#f0dfbd", "#65597f");
      text(group, "< / >", 0.35, 1.19, 0.29, 0.45, "#c4edc5");
      pot(group, -1.45, 1.3, 0.7);
    } else if (building.model === "gallery") {
      // A circular gallery with a scalloped roof, brass ribs and an open entrance.
      const r = 1.66;
      cylinder(group, 0, 0.15, 0, r + 0.22, r + 0.3, 0.3, theme?.primary ?? 0xb9b6a2, 64);
      cylinder(group, 0, 0.34, 0, r, r, 0.16, theme?.surface ?? 0xffead2, 64);
      mesh(
        new THREE.CylinderGeometry(r, r, 2, 64, 1, true, 0.5, Math.PI * 2 - 1),
        theme ? material(theme.primary) : darkGlass,
        group,
        0,
        1.4,
        0,
      );
      for (let i = 0; i < 26; i++) {
        const a = 0.5 + (i / 25) * (Math.PI * 2 - 1);
        const x = Math.sin(a) * (r + 0.03),
          z = Math.cos(a) * (r + 0.03);
        cylinder(group, x, 1.4, z, 0.045, 0.045, 2.2, theme?.light ?? 0xffc58e, 8);
        if (i % 4 === 0) {
          const panel = box(
            group,
            Math.sin(a) * (r + 0.045),
            1.44,
            Math.cos(a) * (r + 0.045),
            0.28,
            0.74,
            0.035,
            glow,
          );
          panel.rotation.y = a;
        }
      }
      cylinder(group, 0, 2.53, 0, r + 0.3, r + 0.3, 0.17, theme?.surface ?? 0xffe8d1, 64);
      cylinder(group, 0, 2.67, 0, 1.35, 1.95, 0.17, theme?.primary ?? 0xf0ad88, 64);
      cylinder(group, 0, 2.79, 0, 0.72, 1.35, 0.13, theme?.light ?? 0xffd2a8, 64);
      cylinder(group, 0, 2.87, 0, 0.65, 0.65, 0.07, theme ? material(theme.primary) : darkGlass, 48);
      for (const x of [-0.64, 0.64])
        box(group, x, 1.35, 1.66, 0.07, 2.1, 0.08, theme?.light ?? 0xffe3bb);
      if (!theme) text(group, building.name, 0, 2.2, 1.86, 2, "#f3dfb7", "#65597f");
      cylinder(group, 0, 0.65, 0.5, 0.36, 0.36, 0.6, theme?.surface ?? 0xc8bea4);
      const sculpture = mesh(
        new THREE.TorusKnotGeometry(0.23, 0.065, 48, 8),
        material(theme?.light ?? 0xd7ae70),
        group,
        0,
        1.18,
        0.5,
      );
      sculpture.rotation.x = 0.4;
      ["上宮高校", "神戸電子", "DMM・内定"].forEach((label, i) => {
        const x = (i - 1) * 0.92;
        box(group, x, 0.9, -0.35, 0.68, 1, 0.09, theme?.surface ?? 0xe3c799, 0.03);
        text(group, label, x, 1.08, -0.29, 0.62, `#${(theme?.primary ?? 0x385a55).toString(16).padStart(6, "0")}`);
      });
    } else if (building.model === "music") {
      // A brick barrel-vault studio, with curved copper seams and a record sign.
      box(group, 0, 0.13, 0, w + 0.25, 0.26, d + 0.5, 0xb9aa8d, 0.08);
      const studioShell = arch(w, 1.1);
      studioShell.holes.push(
        new THREE.Path(
          arch(2.5, 0.9)
            .getPoints()
            .map((p) => new THREE.Vector2(p.x, p.y + 0.12)),
        ),
      );
      extrude(group, studioShell, d, theme?.primary ?? 0xd97667, 0, 0.21, -d / 2, 0.07);
      box(group, 0, 0.29, 0, 2.5, 0.12, d, 0xa8865f);
      box(group, 0, 1, -1.12, 2.4, 1.4, 0.12, 0x6e4d3e);
      for (const x of [-0.75, 0, 0.75]) {
        box(group, x, 1.24, -1.02, 0.5, 1, 0.06, 0x283f3e);
        box(group, x, 1.85, -1.01, 0.34, 0.07, 0.07, glow);
      }
      box(group, 0.35, 0.93, 0.24, 1.1, 0.1, 0.55, 0xb9a27d);
      box(group, 0.35, 0.88, 0.25, 0.7, 0.9, 0.35, 0x46615b);
      for (let i = 0; i < 6; i++)
        box(group, 0.04 + i * 0.12, 1, 0.24, 0.04, 0.015, 0.18, 0x343e37);
      cylinder(group, -0.7, 0.81, 0.15, 0.022, 0.022, 1.1, 0x303c38, 8);
      sphere(group, -0.7, 1.37, 0.15, 0.075, 0x48504a).scale.y *= 1.5;
      cylinder(group, -0.7, 0.31, 0.15, 0.18, 0.18, 0.04, 0x303c38, 16);
      const roof = new THREE.Shape();
      roof.absarc(0, 1.1, w / 2 + 0.16, 0, Math.PI, false);
      roof.absarc(0, 1.1, w / 2 + 0.04, Math.PI, 0, true);
      roof.closePath();
      extrude(group, roof, d + 0.3, theme?.primary ?? 0xc86d85, 0, 0.21, -d / 2 - 0.15, 0.02);
      for (let i = 0; i < 9; i++) {
        const z = -d / 2 - 0.15 + (i * (d + 0.3)) / 8;
        tube(
          group,
          Array.from({ length: 25 }, (_, j) => {
            const a = (j / 24) * Math.PI;
            return new THREE.Vector3(
              Math.cos(a) * (w / 2 + 0.18),
              1.31 + Math.sin(a) * (w / 2 + 0.18),
              z,
            );
          }),
          0.027,
          theme?.surface ?? 0xefa3af,
        );
      }
      const windowFrame = arch(2.46, 0.87);
      windowFrame.holes.push(
        new THREE.Path(
          arch(2.18, 0.82)
            .getPoints()
            .map((p) => new THREE.Vector2(p.x, p.y + 0.04)),
        ),
      );
      extrude(group, windowFrame, 0.035, theme?.light ?? 0xdbc4a0, 0, 0.26, d / 2 + 0.07, 0.02);
      mesh(
        new THREE.ShapeGeometry(
          (() => {
            const shape = arch(2.18, 0.82);
            const hole = new THREE.Path();
            hole.moveTo(-0.56, 0);
            hole.lineTo(0.56, 0);
            hole.lineTo(0.56, 1.5);
            hole.lineTo(-0.56, 1.5);
            hole.closePath();
            shape.holes.push(hole);
            return shape;
          })(),
        ),
        glass,
        group,
        0,
        0.3,
        d / 2 + 0.12,
      );
      for (const x of [-0.68, 0.68])
        box(group, x, 1.02, d / 2 + 0.18, 0.06, 1.42, 0.05, theme?.primary ?? 0x77597d);
      box(group, 0, 1.87, d / 2 + 0.19, 2.1, 0.06, 0.05, theme?.primary ?? 0x77597d);
      for (const x of [-0.72, 0.72])
        box(group, x, 0.85, d / 2 + 0.16, 0.51, 0.8, 0.02, glow);
      for (let row = 0; row < 5; row++)
        for (const side of [-1, 1])
          for (let col = 0; col < 3; col++)
            box(
              group,
              side * (1.24 + col * 0.1),
              0.35 + row * 0.17,
              d / 2 + 0.04,
              0.09,
              0.014,
              0.016,
              0xb77c5d,
              0.002,
            );
      const record = cylinder(
        group,
        -1.55,
        2.05,
        1.45,
        0.44,
        0.44,
        0.09,
        0x283e3d,
        48,
      );
      record.rotation.x = Math.PI / 2;
      const recordRing = mesh(
        new THREE.TorusGeometry(0.3, 0.012, 4, 48),
        material(0x74817a),
        group,
        -1.55,
        2.05,
        1.51,
      );
      recordRing.rotation.z = 0.2;
      const label = cylinder(
        group,
        -1.55,
        2.05,
        1.51,
        0.12,
        0.12,
        0.02,
        0xe9bb76,
      );
      label.rotation.x = Math.PI / 2;
      beam(group, [-1.45, 2.4, 1.2], [-1.55, 2.4, 1.5], 0.04, 0x333f37);
      if (!theme) text(group, building.name, 0, 2.18, 1.41, 1.55);
      pot(group, 1.38, 1.4, 0.78);
    } else if (building.model === "workshop" || building.model === "bookshop") {
      const bookshop = building.model === "bookshop";
      const accent = theme?.primary ?? (bookshop ? 0x6c9dc1 : 0x64a897);
      box(group, 0, 0.15, 0, w + 0.3, 0.3, d + 0.35, 0xb7b59b, 0.06);
      box(group, 0, 0.33, 0, w, 0.06, d, 0xe7c99f);
      box(group, 0, 1.5, -d / 2, w, 2.3, 0.15, theme?.surface ?? 0xffe7c6);
      for (const side of [-1, 1]) {
        box(group, side * w / 2, 1.5, 0, 0.15, 2.3, d, accent);
        box(group, side * (w / 4 + 0.28), 1.42, d / 2, w / 2 - 0.56, 2.1, 0.035, glass);
        box(group, side * 0.59, 1.4, d / 2 + 0.04, 0.07, 2.15, 0.08, theme?.primary ?? 0xf6d4ac);
      }
      box(group, 0, 2.72, 0, w + 0.4, 0.22, d + 0.35, theme?.surface ?? accent, 0.06);
      box(group, 0, 2.86, 0, w - 0.25, 0.09, d - 0.2, theme?.light ?? (bookshop ? 0xe9dcc1 : 0xb8d2ba));
      if (!theme) text(group, building.name, 0, 2.35, d / 2 + 0.15, w - 0.3, "#355454", "#f7e8c9");
      else box(group, 0, 2.35, d / 2 + 0.1, w - 0.15, 0.6, 0.1, theme.surface, 0.025);
      if (bookshop) {
        for (const x of [-1.08, 0, 1.08]) {
          box(group, x, 1.25, -d / 2 + 0.25, 0.85, 1.8, 0.35, 0xac875f);
          for (let row = 0; row < 3; row++) {
            box(group, x, 0.55 + row * 0.5, -d / 2 + 0.45, 0.86, 0.055, 0.45, 0xf0c99d);
            for (let i = 0; i < 5; i++) box(group, x - 0.3 + i * 0.14, 0.75 + row * 0.5, -d / 2 + 0.48,
              0.1, 0.32, 0.19, [accent, theme?.light ?? 0xe7c894, theme?.surface ?? 0x92b9a9][(row + i) % 3]);
          }
        }
        box(group, 0, 0.68, 0.4, 1.9, 0.65, 0.65, 0xc4986f, 0.04);
        ["学び", "記録", "技術"].forEach((title, i) => {
          const x = (i - 1) * 0.56;
          box(group, x, 1.14, 0.5, 0.46, 0.58, 0.075, i === 1 ? (theme?.light ?? 0xf1dfbd) : accent, 0.025);
          text(group, title, x, 1.18, 0.55, 0.38, "#294b63");
        });
      } else {
        box(group, 0, 0.94, -0.15, 2.25, 0.12, 1.05, 0xd1ad7d, 0.06);
        for (const x of [-0.85, 0.85]) {
          for (const z of [-0.45, 0.2]) cylinder(group, x, 0.62, z, 0.045, 0.045, 0.65, 0x557d72, 8);
          for (const z of [-0.95, 0.7]) {
            box(group, x, 0.6, z, 0.5, 0.12, 0.48, accent, 0.04);
            box(group, x, 0.92, z + (z > 0 ? 0.2 : -0.2), 0.5, 0.6, 0.09, accent, 0.04);
          }
        }
        box(group, 0, 1.75, -d / 2 + 0.13, 2.9, 1.1, 0.09, 0x507769, 0.04);
        text(group, "Sky / We部", 0, 1.9, -d / 2 + 0.2, 2.5, "#f6efd4");
        text(group, "実務と、コミュニティ", 0, 1.53, -d / 2 + 0.2, 2.3, "#d6dfbf");
        box(group, -0.4, 1.03, -0.2, 0.45, 0.035, 0.3, 0x355651);
        box(group, 0.45, 1.03, -0.1, 0.42, 0.035, 0.32, 0xf7ebd3);
      }
      if (bookshop) pot(group, w / 2 - 0.35, 0.55, d / 2 + 0.16);
      else pot(group, w / 2 - 0.3, d / 2 + 0.25, 0.65);
    } else {
      // A rounded pavilion: pill-shaped walls, wraparound glazing and a bubble mobile.
      box(group, 0, 0.14, 0, w + 0.45, 0.28, d + 0.45, 0xa8ad94, 0.14);
      for (const side of [-1, 1])
        box(
          group,
          side * (w / 2 - 0.15),
          1.17,
          0,
          0.3,
          1.95,
          d,
          theme?.surface ?? 0xffd4ca,
          0.12,
        );
      box(group, 0, 1.17, -d / 2 + 0.12, w, 1.95, 0.25, theme?.surface ?? 0xffd4ca, 0.12);
      for (const side of [-1, 1])
        box(group, side * 1.02, 1.17, d / 2, 0.9, 1.95, 0.25, theme?.surface ?? 0xffd4ca, 0.12);
      for (const side of [-1, 1])
        box(
          group,
          side * 0.97,
          1.25,
          d / 2 + 0.08,
          0.6,
          1.35,
          0.07,
          darkGlass,
          0.05,
        );
      for (const x of [-0.7, 0.7])
        box(group, x, 1.25, 1.37, 0.045, 1.2, 0.05, 0xe3d8b9);

      box(group, 0, 2.19, 0, w + 0.18, 0.25, d + 0.16, 0xffeddb, 0.12);
      box(group, 0, 2.34, 0, w - 0.3, 0.14, d - 0.3, 0x73bfc4, 0.06);
      for (const [x, y, r] of [
        [-0.68, 2.84, 0.48],
        [0.43, 2.67, 0.31],
        [0.1, 3.25, 0.25],
      ]) {
        sphere(group, x, y, 0, r, theme?.light ?? 0xffe7c5);
        beam(group, [x, 2.4, 0], [x, y, 0], 0.025, 0xb6bd9c);
      }
      if (!theme) text(group, building.name, 0, 1.98, 1.43, 2.7, "#304d49");
      pot(group, -1.35, 1.35, 0.75);
    }
    if (theme) {
      const y = building.model === "atelier" ? 2.3 : building.model === "bubble" ? 1.9 : 2.15;
      const width = building.model === "music" ? 2.1 : building.model === "bubble" ? 2.6 : building.model === "workshop" ? 3.55 : 3.15;
      const height = building.model === "bubble" ? 0.55 : 0.62;
      const railWidth = building.model === "music" ? 2.15 : building.model === "bubble" ? 2.8 : building.model === "workshop" ? 3.7 : 3.3;
      const wordFont = Array.from(theme.word).every(char => hallFont.data.glyphs[char]) ? hallFont : roundedHallFont;
      const edging = building.model === "gallery" ? theme.light : theme.primary;
      const lettering=createHallWordMaterials(theme.lettering,edging);
      lettering.forEach(value=>materials.add(value));
      const sign = mesh(createHallWordGeometry(theme.word, wordFont, width, height),
        lettering,
        group, 0, y, d / 2 + 0.22);
      sign.name = 'hall-word-sign';
      sign.userData.word = theme.word;
      addWordGlow(sign,theme.word,wordFont,edging);
      box(group, 0, y - 0.045, d / 2 + 0.26, railWidth, 0.08, 0.25, edging, 0.018);
    }
    const windowLight = new THREE.PointLight(0xffac58, 7, 7, 2);
    windowLight.position.set(0, 1.3, d / 2 + 0.7);
    group.add(windowLight);
    windowLights.push(windowLight);
  }

  // Thin, curved leaves and tapered branching trunks preserve a natural silhouette up close.
  const environmentTime = { value: 0 };
  const leafGeometry = new THREE.BufferGeometry();
  const leafPositions: number[] = [],
    leafUV: number[] = [],
    leafIndices: number[] = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4,
      width = Math.pow(Math.sin(t * Math.PI), 0.8) * 0.075 + 0.002;
    for (const side of [-1, 0, 1]) {
      leafPositions.push(
        side * width,
        t * 0.28,
        t * t * 0.065 - Math.abs(side) * 0.018,
      );
      leafUV.push((side + 1) / 2, t);
    }
    if (i < 4)
      for (let j = 0; j < 2; j++) {
        const a = i * 3 + j;
        leafIndices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
      }
  }
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(leafPositions, 3),
  );
  leafGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(leafUV, 2));
  leafGeometry.setIndex(leafIndices);
  leafGeometry.computeVertexNormals();
  geometries.add(leafGeometry);
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = 128;
  leafCanvas.height = 256;
  const leafContext = leafCanvas.getContext("2d")!;
  const leafGradient = leafContext.createLinearGradient(0, 0, 128, 0);
  leafGradient.addColorStop(0, "#cbcad3");
  leafGradient.addColorStop(0.5, "#fff8ef");
  leafGradient.addColorStop(1, "#e4dfe9");
  leafContext.fillStyle = leafGradient;
  leafContext.fillRect(0, 0, 128, 256);
  leafContext.strokeStyle = "#fff4e9";
  leafContext.lineWidth = 1.4;
  leafContext.beginPath();
  leafContext.moveTo(64, 0);
  leafContext.lineTo(64, 256);
  for (let y = 20; y < 250; y += 28) {
    leafContext.moveTo(64, y);
    leafContext.lineTo(10, y + 32);
    leafContext.moveTo(64, y);
    leafContext.lineTo(118, y + 32);
  }
  leafContext.stroke();
  const leafTexture = new THREE.CanvasTexture(leafCanvas);
  leafTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(leafTexture);
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: leafTexture,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  materials.add(leafMaterial);
  leafMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.natureTime = environmentTime;
    shader.vertexShader =
      "uniform float natureTime;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvec3 leafWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;transformed.x+=sin(natureTime*1.3+leafWorld.x*.6+leafWorld.z*.5)*position.y*.18;",
    );
  };
  const leafCount = 580,
    leaves = new THREE.InstancedMesh(
      leafGeometry,
      leafMaterial,
      trees.length * leafCount,
    );
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  scene.add(leaves);
  instances.add(leaves);
  await pause();
  const dummy = new THREE.Object3D(),
    leafColor = new THREE.Color();
  const barkCanvas = document.createElement("canvas");
  barkCanvas.width = 128;
  barkCanvas.height = 256;
  const barkContext = barkCanvas.getContext("2d")!;
  barkContext.fillStyle = "#958571";
  barkContext.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 160; i++) {
    barkContext.strokeStyle = i % 3 ? "#695f50" : "#c3ae8c";
    barkContext.lineWidth = 0.5 + random() * 2;
    barkContext.beginPath();
    const x = random() * 128,
      y = random() * 256;
    barkContext.moveTo(x, y);
    barkContext.bezierCurveTo(
      x - 4,
      y + 12,
      x + 4,
      y + 30,
      x + (random() - 0.5) * 8,
      y + 25 + random() * 60,
    );
    barkContext.stroke();
  }
  const barkTexture = new THREE.CanvasTexture(barkCanvas);
  barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
  barkTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(barkTexture);
  const barkMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfb8b3,
    map: barkTexture,
    bumpMap: barkTexture,
    bumpScale: 0.035,
    roughness: 0.95,
  });
  materials.add(barkMaterial);
  const branch = (points: THREE.Vector3[], radius: number) => {
    const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        10,
        radius,
        8,
        false,
      ),
      position = geometry.getAttribute("position");
    const curve = new THREE.CatmullRomCurve3(points);
    for (let i = 0; i < position.count; i++) {
      const t = Math.floor(i / 9) / 10,
        center = curve.getPointAt(t),
        scale = 1 - t * 0.76;
      position.setXYZ(
        i,
        center.x + (position.getX(i) - center.x) * scale,
        center.y + (position.getY(i) - center.y) * scale,
        center.z + (position.getZ(i) - center.z) * scale,
      );
    }
    geometry.computeVertexNormals();
    mesh(geometry, barkMaterial, landscape);
  };
  const foliage = [
    0xff7e87, 0xb6d238, 0x64bd7d, 0xe8c539, 0xff94a0, 0x9ecc38, 0x79bc56,
  ];
  for (const [index,tree] of trees.entries()) {
    await pause();
    const base = getGroundHeight(tree),
      height = 3.3 + random() * 1.1,
      centers: THREE.Vector3[] = [];
    shadow(landscape, tree.x + 0.3, tree.z, 4, 3.2).position.y = base + 0.018;
    branch(
      [
        new THREE.Vector3(tree.x, base, tree.z),
        new THREE.Vector3(tree.x + 0.08, base + height * 0.4, tree.z - 0.1),
        new THREE.Vector3(tree.x - 0.12, base + height * 0.75, tree.z + 0.05),
        new THREE.Vector3(tree.x + 0.1, base + height, tree.z),
      ],
      0.18,
    );
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4 + index,
        end = new THREE.Vector3(
          tree.x + Math.cos(a) * 1.1,
          base + height - 0.35 + (i % 3) * 0.35,
          tree.z + Math.sin(a) * 0.95,
        );
      centers.push(end);
      const middle = new THREE.Vector3(
        tree.x + Math.cos(a) * 0.65,
        base + height * 0.76,
        tree.z + Math.sin(a) * 0.55,
      );
      branch(
        [new THREE.Vector3(tree.x, base + height * 0.5, tree.z), middle, end],
        0.065,
      );
      for (let j = 0; j < 2; j++)
        branch(
          [
            middle,
            end
              .clone()
              .add(
                new THREE.Vector3(
                  Math.cos(a + j) * 0.45,
                  0.35,
                  Math.sin(a + j) * 0.4,
                ),
              ),
          ],
          0.025,
        );
    }
    for (let i = 0; i < leafCount; i++) {
      const center = centers[i % centers.length],
        a = random() * Math.PI * 2,
        h = random() * 2 - 1,
        r = Math.cbrt(random()),
        spread = Math.sqrt(1 - h * h) * r;
      dummy.position.set(
        center.x + Math.cos(a) * spread * 0.9,
        center.y + h * r * 0.68,
        center.z + Math.sin(a) * spread * 0.8,
      );
      dummy.rotation.set(
        random() * Math.PI,
        random() * Math.PI * 2,
        random() * Math.PI * 2,
      );
      const size = 0.8 + random() * 0.75;
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      leaves.setMatrixAt(index * leafCount + i, dummy.matrix);
      leafColor
        .set(foliage[index % foliage.length])
        .multiplyScalar(0.9 + random() * 0.3);
      leaves.setColorAt(index * leafCount + i, leafColor);
    }
  }
  // Low plant clusters and meadow blades stay away from the paths and entrances.
  const bladeGeometry = new THREE.BufferGeometry(),
    bladePositions: number[] = [],
    bladeColors: number[] = [],
    bladeIndices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4,
      length = 0.22 + (i % 3) * 0.1,
      base = i * 5;
    const points = [
      [-0.022, 0, 0],
      [0.022, 0, 0],
      [-0.014, length * 0.6, 0.04],
      [0.014, length * 0.6, 0.04],
      [0, length, 0.11],
    ];
    for (const [x, y, z] of points) {
      bladePositions.push(
        x * Math.cos(a) + z * Math.sin(a),
        y,
        -x * Math.sin(a) + z * Math.cos(a),
      );
      const light = 0.7 + (y / length) * 0.3;
      bladeColors.push(light, light, light * 0.9);
    }
    bladeIndices.push(
      base,
      base + 1,
      base + 2,
      base + 1,
      base + 3,
      base + 2,
      base + 2,
      base + 3,
      base + 4,
    );
  }
  bladeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bladePositions, 3),
  );
  bladeGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(bladeColors, 3),
  );
  bladeGeometry.setIndex(bladeIndices);
  bladeGeometry.computeVertexNormals();
  geometries.add(bladeGeometry);
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  bladeMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.natureTime = environmentTime;
    shader.vertexShader = "uniform float natureTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvec3 grassWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;transformed.x+=sin(natureTime*1.2+grassWorld.x*.9+grassWorld.z*.7)*position.y*position.y*.25;",
    );
  };
  materials.add(bladeMaterial);
  const blades = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, 22000);
  scene.add(blades);
  instances.add(blades);
  blades.receiveShadow = true;
  const landmarkCos = Math.cos(landmark.rotation),
    landmarkSin = Math.sin(landmark.rotation);
  const furniturePads = [...entranceGardens.map(p => ({ ...p, rotation: 0, width: p.radius * 2, depth: p.radius * 2 })), ...benches, ...exhibits, ...zoneSigns, ...streetlights, ...projectExhibits].map((p) => ({
    ...p, c: Math.cos(p.rotation), s: Math.sin(p.rotation),
  }));
  let bladeCount = 0;
  for (let i = 0; i < 80000 && bladeCount < 22000; i++) {
    if(i%512===0)await pause();
    const x = (random() - 0.5) * 86,
      z = (random() - 0.5) * 76;
    if (
      distanceToShore({ x, z }) > -3.5 ||
      Math.hypot(x, z) < 4 ||
      ponds.some(
        (p) =>
          Math.abs(x - p.x) < p.width / 2 + 0.5 &&
          Math.abs(z - p.z) < p.depth / 2 + 0.5,
      )
    )
      continue;
    if (
      buildings.some(
        (b) =>
          Math.abs(x - b.x) < b.width / 2 + 0.45 &&
          Math.abs(z - b.z) < b.depth / 2 + 0.6,
      )
    )
      continue;
    if (Math.abs(x - bikeStation.x) < bikeStation.width / 2 + 0.1 && Math.abs(z - bikeStation.z) < bikeStation.depth / 2 + 0.1) continue;
    if (isWildlifeClearing({ x, z })) continue;
    if (isOnsenClearing({ x, z }, .15)) continue;
    if (isOnRoad({ x, z }, 0.35) || getHarborDeckHeight({ x, z }, -0.2) !== null) continue;
    if (furniturePads.some((p) =>
      Math.abs((x - p.x) * p.c - (z - p.z) * p.s) < p.width / 2 + 0.15 &&
      Math.abs((x - p.x) * p.s + (z - p.z) * p.c) < p.depth / 2 + 0.15) ||
      lightSupports.some((p) => Math.hypot(x - p.x, z - p.z) < 0.35)) continue;
    const localX = (x - landmark.x) * landmarkCos - (z - landmark.z) * landmarkSin,
      localZ = (x - landmark.x) * landmarkSin + (z - landmark.z) * landmarkCos;
    if (
      (localX / (landmark.width / 2 + 0.1)) ** 2 +
      (localZ / (landmark.depth / 2 + 0.1)) ** 2 < 1
    ) continue;
    const size = 0.6 + random() * 0.9;
    dummy.position.set(x, getGroundHeight({ x, z }) + 0.008, z);
    dummy.scale.set(size, size, size);
    dummy.rotation.set(
      (random() - 0.5) * 0.25,
      random() * 6,
      (random() - 0.5) * 0.25,
    );
    dummy.updateMatrix();
    blades.setMatrixAt(bladeCount, dummy.matrix);
    leafColor.set([0xa2c94a, 0xc4d969, 0x8cba4e, 0xd6df80][bladeCount % 4]);
    blades.setColorAt(bladeCount++, leafColor);
  }
  blades.count = bladeCount;
  const rockGeometries = Array.from({ length: 6 }, (_, variant) => {
    const geo = new THREE.SphereGeometry(1, 14, 10),
      positions = geo.getAttribute("position"),
      colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i),
        noise =
          1 +
          0.16 * Math.sin(x * 4.5 + variant) * Math.cos(z * 3.8) +
          0.1 * Math.sin(y * 6.2 + z * 2 + variant);
      positions.setXYZ(
        i,
        x * noise,
        Math.max(-0.65, y * noise * 0.8),
        z * noise,
      );
      const c = new THREE.Color(y < -0.15 ? 0xa4a0b0 : 0xe2d1cd).multiplyScalar(
        0.88 + noise * 0.1,
      );
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  });
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.97,
    bumpMap: barkTexture,
    bumpScale: 0.025,
  });
  materials.add(rockMaterial);
  for (let i = 0; i < 170; i++) {
    let x: number, z: number, size: number;
    if (i < 90) {
      const pond = ponds[i % 2],
        a = i * 2.4;
      x = pond.x + Math.cos(a) * (pond.width / 2 + 0.4);
      z = pond.z + Math.sin(a) * (pond.depth / 2 + 0.4);
      size = 0.3 + random() * 0.45;
    } else {
      const p = coastPoint(i * 2.4, -0.9 - random() * 1.3);
      x = p.x;
      z = p.z;
      size = 0.12 + random() * 0.26;
    }
    if (isOnRoad({ x, z }, size * 1.4) || getHarborDeckHeight({ x, z }, -size * 1.4) !== null) continue;
    const rock = mesh(
      rockGeometries[i % 6],
      rockMaterial,
      landscape,
      x,
      getGroundHeight({ x, z }) + size * 0.3,
      z,
    );
    rock.scale.set(size * 1.15, size * 0.8, size);
    rock.rotation.set(random() * 0.2, random() * Math.PI * 2, random() * 0.2);
  }
  for (const bench of benches) {
    const group = new THREE.Group();
    group.position.set(bench.x, getGroundHeight(bench), bench.z);
    group.rotation.y = bench.rotation;
    landscape.add(group);
    box(group, 0, 0.012, 0, 0.85, 0.024, 1.85, 0xe0bfa0, 0.07);
    shadow(group, 0, 0, 1.1, 1.9);
    for (const offset of [-0.43, 0.43]) {
      box(group, 0, 0.23, offset, 0.4, 0.43, 0.065, 0x736886);
      box(group, 0.2, 0.62, offset, 0.055, 0.8, 0.055, 0x736886);
    }
    for (let i = 0; i < 4; i++)
      box(group, -0.18 + i * 0.12, 0.48, 0, 0.095, 0.07, 1.3, 0xf4b78a);
    for (const y of [0.7, 0.85])
      box(group, 0.2, y, 0, 0.065, 0.11, 1.3, 0xf4b78a);
  }
  for (const lamp of streetlights) {
    const group = new THREE.Group();
    group.position.set(lamp.x, getGroundHeight(lamp), lamp.z);
    landscape.add(group);
    cylinder(group, 0, 0.08, 0, 0.14, 0.2, 0.16, 0x716083);
    cylinder(group, 0, 1.1, 0, 0.045, 0.075, 2.2, 0x716083);
    cylinder(group, 0, 2.25, 0, 0.2, 0.12, 0.34, glow, 6);
    cylinder(group, 0, 2.47, 0, 0.04, 0.3, 0.17, 0x716083, 6);
    halo(group, 0, 2.25, 0, 1.1);
    const pool = mesh(new THREE.PlaneGeometry(4.6, 4.6), poolMaterial, group, 0, 0.11, 0);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      beam(group, [Math.cos(a) * 0.15, 2.05, Math.sin(a) * 0.15],
        [Math.cos(a) * 0.2, 2.43, Math.sin(a) * 0.2], 0.018, 0x716083);
    }
  }
  for (const pole of lightSupports) {
    const group = new THREE.Group();
    group.position.set(pole.x, getGroundHeight(pole), pole.z);
    landscape.add(group);
    cylinder(group, 0, 0.06, 0, 0.21, 0.25, 0.12, 0xf5c2a3);
    cylinder(group, 0, pole.height / 2, 0, 0.055, 0.085, pole.height, 0x716083);
    sphere(group, 0, pole.height + 0.07, 0, 0.1, 0xf0c17c);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
      cylinder(group, Math.cos(a) * 0.15, 0.13, Math.sin(a) * 0.15,
        0.026, 0.026, 0.025, 0x716083, 6);
  }
  const festoon = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const t = i / 8, a = lightSupports[0], b = lightSupports[1];
    return new THREE.Vector3(THREE.MathUtils.lerp(a.x, b.x, t),
      THREE.MathUtils.lerp(a.height, b.height, t) - Math.sin(t * Math.PI) * 0.55,
      THREE.MathUtils.lerp(a.z, b.z, t));
  }));
  tube(landscape, festoon.getPoints(64), 0.013, 0x414a3b);
  for (let i = 1; i < 21; i++) {
    const p = festoon.getPoint(i / 21);
    cylinder(landscape, p.x, p.y - 0.05, p.z, 0.025, 0.025, 0.1, 0x454b3c, 8);
    sphere(landscape, p.x, p.y - 0.14, p.z, 0.064, glow);
    halo(landscape, p.x, p.y - 0.14, p.z, 0.55);
  }
  for (const tree of trees)
    for (let i = 0; i < 7; i++) {
      const angle = random() * Math.PI * 2,
        radius = 0.5 + random() * 0.5;
      const x = tree.x + Math.cos(angle) * radius,
        z = tree.z + Math.sin(angle) * radius;
      const shrub = sphere(
        landscape,
        x,
        0.13,
        z,
        0.18 + random() * 0.15,
        i % 2 ? 0x8fc64f : 0xb5d96a,
      );
      shrub.scale.y *= 0.65;
      if (i % 2 === 0) {
        beam(landscape, [x, 0, z], [x, 0.4, z], 0.014, 0x73a752);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          sphere(
            landscape,
            x + Math.cos(a) * 0.045,
            0.4,
            z + Math.sin(a) * 0.045,
            0.048,
            0xffda84,
          ).scale.y *= 0.45;
        }
      }
    }
  await pause();
  // Rounded kana and an open circle form the town's welcome sculpture.
  const welcome = new THREE.Group();
  welcome.name='entrance-wordmark';
  welcome.position.set(landmark.x, 0, landmark.z);
  welcome.rotation.y = landmark.rotation;
  landscape.add(welcome);
  shadow(welcome, 0.1, 0, landmark.width + 0.5, landmark.depth + 0.6);
  const plinth = cylinder(welcome, 0, 0.13, 0, 1.95, 1.95, 0.26, 0xed8c80, 80);
  plinth.scale.z = landmark.depth / landmark.width;
  const inset = cylinder(welcome, 0, 0.27, 0, 1.82, 1.82, 0.04, 0xffd7b1, 80);
  inset.scale.z = landmark.depth / landmark.width;
  const circle = mesh(
    new THREE.TorusGeometry(1.23, 0.095, 10, 96),
    material(0x43b5af),
    welcome,
    0,
    1.43,
    -0.28,
  );
  circle.scale.y = 0.95;
  sphere(welcome, 0.91, 2.25, -0.28, 0.17, 0xffcf75);
  const welcomeLetters=createHallWordMaterials(0xfff2dc,0xe9787d);
  welcomeLetters.forEach(value=>materials.add(value));
  const font = new FontLoader().parse(fontData);
  Array.from(landmark.title).forEach((letter, index) => {
    const geometry = new TextGeometry(letter, {
      font,
      size: 1,
      depth: 0.34,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, 0);
    const glyph = mesh(
      geometry,
      welcomeLetters,
      welcome,
      (index - 1.5) * 0.83,
      0.32 + [0.03, 0, 0.025, 0.01][index],
      0.05,
    );
    glyph.rotation.z = [-0.05, 0.025, -0.025, 0.05][index];
    glyph.name='entrance-word-letter';
    addWordGlow(glyph,letter,font,0xe9787d);
  });

  scene.add(person);
  const personShadow = shadow(person, 0, 0, 1.05, 0.85);
  personShadow.position.y = 0.005;
  const marker = mesh(
    new THREE.RingGeometry(0.42, 0.45, 40),
    material(0xf6db9d),
    person,
    0,
    0.015,
    0,
  );
  marker.rotation.x = -Math.PI / 2;
  const destination = mesh(
    new THREE.RingGeometry(0.18, 0.24, 32),
    glow,
    scene,
    0,
    0.09,
    0,
  );
  destination.rotation.x = -Math.PI / 2;
  destination.visible = false;

  for (const exhibit of [...exhibits, ...zoneSigns]) {
    const group = new THREE.Group();
    group.position.set(exhibit.x, getGroundHeight(exhibit), exhibit.z);
    group.rotation.y = exhibit.rotation;
    if ("id" in exhibit) { group.userData.detail = exhibit.id; selectable.push(group); }
    scene.add(group);
    box(group, 0, 0.012, 0, 2.1, 0.024, 1.1, 0xe0bfa0, 0.06);
    box(group, 0, 1.35, 0, 1.9, 1.25, 0.17, 0x6b638d, 0.06);
    for (const x of [-0.7, 0.7])
      box(group, x, 0.65, 0, 0.09, 1.3, 0.09, 0xb28c96);
    text(group, exhibit.title, 0, 1.63, 0.095, 1.65, "#ffdcac");
    const line = exhibit.tagline;
    text(group, line, 0, 1.25, 0.095, 1.7, "#fff5e7");
    pot(group, 0.7, -0.35, 0.65);
  }
  // The arrival garden frames the mosaic without putting objects on its walking surface.
  const blossomGeometry = new THREE.SphereGeometry(1, 8, 4);
  for (const garden of entranceGardens) {
    const group = new THREE.Group();
    group.position.set(garden.x, 0, garden.z);
    landscape.add(group);
    cylinder(group, 0, 0.16, 0, garden.radius, garden.radius, 0.32, 0xf5d6b6, 40);
    cylinder(group, 0, 0.33, 0, garden.radius - 0.08, garden.radius - 0.08, 0.04, 0x596b4c, 40);
    cylinder(group, 0, 0.37, 0, garden.radius - 0.14, garden.radius - 0.14, 0.04, 0x8da45f, 40);
    cylinder(group, 0, 0.95, 0, 0.065, 0.12, 1.3, 0x8b7462, 10);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const crown = sphere(group, Math.cos(a) * 0.42, 1.85 + (i % 2) * 0.25, Math.sin(a) * 0.35, 0.62, i % 2 ? 0xe9a9b2 : 0xf3c5bc);
      crown.scale.y *= 0.85;
      beam(group, [0, 1.15, 0], [Math.cos(a) * 0.42, 1.85, Math.sin(a) * 0.35], 0.035, 0x8b7462);
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, r = 0.65 + (i % 2) * 0.13;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.5 + (i % 3) * 0.055;
      beam(group, [x, 0.35, z], [x, y, z], 0.012, 0x6b914f);
      for (let j = 0; j < 5; j++) {
        const petal = mesh(blossomGeometry, material(i % 3 ? 0xfff0d8 : 0xd47d96), group, x + Math.cos(j / 5 * Math.PI * 2) * 0.055, y, z + Math.sin(j / 5 * Math.PI * 2) * 0.055);
        petal.scale.set(0.058, 0.023, 0.058);
      }
      mesh(blossomGeometry, material(0xe8bb68), group, x, y + 0.012, z).scale.setScalar(0.03);
    }
  }
  // Raised flower beds, trellises and workshop crates add depth along the streets.
  for (const { x, z } of trees.filter((_, i) => i % 3 === 0)) {
    cylinder(landscape, x, 0.12, z, 1.35, 1.4, 0.24, 0xf5c2a3, 24);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4,
        r = 0.45 + random() * 0.7,
        fx = x + Math.cos(a) * r,
        fz = z + Math.sin(a) * r;
      beam(landscape, [fx, 0.2, fz], [fx, 0.5, fz], 0.018, 0x7cad4f);
      for (let j = 0; j < 4; j++) {
        const petal = sphere(
          landscape,
          fx + Math.cos(j * 1.57) * 0.065,
          0.52,
          fz + Math.sin(j * 1.57) * 0.065,
          0.06,
          i % 3 ? 0xffe39a : 0xf27e9a,
        );
        petal.scale.y *= 0.45;
      }
    }
  }

  for (const b of buildings) {
    for (let i = 0; i < 3; i++)
      box(
        landscape,
        b.x - b.width / 2 - 0.7,
        0.22 + i * 0.02,
        b.z + 1 + i * 0.65,
        0.65,
        0.45,
        0.55,
        [0x9c825e, 0xa39168, 0x7e8e6b][i],
        0.04,
      );
    // Low thresholds bridge the path and the slightly raised floor.
    for (let i = 0; i < 4; i++)
      box(
        landscape,
        b.x,
        0.055 + i * 0.065,
        b.entry.z + 1.05 - i * 0.35,
        1.9,
        0.11 + i * 0.13,
        0.4,
        0xeec4a5,
        0.025,
      );
  }
  // Bake static transforms per material while retaining each building's hit-test group.
  const batch = (group: THREE.Group) => {
    group.updateMatrixWorld(true);
    const buckets = new Map<THREE.Material, THREE.Mesh[]>();
    group.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        !Array.isArray(object.material) &&
        !object.material.transparent
      ) {
        const list = buckets.get(object.material) ?? [];
        list.push(object);
        buckets.set(object.material, list);
      }
    });
    const inverse = group.matrixWorld.clone().invert();
    for (const [mat, objects] of buckets) {
      if (objects.length < 2) continue;
      const parts = objects.map((object) => {
        const geo = object.geometry.index
          ? object.geometry.toNonIndexed()
          : object.geometry.clone();
        for (const key of Object.keys(geo.attributes))
          if (!["position", "normal", "uv", "color"].includes(key))
            geo.deleteAttribute(key);
        if (!geo.getAttribute("uv"))
          geo.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute(
              new Float32Array(geo.getAttribute("position").count * 2),
              2,
            ),
          );
        geo.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
        return geo;
      });
      const merged = mergeGeometries(parts);
      parts.forEach((part) => part.dispose());
      if (merged) {
        objects.forEach((object) => object.removeFromParent());
        mesh(merged, mat, group);
      }
    }
  };
  const chunks = new Map<string, THREE.Group>();
  for (const object of [...landscape.children]) {
    const key = `${Math.floor(object.position.x / 16)},${Math.floor(object.position.z / 16)}`;
    if (!chunks.has(key)) {
      const chunk = new THREE.Group();
      scene.add(chunk);
      chunks.set(key, chunk);
    }
    chunks.get(key)!.add(object);
  }
  for(const chunk of chunks.values()){batch(chunk);await pause();}
  const splitInstances = (source: THREE.InstancedMesh) => {
    const cells = new Map<string, number[]>(),
      matrix = new THREE.Matrix4(),
      position = new THREE.Vector3();
    for (let i = 0; i < source.count; i++) {
      source.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      const key = `${Math.floor(position.x / 16)},${Math.floor(position.z / 16)}`;
      const list = cells.get(key) ?? [];
      list.push(i);
      cells.set(key, list);
    }
    const meshes: THREE.InstancedMesh[] = [];
    for (const indices of cells.values()) {
      const part = new THREE.InstancedMesh(
        source.geometry,
        source.material,
        indices.length,
      );
      part.castShadow = source.castShadow;
      part.receiveShadow = source.receiveShadow;
      indices.forEach((index, i) => {
        source.getMatrixAt(index, matrix);
        part.setMatrixAt(i, matrix);
        source.getColorAt(index, leafColor);
        part.setColorAt(i, leafColor);
      });
      part.computeBoundingSphere();
      scene.add(part);
      instances.add(part);
      meshes.push(part);
    }
    source.removeFromParent();
    source.dispose();
    instances.delete(source);
    return meshes;
  };
  splitInstances(leaves); await pause();
  splitInstances(blades); await pause();
  for(const group of selectable){batch(group);await pause();}
  const doors = buildings.map((b) => {
    const pivot = new THREE.Group();
    pivot.position.set(b.x - 0.91, 0.48, b.entry.z + 0.08);
    scene.add(pivot);
    pivot.userData.entry = b.id;
    box(pivot, 0.91, 1.24, 0, 1.82, 2.48, 0.09, glass, 0.02);
    for (const x of [0, 1.82])
      box(pivot, x, 1.24, 0, 0.07, 2.55, 0.1, b.theme?.primary ?? 0xcbb28b);
    for (const y of [0, 2.48])
      box(pivot, 0.91, y, 0, 1.82, 0.07, 0.1, b.theme?.primary ?? 0xcbb28b);
    box(pivot, 1.61, 1.13, 0.09, 0.045, 0.34, 0.05, b.theme?.light ?? 0xecd1a1);
    selectable.push(pivot);
    return { id: b.id, pivot };
  });
  const bike = createBike(scene);
  resources.push(bike.dispose); await pause();
  const wildlife = createWildlife(scene, shadowTexture);
  resources.push(wildlife.dispose); await pause();
  selectable.push(bike.group);
  const visibility = createCharacterVisibility(person);
  const thermalBaths = createOnsen(scene, visibility.apply);
  resources.push(thermalBaths.dispose); await pause();
  const projectDisplays=createProjectExhibits(scene,visibility.apply,requestRender);
  resources.push(projectDisplays.dispose); await pause();
  selectable.push(...projectDisplays.selectable,...wildlife.selectable);
  materials.forEach(value => {
    if (value instanceof THREE.MeshStandardMaterial && !value.transparent)
      visibility.apply(value);
  });
  const updateTime = (date = new Date()) => {
    const lighting = getWorldTime(date);
    (scene.background as THREE.Color).setHex(lighting.sky);
    (scene.fog as THREE.FogExp2).color.setHex(lighting.sky);
    ambient.color.setHex(lighting.skyLight);
    ambient.groundColor.setHex(lighting.groundLight);
    ambient.intensity = lighting.ambientIntensity;
    sunset.color.setHex(lighting.sunColor);
    sunset.intensity = lighting.sunIntensity;
    sunset.position.set(lighting.sunX, lighting.sunY, lighting.sunZ);
    fill.color.setHex(lighting.fillColor);
    fill.intensity = lighting.fillIntensity;
    glow.emissiveIntensity = 0.08 + lighting.lamps * 1.8;
    haloMaterial.opacity = 0.08 + lighting.lamps * 0.92;
    poolMaterial.opacity = lighting.lamps * 0.55;
    darkGlass.emissive.setHex(0xffb65c);
    darkGlass.emissiveIntensity = lighting.lamps * 0.75;
    glass.emissive.setHex(0xffc78d);
    glass.emissiveIntensity = lighting.lamps * 0.2;
    windowLights.forEach(light => { light.intensity = lighting.lamps * 7; });
    water.updateTime(lighting);
    harbor.updateTime(lighting.lamps);
    thermalBaths.updateTime(lighting.lamps);
    return lighting;
  };
  updateTime();
  let environmentResting = false;
  complete = true;
  return {
    bike,
    wildlife,
    scene,
    person,
    updateVisibility: visibility.update,
    doors,
    selectable,
    destination,
    walkSurfaces: harbor.walkSurfaces,
    reflectWater: water.reflect,
    prepareReflections: water.prepare,
    setReflectionsEnabled: water.setReflectionsEnabled,
    updateTime,
    updateJump(height: number) {
      personShadow.position.y = 0.005 - height;
      personShadow.scale.setScalar(1 + height * 0.3);
      marker.position.y = 0.015 - height;
    },
    updateEnvironment(
      time: number,
      position: THREE.Vector3,
      speed: number,
      reduced: boolean,
    ) {
      environmentTime.value = reduced ? 0 : time;
      water.update(time, position, speed, reduced);
      if (!reduced || !environmentResting) {
        harbor.update(time, reduced);
        wildlife.update(time, reduced);
      }
      environmentResting = reduced;
      projectDisplays.update(time,position,reduced);
      thermalBaths.update(time, position, reduced);
    },
    dispose,
  };
  } finally {
    if(!complete)dispose();
  }
}
