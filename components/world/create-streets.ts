import { zoneBoundary } from "../../lib/world-zones";
import * as THREE from "three";
import type { MultiPolygon } from "polygon-clipping";
import type { WorldMapData } from "../../lib/world-map-data";
import { plaza, entrancePlaza } from "../../lib/world-layout";

export function createStreets(scene: THREE.Scene, network: WorldMapData["streets"]) {
  const group = new THREE.Group();
  scene.add(group);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let seed = 41;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const texture = (canvas: HTMLCanvasElement, color = true) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    textures.push(t);
    return t;
  };
  const stone = document.createElement("canvas");
  stone.width = stone.height = 512;
  const ctx = stone.getContext("2d")!;
  ctx.fillStyle = "#ac8268";
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++)
    for (let col = -1; col < 8; col++) {
      const x = col * 64 + (row % 2) * 32, y = row * 512 / 12;
      const tone = Math.floor(random() * 13);
      ctx.fillStyle = `rgb(${229 + tone},${176 + tone},${128 + tone})`;
      ctx.fillRect(x + 1.4, y + 1.4, 61.2, 512 / 12 - 2.8);
      ctx.fillStyle = "rgba(255,242,214,.3)";
      ctx.fillRect(x + 2, y + 2, 60, 1);
    }
  for (let i = 0; i < 28000; i++) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255,250,225,.09)" : "rgba(85,57,48,.06)";
    ctx.fillRect(random() * 512, random() * 512, 1 + random(), 1);
  }
  const pavingMap = texture(stone);
  pavingMap.wrapS = pavingMap.wrapT = THREE.RepeatWrapping;
  const bumpMap = texture(stone, false);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  const pavementMaterial = new THREE.MeshStandardMaterial({
    map: pavingMap, bumpMap, bumpScale: 0.018, roughness: 0.94, vertexColors: true,
  });
  const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xf5d6b6, roughness: 0.83 });
  materials.push(pavementMaterial, curbMaterial);
  const shapes = (polygons: MultiPolygon) => polygons.map(([outer, ...holes]) => {
    const points = (ring: number[][]) => ring.map(([x, z]) => new THREE.Vector2(x, -z));
    const shape = new THREE.Shape(points(outer));
    shape.holes = holes.map((ring) => new THREE.Path(points(ring)));
    return shape;
  });
  const surface = new THREE.ShapeGeometry(shapes(network.surface));
  surface.rotateX(-Math.PI / 2);
  const position = surface.getAttribute("position");
  surface.setAttribute("uv", new THREE.Float32BufferAttribute(
    Array.from({ length: position.count }, (_, i) => [position.getX(i) / 4, position.getZ(i) / 4]).flat(), 2));
  const north = new THREE.Color(0xb1c1ac), south = new THREE.Color(0xffffff);
  surface.setAttribute("color", new THREE.Float32BufferAttribute(
    Array.from({ length: position.count }, (_, i) => north.clone().lerp(south,
      THREE.MathUtils.smoothstep(position.getZ(i), zoneBoundary - 4, zoneBoundary + 4)).toArray()).flat(), 3));
  const pavement = new THREE.Mesh(surface, pavementMaterial);
  pavement.position.y = 0.035;
  pavement.receiveShadow = true;
  group.add(pavement);
  geometries.push(surface);
  const curbGeometry = new THREE.ExtrudeGeometry(shapes(network.curb), {
    depth: 0.07, bevelEnabled: false, steps: 1,
  });
  curbGeometry.rotateX(-Math.PI / 2);
  const curb = new THREE.Mesh(curbGeometry, curbMaterial);
  curb.receiveShadow = true;
  group.add(curb);
  geometries.push(curbGeometry);

  // Radial cut-stone paving is flush with the streets, so the plaza stays walkable.
  const mosaic = document.createElement("canvas");
  mosaic.width = mosaic.height = 1024;
  const m = mosaic.getContext("2d")!;
  m.translate(512, 512);
  m.fillStyle = "#bb9477";
  m.fillRect(-512, -512, 1024, 1024);
  const bands = [0, 76, 145, 214, 283, 352, 421, 473, 512];
  for (let ring = 1; ring < bands.length; ring++) {
    const count = Math.max(12, Math.round(bands[ring] / 14));
    for (let i = 0; i < count; i++) {
      const start = (i + ring % 2 / 2) / count * Math.PI * 2;
      const end = start + Math.PI * 2 / count;
      m.beginPath();
      m.arc(0, 0, bands[ring] - 1.5, start + 0.003, end - 0.003);
      m.arc(0, 0, bands[ring - 1] + 1.5, end - 0.003, start + 0.003, true);
      m.closePath();
      const light = random() * 7;
      m.fillStyle = ring === 7 ? `hsl(17, 43%, ${67 + light}%)` : `hsl(34, 48%, ${74 + light}%)`;
      m.fill();
    }
  }
  for (let i = 0; i < 70000; i++) {
    m.fillStyle = random() > 0.5 ? "rgba(255,250,230,.1)" : "rgba(93,64,46,.07)";
    m.fillRect(random() * 1024 - 512, random() * 1024 - 512, 1.5, 1);
  }
  m.fillStyle = "#e6bd76";
  m.beginPath(); m.arc(0, 0, 61, 0, Math.PI * 2); m.fill();
  m.strokeStyle = "#aa8062"; m.lineWidth = 2;
  m.beginPath(); m.arc(0, 0, 53, 0, Math.PI * 2); m.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    m.save(); m.rotate(a);
    m.fillStyle = i % 2 ? "#fff0cb" : "#6f9390";
    m.beginPath(); m.moveTo(0, -47); m.lineTo(11, 0); m.lineTo(0, 11); m.lineTo(-11, 0); m.fill();
    m.restore();
  }
  const mosaicMap = texture(mosaic);
  const mosaicBump = texture(mosaic, false);
  const plazaMaterial = new THREE.MeshStandardMaterial({
    map: mosaicMap, bumpMap: mosaicBump, bumpScale: 0.012, roughness: 0.88,
  });
  materials.push(plazaMaterial);
  for (const site of [plaza, entrancePlaza]) {
    const plazaGeometry = new THREE.CircleGeometry(site.radius - 0.015, 128);
    plazaGeometry.rotateX(-Math.PI / 2);
    const plazaMesh = new THREE.Mesh(plazaGeometry, plazaMaterial);
    plazaMesh.name = site === entrancePlaza ? 'entrance-mosaic' : 'central-mosaic';
    plazaMesh.position.set(site.x, 0.043, site.z);
    plazaMesh.receiveShadow = true;
    group.add(plazaMesh);
    geometries.push(plazaGeometry);
  }
  return {
    dispose() {
      group.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
