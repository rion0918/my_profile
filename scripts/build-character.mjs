// node scripts/build-character.mjs /path/to/Casual_2.gltf /path/to/Casual_Hoodie.gltf
// CC0 source and exact download provenance: public/models/LICENSE.md
import { createStudentPortrait } from "./student-portrait.mjs";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
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
scene.getObjectByName("Casual2_Head").removeFromParent();
const palette = {
  Skin: 0xf3c2a0,
  Red_Dark: 0x487b7e,
  Purple: 0x4f70a6,
  White: 0xf3e9d5,
  LightBlue: 0x333e53,
};
scene.traverse(object => {
  if (!object.isMesh) return;
  for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (palette[material.name]) material.color.setHex(palette[material.name]);
    material.roughness = .85;
    material.side = THREE.FrontSide;
  }
});
const head = scene.getObjectByName("Head");
const portrait = createStudentPortrait();
scene.add(portrait);
portrait.position.copy(head.getWorldPosition(new THREE.Vector3()));
portrait.position.y -= .044;
head.attach(portrait);
const clips = gltf.animations.filter(c => ["Idle", "Walk", "Run"].includes(c.name));
for (const clip of clips) clip.optimize();
const chest = scene.getObjectByName("Chest");
const bag = new THREE.Group();
bag.name = "AtelierBag";
const bagMaterial = new THREE.MeshStandardMaterial({
  color: 0xc99048,
  roughness: 0.9,
});
function bagPanel(w, h, d, radius, material, x, y, z) {
  const blank = new RoundedBoxGeometry(w, h, d, 2, radius);
  blank.deleteAttribute("uv");
  const panel = new THREE.Mesh(mergeVertices(blank), material);
  panel.position.set(x, y, z);
  bag.add(panel);
}
const canvasTrim = new THREE.MeshStandardMaterial({ color: 0xf2c47d, roughness: .9 });
const webbing = new THREE.MeshStandardMaterial({ color: 0x665441, roughness: .95 });
bagPanel(.36, .43, .20, .062, bagMaterial, 0, 0, 0);
bagPanel(.285, .155, .060, .030, canvasTrim, 0, -.083, -.100);
bagPanel(.21, .012, .007, .003, webbing, 0, -.028, -.131);
bagPanel(.030, .025, .008, .004, canvasTrim, .075, -.035, -.136);
scene.add(bag);
bag.position.copy(chest.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, -.072, -.196));
chest.attach(bag);

const tailoring = new THREE.Group();
tailoring.name = "JacketDetails";
scene.add(tailoring);
const cotton = new THREE.MeshStandardMaterial({ color: 0xf5e4cd, roughness: .97 });
for (const side of [-1, 1]) {
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * .120, 1.436, -.095),
    new THREE.Vector3(side * .159, 1.50, .035),
    new THREE.Vector3(side * .164, 1.445, .145),
    new THREE.Vector3(side * .157, 1.286, .184),
    new THREE.Vector3(side * .192, 1.191, .117),
    new THREE.Vector3(side * .191, 1.151, -.023),
    new THREE.Vector3(side * .148, 1.136, -.112),
  ]);
  const strap = new THREE.TubeGeometry(route, 18, .011, 6, false);
  const position = strap.attributes.position;
  for (let ring = 0; ring <= 18; ring++) {
    const center = route.getPointAt(ring / 18);
    for (let j = 0; j <= 6; j++) {
      const i = ring * 7 + j;
      position.setX(i, center.x + (position.getX(i) - center.x) * 2.15);
    }
  }
  strap.computeVertexNormals();
  tailoring.add(new THREE.Mesh(strap, bagMaterial));
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * .045, 1.472, .162),
    new THREE.Vector3(side * .041, 1.425, .185),
    new THREE.Vector3(side * .052, 1.380 + side * .01, .191),
  ]);
  tailoring.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 6, .004, 5, false), cotton));
}
chest.attach(tailoring);
// The walker uses solid materials throughout and needs no texture coordinates.
scene.traverse(object => {
  if (object.isMesh) object.geometry.deleteAttribute("uv");
});
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
