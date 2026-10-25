// node scripts/build-character.mjs /path/to/Casual_2.gltf /path/to/Casual_Hoodie.gltf
// CC0 source and exact download provenance: public/models/LICENSE.md
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
globalThis.ProgressEvent = class ProgressEvent {
  constructor(type, init) {
    Object.assign(this, { type }, init);
  }
};
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const source = await fs.readFile(process.argv[2], "utf8");
const gltf = await new GLTFLoader().parseAsync(source, "");
const scene = gltf.scene;
const hoodie = await new GLTFLoader().parseAsync(
  await fs.readFile(process.argv[3], "utf8"),
  "",
);
const jacket = hoodie.scene.getObjectByName("Casual_Body");
jacket.traverse((o) => {
  if (o.isSkinnedMesh) {
    o.skeleton = new THREE.Skeleton(
      o.skeleton.bones.map((b) => scene.getObjectByName(b.name)),
      o.skeleton.boneInverses,
    );
  }
});
const oldBody = scene.getObjectByName("Casual2_Body");
oldBody.parent.add(jacket);
oldBody.removeFromParent();
const palette = {
  Skin: 0xd7a783,
  Skin_Darker: 0xb78062,
  Hair: 0x30352f,
  Eyebrows: 0x30352f,
  Red_Dark: 0x536e69,
  LightBrown: 0xbe784d,
  Purple: 0xc88051,
  White: 0xeee4cb,
  LightBlue: 0x354b53,
};
scene.traverse((object) => {
  if (object.isMesh) {
    for (const m of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (m.name === "Hair") {
        const geometry = object.geometry,
          position = geometry.getAttribute("position");
        const source = geometry.index
            ? Array.from(geometry.index.array)
            : Array.from({ length: position.count }, (_, i) => i),
          indices = [];
        for (let i = 0; i < source.length; i += 3) {
          const face = source.slice(i, i + 3);
          const y = face.reduce((v, j) => v + position.getY(j), 0) / 3,
            z = face.reduce((v, j) => v + position.getZ(j), 0) / 3;
          if (!(y < 1.69 && z < -0.065)) indices.push(...face);
        }
        geometry.setIndex(indices);
      }
      if (palette[m.name]) m.color.setHex(palette[m.name]);
      m.roughness = 0.85;
      m.side = THREE.FrontSide;
    }
  }
});
const head = scene.getObjectByName("Head");
head.scale.setScalar(1.45);
const clips = gltf.animations.filter((c) =>
  ["Idle", "Walk", "Run"].includes(c.name),
);
for (const clip of clips)
  clip.tracks = clip.tracks.filter((t) => t.name !== "Head.scale");
// The backpack follows the chest bone, including shoulder and breathing motion.
const chest = scene.getObjectByName("Chest");
scene.updateMatrixWorld(true);
console.log(
  "source bounds",
  new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).toArray(),
);
console.log(
  "chest",
  chest.getWorldPosition(new THREE.Vector3()).toArray(),
  "head",
  head.getWorldPosition(new THREE.Vector3()).toArray(),
);
const bag = new THREE.Group();
bag.name = "AtelierBag";
const bagMaterial = new THREE.MeshStandardMaterial({
  color: 0x526d65,
  roughness: 0.9,
});
const body = new THREE.Mesh(
  new RoundedBoxGeometry(0.38, 0.46, 0.22, 3, 0.055),
  bagMaterial,
);
bag.add(body);
const pocket = new THREE.Mesh(
  new RoundedBoxGeometry(0.29, 0.19, 0.065, 2, 0.025),
  new THREE.MeshStandardMaterial({ color: 0x9aaf98, roughness: 0.9 }),
);
pocket.position.set(0, -0.08, -0.13);
bag.add(pocket);
scene.add(bag);
bag.position
  .copy(chest.getWorldPosition(new THREE.Vector3()))
  .add(new THREE.Vector3(0, -0.07, -0.22));
chest.attach(bag);
// Add a zipper, patch pockets and shoulder straps to make the outer layer legible.
const tailoring = new THREE.Group();
tailoring.name = "JacketDetails";
scene.add(tailoring);
const detailMaterial = new THREE.MeshStandardMaterial({
  color: 0x805439,
  roughness: 0.9,
});
function detail(x, y, z, w, h, d) {
  const m = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 2, 0.006),
    detailMaterial,
  );
  m.position.set(x, y, z);
  tailoring.add(m);
  return m;
}
detail(0, 1.28, 0.207, 0.014, 0.45, 0.012);
for (const side of [-1, 1]) {
  detail(side * 0.12, 1.12, 0.203, 0.12, 0.085, 0.018);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.17, 1.2, 0.19),
    new THREE.Vector3(side * 0.18, 1.43, 0.17),
    new THREE.Vector3(side * 0.19, 1.52, 0.02),
    new THREE.Vector3(side * 0.18, 1.4, -0.14),
  ]);
  tailoring.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.025, 6, false),
      bagMaterial,
    ),
  );
}
chest.attach(tailoring);
const buffer = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  animations: clips,
  onlyVisible: true,
});
await fs.mkdir("public/models", { recursive: true });
await fs.writeFile("public/models/rion-walker.glb", Buffer.from(buffer));
console.log(
  "GLB bytes",
  buffer.byteLength,
  "clips",
  clips.map((c) => [c.name, c.duration]),
);
