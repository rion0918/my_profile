import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Model in metres with +Z facing forwards, just like the source rig.
export function createStudentPortrait() {
  const portrait = new THREE.Group();
  portrait.name = 'StudentPortrait';
  const colors = {
    Skin: 0xf3c2a0, Blush: 0xeaa78e, Ink: 0x322c39, Hair: 0x302c39,
    Cap: 0x4a998e, Stitch: 0x78b5a5, Cream: 0xffecd3,
  };
  const parts = new Map();
  function add(color, geometry) {
    if (!parts.has(color)) parts.set(color, []);
    parts.get(color).push(geometry);
  }
  function oval(color, x, y, z, width, height, depth, turn = 0, tilt = 0) {
    const geometry = width > .15 ? new THREE.SphereGeometry(1, 24, 16) : new THREE.SphereGeometry(1, 10, 8);
    geometry.scale(width, height, depth).rotateZ(tilt).rotateY(turn).translate(x, y, z);
    add(color, geometry);
  }
  function line(color, points, radius) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    add(color, new THREE.TubeGeometry(path, 7, radius, 5, false));
  }

  const cy = .255, cz = .015, width = .223, height = .219, depth = .192;
  function onFace(x, y) {
    return cz + depth * Math.sqrt(1 - (x / width) ** 2 - ((y - cy) / height) ** 2);
  }
  oval('Skin', 0, .055, -.006, .075, .113, .072);
  oval('Skin', 0, cy, cz, width, height, depth);
  for (const side of [-1, 1]) {
    oval('Skin', side * .211, .229, .012, .042, .053, .033);
    oval('Blush', side * .232, .230, .033, .016, .028, .014);
    const x = side * .086, y = .257, turn = side * .33;
    oval('Ink', x, y, onFace(x, y), .018, .025, .009, turn);
    oval('Cream', x - .003, y + .009, onFace(x, y) + .008, .0046, .0055, .003);
    oval('Blush', side * .132, .214, onFace(.132, .214), .020, .007, .003, side * .55);
    line('Hair', [[side * .062, .303], [side * .084, .309], [side * .110, .305]]
      .map(([bx, by]) => [bx, by, onFace(bx, by) + .002]), .0048);
  }
  oval('Skin', 0, .221, onFace(0, .221), .019, .018, .023);
  line('Ink', [[-.031, .179], [-.002, .172], [.029, .182]]
    .map(([x, y]) => [x, y, onFace(x, y) + .002]), .0038);

  // One fitted shell makes a continuous nape, sideburns and a swept fringe.
  const columns = 40, rows = 8, stride = columns + 1;
  const hair = new THREE.SphereGeometry(1, columns, rows);
  const scalp = hair.attributes.position;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const azimuth = col / columns * Math.PI * 2;
      const front = Math.sin(azimuth);
      const fringe = .10 * Math.sin(azimuth * 9 + .4) + .046 * Math.sin(azimuth * 15);
      const edge = 1.79 - .49 * front + Math.max(0, front) * fringe
        + .20 * Math.exp(-((front - .19) ** 2) / .016);
      const phi = row / rows * edge;
      scalp.setXYZ(row * stride + col, -Math.cos(azimuth) * Math.sin(phi) * .233,
        cy + .008 + Math.cos(phi) * .23, cz + Math.sin(azimuth) * Math.sin(phi) * .202);
    }
  }
  // SphereGeometry omits the final triangle of each cell at its south pole.
  // The cut hairline is an open ring, so it needs complete quads down to the edge.
  const hairIndices = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * stride + col, b = a + stride;
    if (row) hairIndices.push(a + 1, a, b + 1);
    hairIndices.push(a, b, b + 1);
  }
  hair.setIndex(hairIndices);
  hair.computeVertexNormals();
  add('Hair', hair);

  // A soft five-panel cap. Build the peaked bill and embroidery in cap space
  // so its slight sideways tilt is shared by every detail.
  const capParts = [];
  const capBase = .378, capHeight = .157;
  const dome = new THREE.SphereGeometry(1, 24, 8, 0, 2 * Math.PI, 0, Math.PI / 2);
  dome.scale(.242, capHeight, .221);
  capParts.push(['Cap', dome]);
  const band = new THREE.CylinderGeometry(1, .987, .032, 28);
  band.scale(.242, 1, .221).translate(0, -.015, 0);
  capParts.push(['Cap', band]);
  const bill = new THREE.SphereGeometry(1, 18, 8);
  bill.scale(.216, .014, .152).rotateX(.105).translate(0, -.020, .157);
  capParts.push(['Cap', bill]);
  for (const angle of [-2.45, -.9, .9, 2.45]) {
    const seam = Array.from({ length: 10 }, (_, i) => {
      const polar = i / 9 * Math.PI / 2;
      return new THREE.Vector3(.243 * Math.sin(angle) * Math.sin(polar),
        (capHeight + .001) * Math.cos(polar), .222 * Math.cos(angle) * Math.sin(polar));
    });
    capParts.push(['Stitch', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam), 8, .0018, 4, false)]);
  }
  const button = new THREE.SphereGeometry(1, 10, 6);
  capParts.push(['Cap', button.scale(.018, .010, .018).translate(0, capHeight, 0)]);
  // Two small cream stitches form a mountain badge above the brim.
  for (const [a, b] of [[[-.036, .025, .218], [-.008, .061, .206]],
                         [[-.008, .061, .206], [.024, .025, .220]]]) {
    const path = new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    capParts.push(['Cream', new THREE.TubeGeometry(path, 1, .005, 6, false)]);
  }
  for (const [color, geometry] of capParts) {
    add(color, geometry.rotateX(-.16).rotateZ(-.055).rotateY(-.18).translate(0, capBase, cz));
  }
  // One draw per material even though the portrait has many small details.
  for (const [name, geometries] of parts) {
    const geometry = mergeGeometries(geometries);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      name, color: colors[name], roughness: .88,
    }));
    mesh.name = name;
    portrait.add(mesh);
  }
  return portrait;
}
