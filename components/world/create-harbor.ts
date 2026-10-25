import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { harbor, harborDecks, harborRails, harborBoats, harborCargo, harborLights, getHarborDeckHeight } from "../../lib/world-harbor";
import { getGroundHeight } from "../../lib/world-navigation";

export function createHarbor(scene: THREE.Scene) {
  const group = new THREE.Group(), fixed = new THREE.Group();
  scene.add(group); group.add(fixed);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures: THREE.Texture[] = [];
  const palette = { cream: 0xffe6c3, coral: 0xed8c80, teal: 0x43b5af, ink: 0x655976, wood: 0xc99972, gold: 0xf8c773 };
  const cached = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!cached.has(color)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
      cached.set(color, m); materials.add(m);
    }
    return cached.get(color)!;
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    geometries.add(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    return m;
  };
  const boxCache = new Map<string, THREE.BufferGeometry>();
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: number | THREE.Material) => {
    const key = `${w},${h},${d}`;
    if (!boxCache.has(key)) boxCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(0.06, w / 5, h / 5, d / 5)));
    return mesh(parent, boxCache.get(key)!, typeof color === "number" ? mat(color) : color, x, y, z);
  };
  const cylinder = (parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, height: number, color: number | THREE.Material, sides = 24) =>
    mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), typeof color === "number" ? mat(color) : color, x, y, z);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  const sphere = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, color: number) => {
    const m = mesh(parent, sphereGeometry, mat(color), x, y, z); m.scale.setScalar(r); return m;
  };
  const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const beam = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, color: number) => {
    const m = mesh(parent, beamGeometry, mat(color));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.set(radius, a.distanceTo(b), radius);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const tube = (parent: THREE.Object3D, points: THREE.Vector3[], r: number, color: number) =>
    mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(16, points.length * 3), r, 6, false), mat(color));
  const ring = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number) => {
    const m = mesh(parent, new THREE.TorusGeometry(radius, radius * 0.22, 8, 40), mat(palette.coral), x, y, z);
    for (let i = 0; i < 4; i++) {
      const strip = mesh(m, new THREE.TorusGeometry(radius, radius * 0.235, 6, 6, Math.PI / 8), mat(palette.cream));
      strip.rotation.z = i * Math.PI / 2 - Math.PI / 16;
    }
    return m;
  };
  const label = (parent: THREE.Object3D, value: string, x: number, y: number, z: number, width: number, color = "#fff2dc", background = "#655976") => {
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 192;
    const c = canvas.getContext("2d")!; c.fillStyle = background; c.fillRect(0, 0, 1024, 192);
    c.fillStyle = color; c.font = "700 68px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(value, 512, 100, 940);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }); materials.add(material);
    return mesh(parent, new THREE.PlaneGeometry(width, width * 192 / 1024), material, x, y, z);
  };
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffe2a3, emissive: 0xffb65c, emissiveIntensity: 0.8 }); materials.add(lamp);

  // A sloping boardwalk links the existing promenade to the raised timber jetty.
  const timberCanvas = document.createElement("canvas"); timberCanvas.width = 128; timberCanvas.height = 256;
  const wood = timberCanvas.getContext("2d")!;
  wood.fillStyle = "#e7bf92"; wood.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 80; i++) {
    wood.strokeStyle = `rgba(117,77,54,${0.02 + (i % 4) * 0.012})`;
    wood.beginPath(); wood.moveTo(0, i * 3.2); wood.bezierCurveTo(30, i * 3.2 + 3, 80, i * 3.2 - 2, 128, i * 3.2 + 1); wood.stroke();
  }
  const woodTexture = new THREE.CanvasTexture(timberCanvas); woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping; woodTexture.anisotropy = 4; textures.push(woodTexture);
  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.88, color: 0xffeed5 }); materials.add(woodMaterial);
  const walkSurfaces: THREE.Mesh[] = [];
  const [access, pier, head] = harborDecks;
  const accessStart = access.z + access.depth / 2, pierStart = pier.z + pier.depth / 2, headStart = head.z + head.depth / 2;
  const visibleDecks = [
    { ...access, z: (accessStart + pierStart) / 2, depth: accessStart - pierStart },
    { ...pier, z: (pierStart + headStart) / 2, depth: pierStart - headStart }, head,
  ];
  for (const d of visibleDecks) {
    const positions: number[] = [], indices: number[] = [], uv: number[] = [];
    const count = Math.ceil(d.depth / 0.2);
    for (let i = 0; i <= count; i++) {
      const z = d.z - d.depth / 2 + d.depth * i / count;
      const height = getHarborDeckHeight({ x: d.x, z })!;
      positions.push(d.x - d.width / 2, height, z, d.x + d.width / 2, height, z);
      uv.push(0, i / count * d.depth, d.width, i / count * d.depth);
      if (i < count) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const surface = mesh(fixed, geometry, woodMaterial); walkSurfaces.push(surface);
    for (let z = d.z - d.depth / 2 + 0.16; z < d.z + d.depth / 2; z += 0.33) {
      const y = getHarborDeckHeight({ x: d.x, z })!;
      box(fixed, d.x, y + 0.002, z, d.width - 0.025, 0.008, 0.013, palette.wood);
      for (const x of [d.x - d.width / 2 + 0.16, d.x + d.width / 2 - 0.16])
        cylinder(fixed, x, y + 0.009, z - 0.07, 0.017, 0.017, 0.008, palette.ink, 6);
    }
    for (const x of [d.x - d.width / 2 + 0.1, d.x + d.width / 2 - 0.1]) {
      const a = d.z - d.depth / 2, b = d.z + d.depth / 2;
      beam(fixed, new THREE.Vector3(x, getHarborDeckHeight({ x, z: a })! - 0.08, a),
        new THREE.Vector3(x, getHarborDeckHeight({ x, z: b })! - 0.08, b), 0.09, palette.coral);
    }
  }
  // Piles are driven below the seabed rather than ending in midair.
  for (const z of [-34, -36.5, -39, -41.5, -44, -46.7])
    for (const x of z < -44 ? [-7.8, -3.4, 3.4, 7.8] : [-1.7, 1.7]) {
      const ground = getGroundHeight({ x, z }) - 0.18, top = getHarborDeckHeight({ x, z })! - 0.02;
      cylinder(fixed, x, (ground + top) / 2, z, 0.13, 0.17, top - ground, palette.wood, 12);
      for (const y of [-0.22, -0.38]) cylinder(fixed, x, y, z, 0.172, 0.172, 0.08, palette.ink, 12);
    }
  for (const { a, b } of harborRails) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]), count = Math.ceil(length / 1.45);
    for (let i = 0; i <= count; i++) {
      const x = THREE.MathUtils.lerp(a[0], b[0], i / count), z = THREE.MathUtils.lerp(a[1], b[1], i / count), y = getHarborDeckHeight({ x, z })!;
      cylinder(fixed, x, y + 0.46, z, 0.046, 0.06, 0.92, palette.teal, 10);
      sphere(fixed, x, y + 0.93, z, 0.065, palette.cream);
    }
    for (const h of [0.45, 0.87]) {
      const points = Array.from({ length: 32 }, (_, i) => {
        const x = THREE.MathUtils.lerp(a[0], b[0], i / 31), z = THREE.MathUtils.lerp(a[1], b[1], i / 31);
        return new THREE.Vector3(x, getHarborDeckHeight({ x, z })! + h, z);
      }); tube(fixed, points, h > 0.5 ? 0.035 : 0.019, h > 0.5 ? palette.teal : palette.cream);
    }
  }
  for (const x of [-2.75, 2.75]) {
    cylinder(fixed, x, 1.45, -29.3, 0.09, 0.13, 2.9, palette.teal);
    cylinder(fixed, x, 0.12, -29.3, 0.21, 0.24, 0.24, palette.cream);
    sphere(fixed, x, 2.98, -29.3, 0.15, palette.gold);
  }
  box(fixed, 0, 2.6, -29.3, 5.7, 0.62, 0.18, palette.coral);
  label(fixed, "RIOMARU HARBOR", 0, 2.6, -29.197, 5.1);
  ring(fixed, -1.88, 1.12, -38.8, 0.31).rotation.y = -Math.PI / 2;
  ring(fixed, 1.88, 1.12, -41.3, 0.31).rotation.y = Math.PI / 2;

  // Candy-striped lighthouse and a small harbor shelter bookend the lookout deck.
  const lighthouse = new THREE.Group(); lighthouse.position.set(harbor.lighthouse.x, 0.42, harbor.lighthouse.z); fixed.add(lighthouse);
  cylinder(lighthouse, 0, 0.12, 0, 0.89, 0.98, 0.24, palette.cream);
  for (let i = 0; i < 7; i++) cylinder(lighthouse, 0, 0.24 + (i + 0.5) * 0.53, 0, 0.69 - (i + 1) * 0.027, 0.69 - i * 0.027, 0.53, i % 2 ? palette.coral : palette.cream, 48);
  box(lighthouse, 0, 0.69, 0.671, 0.47, 1.12, 0.08, palette.teal);
  sphere(lighthouse, 0.14, 0.71, 0.72, 0.038, palette.gold);
  for (const y of [1.95, 3.0]) {
    box(lighthouse, 0, y, 0.62 - y * 0.05, 0.28, 0.46, 0.08, palette.ink);
    box(lighthouse, 0, y, 0.67 - y * 0.05, 0.025, 0.44, 0.035, palette.cream);
  }
  cylinder(lighthouse, 0, 4.02, 0, 0.97, 0.87, 0.16, palette.teal, 48);
  cylinder(lighthouse, 0, 4.58, 0, 0.58, 0.58, 0.97, lamp, 32);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 0.68, z = Math.sin(a) * 0.68;
    cylinder(lighthouse, x, 4.58, z, 0.025, 0.025, 1.03, palette.ink, 8);
    cylinder(lighthouse, x * 1.35, 4.24, z * 1.35, 0.022, 0.022, 0.35, palette.cream, 8);
  }
  const balcony = mesh(lighthouse, new THREE.TorusGeometry(0.92, 0.025, 6, 48), mat(palette.cream), 0, 4.42); balcony.rotation.x = -Math.PI / 2;
  cylinder(lighthouse, 0, 5.22, 0, 0.1, 1.02, 0.43, palette.teal, 48);
  sphere(lighthouse, 0, 5.5, 0, 0.12, palette.gold);
  cylinder(lighthouse, 0, 5.82, 0, 0.025, 0.025, 0.6, palette.ink, 10);
  const windFlags: THREE.Mesh[] = [];
  const flag = (parent: THREE.Object3D, x: number, y: number, z: number, color: number) => {
    const geometry = new THREE.PlaneGeometry(0.65, 0.32, 8, 3); geometry.translate(0.325, 0, 0);
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85 }); materials.add(material);
    const f = mesh(parent, geometry, material, x, y, z); windFlags.push(f); return f;
  };
  flag(lighthouse, 0, 5.96, 0, palette.coral);
  const hut = new THREE.Group(); hut.position.set(harbor.hut.x, 0.42, harbor.hut.z); fixed.add(hut);
  box(hut, 0, 0.96, 0, 2.5, 1.92, 2.25, palette.cream);
  for (let i = 0; i < 9; i++) box(hut, -1.12 + i * 0.28, 0.96, 1.14, 0.015, 1.85, 0.016, 0xe7c9aa);
  box(hut, -0.62, 0.82, 1.16, 0.63, 1.6, 0.06, palette.teal);
  box(hut, 0.48, 1.16, 1.17, 1.03, 0.78, 0.08, palette.ink);
  box(hut, 0.48, 1.16, 1.22, 0.04, 0.78, 0.04, palette.cream);
  box(hut, 0.48, 1.16, 1.22, 1.03, 0.04, 0.04, palette.cream);
  for (const side of [-1, 1]) box(hut, side * 0.67, 2.19, 0, 1.58, 0.14, 2.65, palette.coral).rotation.z = -side * 0.29;
  label(hut, "HARBOR HOUSE", 0, 1.83, 1.24, 1.9, "#655976", "#ffe6c3");
  for (let i = 0; i < 8; i++) {
    const awning = box(hut, -1.12 + i * 0.32, 1.7, 1.47, 0.32, 0.08, 0.58, i % 2 ? palette.cream : palette.teal); awning.rotation.x = 0.14;
    sphere(hut, -1.12 + i * 0.32, 1.64, 1.76, 0.16, i % 2 ? palette.cream : palette.teal).scale.multiply(new THREE.Vector3(0.99, 0.35, 0.3));
  }
  for (const { x, z } of harborLights) {
    cylinder(fixed, x, 1.5, z, 0.045, 0.07, 2.15, palette.ink);
    cylinder(fixed, x, 2.63, z, 0.18, 0.18, 0.32, lamp, 8);
    cylinder(fixed, x, 2.86, z, 0.02, 0.3, 0.14, palette.teal, 8);
  }

  const boats: THREE.Group[] = [];
  harborBoats.forEach((data, index) => {
    const boat = new THREE.Group(); boat.position.set(data.x, -0.1, data.z); boat.rotation.y = data.rotation; group.add(boat); boats.push(boat);
    const w = data.width, l = data.length, outline = new THREE.Shape();
    outline.moveTo(0, -l / 2);
    outline.bezierCurveTo(w * 0.55, -l * 0.43, w * 0.6, l * 0.25, w * 0.36, l / 2);
    outline.lineTo(-w * 0.36, l / 2);
    outline.bezierCurveTo(-w * 0.6, l * 0.25, -w * 0.55, -l * 0.43, 0, -l / 2);
    const points = outline.getPoints(48), positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const profile = [[-0.48, 0.25, 0.8], [-0.33, 0.6, 0.89], [-0.05, 0.9, 0.97], [0.25, 1, 1], [0.43, 1.02, 1]];
    profile.forEach(([y, sx, sz], row) => points.forEach((p, i) => {
      positions.push(p.x * sx, y + Math.max(0, -p.y / l) * 0.16, p.y * sz); uv.push(i / (points.length - 1), row / 4);
      if (row < profile.length - 1 && i < points.length - 1) {
        const a = row * points.length + i, b = a + points.length;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }));
    const hull = new THREE.BufferGeometry(); hull.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    hull.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); hull.setIndex(indices); hull.computeVertexNormals();
    const hullMat = mat(data.color);
    mesh(boat, hull, hullMat);
    const deckOutline = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.y)));
    const deckGeometry = new THREE.ShapeGeometry(deckOutline); deckGeometry.rotateX(-Math.PI / 2); deckGeometry.scale(0.94, 1, 0.97);
    mesh(boat, deckGeometry, mat(palette.wood), 0, 0.39);
    tube(boat, points.map((p) => new THREE.Vector3(p.x * 1.02, 0.46 + Math.max(0, -p.y / l) * 0.16, p.y)), 0.055, palette.cream);
    tube(boat, points.map((p) => new THREE.Vector3(p.x * 0.95, 0.1 + Math.max(0, -p.y / l) * 0.16, p.y * 0.985)), 0.035, palette.cream);
    for (const side of [-1, 1]) {
      for (const z of [-0.9, 0.5, 1.3]) {
        const fender = cylinder(boat, side * w * 0.48, 0.15, z, 0.12, 0.12, 0.53, palette.cream, 12);
        fender.rotation.z = side * 0.13;
        beam(boat, new THREE.Vector3(side * w * 0.45, 0.48, z), new THREE.Vector3(side * w * 0.49, 0.3, z), 0.014, palette.ink);
      }
      tube(boat, [new THREE.Vector3(side * w * 0.3, 0.86, -0.1), new THREE.Vector3(side * w * 0.25, 0.91, -1.2), new THREE.Vector3(0, 0.93, -l * 0.46)], 0.021, palette.cream);
      for (const z of [-0.1, -1.1]) beam(boat, new THREE.Vector3(side * w * 0.3, 0.46, z), new THREE.Vector3(side * w * 0.3, 0.86, z), 0.018, palette.ink);
    }
    if (data.sail) {
      box(boat, 0, 0.7, 0.6, 1.05, 0.5, 1.5, palette.cream);
      box(boat, 0, 0.98, 0.6, 1.12, 0.09, 1.6, data.color);
      for (const side of [-1, 1]) for (const z of [0.2, 0.7]) {
        const window = cylinder(boat, side * 0.54, 0.75, z, 0.12, 0.12, 0.03, palette.ink); window.rotation.z = Math.PI / 2;
      }
      cylinder(boat, 0, 2.25, -0.2, 0.035, 0.055, 3.7, palette.cream, 12);
      beam(boat, new THREE.Vector3(0, 1.05, -0.2), new THREE.Vector3(-1.4, 1.05, -0.2), 0.035, palette.wood);
      const sail = new THREE.BufferGeometry(), vertices: number[] = [], faces: number[] = [];
      const rows = 18;
      for (let row = 0; row <= rows; row++) {
        const t = row / rows, width = 1.38 * (1 - t);
        for (let col = 0; col <= 8; col++) {
          const u = col / 8;
          vertices.push(-0.055 - width * u, 1.09 + 2.75 * t, -0.2 + Math.sin(u * Math.PI) * (1 - t) * 0.22);
          if (row < rows && col < 8) { const a = row * 9 + col; faces.push(a, a + 1, a + 9, a + 1, a + 10, a + 9); }
        }
      }
      sail.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); sail.setIndex(faces); sail.computeVertexNormals();
      const sailMat = new THREE.MeshStandardMaterial({ color: palette.cream, side: THREE.DoubleSide, roughness: 0.85 });
      materials.add(sailMat); mesh(boat, sail, sailMat);
      tube(boat, [new THREE.Vector3(-1.4, 1.1, -0.2), new THREE.Vector3(-0.7, 2.45, -0.2), new THREE.Vector3(-0.05, 3.84, -0.2)], 0.018, palette.coral);
      flag(boat, 0.01, 3.98, -0.2, palette.coral);
      label(boat, "02", 0, 1.04, 1.43, 0.48, "#655976", "#ffe6c3");
    } else {
      box(boat, 0, 0.96, -0.14, 1.36, 1.08, 1.5, palette.cream);
      box(boat, 0, 1.55, -0.14, 1.7, 0.15, 1.85, data.color);
      box(boat, 0, 1.1, 0.63, 1.03, 0.52, 0.045, palette.ink);
      box(boat, 0, 1.1, 0.67, 0.04, 0.52, 0.02, palette.cream);
      for (const side of [-1, 1]) {
        box(boat, side * 0.7, 1.1, -0.22, 0.04, 0.52, 1.03, palette.ink);
        box(boat, side * 0.73, 1.1, -0.22, 0.02, 0.52, 0.035, palette.cream);
      }
      cylinder(boat, -0.4, 1.93, -0.4, 0.13, 0.16, 0.66, palette.teal, 16);
      cylinder(boat, -0.4, 2.28, -0.4, 0.18, 0.18, 0.08, palette.cream, 16);
      ring(boat, 0.38, 1.67, 0.08, 0.25).rotation.x = -Math.PI / 2;
      box(boat, 0, 0.64, 1.43, 1.3, 0.15, 0.38, palette.wood);
      cylinder(boat, 0.57, 2.0, -0.6, 0.018, 0.018, 0.82, palette.ink, 8);
      flag(boat, 0.57, 2.28, -0.6, palette.teal);
      label(boat, "01", 0, 0.27, l / 2 + 0.015, 0.56);
    }
    for (const z of [-42.6, -39.3]) {
      const x = index ? 2.08 : -2.08;
      cylinder(fixed, x, 0.57, z, 0.11, 0.17, 0.3, palette.ink, 12);
      cylinder(fixed, x, 0.74, z, 0.21, 0.21, 0.07, palette.gold, 12);
      const end = new THREE.Vector3(data.x + (index ? -1 : 1) * w * 0.4, 0.31, z + 0.15);
      tube(fixed, [new THREE.Vector3(x, 0.75, z), new THREE.Vector3((x + end.x) / 2, 0.3, z + 0.05), end], 0.026, palette.cream);
    }
  });
  // Small, functional dockside details stay outside the clear central walkway.
  for (const { x, z } of harborCargo.filter((c) => !c.barrel)) {
    box(fixed, x, 0.72, z, 0.58, 0.6, 0.58, palette.wood);
    for (const y of [0.48, 0.95]) box(fixed, x, y, z + 0.3, 0.58, 0.035, 0.025, palette.cream);
    for (const side of [-1, 1]) box(fixed, x + side * 0.23, 0.72, z + 0.31, 0.045, 0.55, 0.03, palette.cream);
  }
  for (const { x, z } of harborCargo.filter((c) => c.barrel)) {
    cylinder(fixed, x, 0.71, z, 0.26, 0.24, 0.58, palette.teal, 16);
    for (const y of [0.5, 0.91]) cylinder(fixed, x, y, z, 0.27, 0.27, 0.05, palette.cream, 16);
  }
  label(fixed, "THE LOOKOUT", 0, 0.445, -46.25, 2.8, "#b78866", "#e7bf92").rotation.x = -Math.PI / 2;

  // Keep pickable walking surfaces and flags separate while merging fixed draws by material.
  const batch = (parent: THREE.Group) => {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert(), buckets = new Map<THREE.Material, THREE.Mesh[]>();
    parent.traverse((o) => {
      if (o instanceof THREE.Mesh && !walkSurfaces.includes(o) && !windFlags.includes(o) && !Array.isArray(o.material)) {
        const list = buckets.get(o.material) ?? []; list.push(o); buckets.set(o.material, list);
      }
    });
    for (const [material, objects] of buckets) {
      if (objects.length < 2) continue;
      const parts = objects.map((o) => {
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
        g.applyMatrix4(inverse.clone().multiply(o.matrixWorld)); return g;
      });
      const merged = mergeGeometries(parts); parts.forEach((g) => g.dispose());
      if (merged) { objects.forEach((o) => o.removeFromParent()); mesh(parent, merged, material); }
    }
  };
  batch(fixed); boats.forEach(batch);
  return {
    walkSurfaces,
    updateTime(lamps: number) {
      lamp.emissiveIntensity = 0.08 + lamps * 1.8;
    },
    update(time: number, reduced: boolean) {
      const t = reduced ? 0 : time;
      boats.forEach((boat, i) => {
        boat.position.y = -0.1 + (reduced ? 0 : Math.sin(t * 0.9 + i * 2) * 0.035);
        boat.rotation.z = reduced ? 0 : Math.sin(t * 0.75 + i) * 0.012;
        boat.rotation.x = reduced ? 0 : Math.sin(t * 0.65 + i * 1.7) * 0.008;
      });
      windFlags.forEach((flag, i) => {
        const positions = flag.geometry.getAttribute("position");
        for (let j = 0; j < positions.count; j++) {
          const x = positions.getX(j);
          positions.setZ(j, Math.sin(x * 8 - t * 2.8 + i) * x * (reduced ? 0.05 : 0.12));
        }
        positions.needsUpdate = true;
      });
    },
    dispose() {
      group.removeFromParent(); geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
    },
  };
}
