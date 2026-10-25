import { Color, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace, AdditiveBlending, PlaneGeometry, Mesh, Box2 } from 'three';
import type { BufferGeometry } from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export function createHallWordGeometry(word: string, font: Font, width: number, height: number) {
  const geometry = new TextGeometry(word, {
    font, size: 1, depth: 0.2, curveSegments: 6,
    bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const scale = Math.min(width / (bounds.max.x - bounds.min.x), height / (bounds.max.y - bounds.min.y));
  geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -bounds.min.z);
  geometry.scale(scale, scale, Math.max(scale, .5));
  // Draw all letter faces together, then all sides, instead of a draw per glyph.
  const faces: number[] = [], sides: number[] = [];
  for (const group of geometry.groups) {
    const indices = group.materialIndex === 0 ? faces : sides;
    for (let i = group.start; i < group.start + group.count; i++) indices.push(i);
  }
  geometry.setIndex([...faces, ...sides]);
  geometry.clearGroups();
  geometry.addGroup(0, faces.length, 0);
  geometry.addGroup(faces.length, sides.length, 1);
  return geometry;
}

export function createHallWordMaterials(face: number, edge: number) {
  return [face,edge].map((color,index)=>new MeshStandardMaterial({
    color, emissive:new Color(color).lerp(new Color(0xffffff),index===0?.55:.25),
    emissiveIntensity:index===0?1.35:.85, roughness:.4, toneMapped:false,
  }));
}

export function createHallWordGlow(word: string, font: Font, geometry: BufferGeometry, color: number) {
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox!, width=bounds.max.x-bounds.min.x, height=bounds.max.y-bounds.min.y, padding=.25;
  const shapes=font.generateShapes(word,1), raw=new Box2();
  const paths=shapes.flatMap(shape=>[shape,...shape.holes]).map(path=>path.getPoints(12));
  paths.forEach(path=>path.forEach(point=>raw.expandByPoint(point)));
  const canvas=document.createElement('canvas');
  canvas.width=768;canvas.height=Math.ceil(canvas.width*(height+padding*2)/(width+padding*2));
  const context=canvas.getContext('2d')!,glowColor=new Color(color).lerp(new Color(0xffffff),.25);
  context.shadowColor=glowColor.getStyle();context.shadowBlur=canvas.width/(width+padding*2)*.11;
  context.fillStyle=glowColor.getStyle();
  context.translate(canvas.width/2,canvas.height/2);
  context.scale(canvas.width/(width+padding*2)*width/(raw.max.x-raw.min.x),-canvas.height/(height+padding*2)*height/(raw.max.y-raw.min.y));
  context.translate(-(raw.min.x+raw.max.x)/2,-(raw.min.y+raw.max.y)/2);
  context.beginPath();
  for(const points of paths){
    context.moveTo(points[0].x,points[0].y);
    points.slice(1).forEach(point=>context.lineTo(point.x,point.y));context.closePath();
  }
  context.fill('evenodd');
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
  const material=new MeshBasicMaterial({map:texture,transparent:true,opacity:.7,blending:AdditiveBlending,depthWrite:false,toneMapped:false});
  const glow=new Mesh(new PlaneGeometry(width+padding*2,height+padding*2),material);
  glow.position.set((bounds.min.x+bounds.max.x)/2,(bounds.min.y+bounds.max.y)/2,bounds.min.z-.02);
  glow.name='hall-word-glow';
  return glow;
}
