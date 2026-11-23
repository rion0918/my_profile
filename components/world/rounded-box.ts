import { BoxGeometry, BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// All boxes with the same subdivision share corner normals and angular UVs.
// Sample Three's rounded shape once, retaining the indexed grid and its UV seams.
function createTemplate(segments: number) {
  const sides = segments * 2 + 1;
  const grid = new BoxGeometry(1, 1, 1, sides, sides, sides);
  const reference = new RoundedBoxGeometry(2, 2, 2, segments, .5);
  const index = grid.getIndex()!;
  const { normal, uv } = reference.attributes;
  for (let corner = 0; corner < index.count; corner++) {
    const i = index.getX(corner);
    grid.attributes.normal.setXYZ(i, normal.getX(corner), normal.getY(corner), normal.getZ(corner));
    grid.attributes.uv.setXY(i, uv.getX(corner), uv.getY(corner));
  }
  reference.dispose();
  return grid;
}

const templates = new Map<number, BoxGeometry>();
const referenceArcRatio = (Math.PI / 4) / (Math.PI / 4 + 1);
const resizeUv = (value: number, ratio: number) =>
  value < .5 ? value * ratio : 1 - (1 - value) * ratio;

export function createRoundedBox(width: number, height: number, depth: number, segments: number, radius: number) {
  let template = templates.get(segments);
  if (!template) {
    template = createTemplate(segments);
    templates.set(segments, template);
  }
  const box = new BufferGeometry().copy(template);
  const { position, normal, uv } = box.attributes;
  radius = Math.min(radius, width / 2, height / 2, depth / 2);
  const arc = Math.PI * radius / 2;
  const ratios = [width, height, depth].map(size => arc / (arc + size - 2 * radius) / referenceArcRatio);
  const verticesPerFace = position.count / 6;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i,
      Math.sign(position.getX(i)) * (width / 2 - radius) + normal.getX(i) * radius,
      Math.sign(position.getY(i)) * (height / 2 - radius) + normal.getY(i) * radius,
      Math.sign(position.getZ(i)) * (depth / 2 - radius) + normal.getZ(i) * radius,
    );
    const face = Math.floor(i / verticesPerFace);
    uv.setXY(i, resizeUv(uv.getX(i), ratios[face < 2 ? 2 : 0]),
      resizeUv(uv.getY(i), ratios[face === 2 || face === 3 ? 2 : 1]));
  }
  return box;
}
