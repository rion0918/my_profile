import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { createHallWordGeometry, createHallWordMaterials } from './create-hall-word.ts';
import { pastaKitchen } from '../../lib/world-pasta.ts';

export function createPastaKitchen(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) => void, font: Font) {
  const root = new THREE.Group(); root.name = 'pasta-kitchen'; root.position.set(pastaKitchen.x, 0, pastaKitchen.z); scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
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
  const pasta = [physical(0xe8c783, .29, .7), physical(0xf0d291, .3, .7), physical(0xdcb572, .34, .6)];
  const sauce = physical(0xe9c47b, .2, .9), pepper = standard(0x3a2d24, .82), eggshell = standard(0xe9d8b4, .62);
  const yolk = physical(0xeea931, .2, .85), linen = standard(0xe4e5d5, .9), olive = physical(0x405d3b, .24, .7);
  const light = new THREE.MeshBasicMaterial({ color: 0xffdfa3, toneMapped: false }); materials.add(light); applyVisibility(light);
  const grain = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4, value = 215 + random() * 35 - (random() > .97 ? 50 : 0);
    grain[i] = grain[i + 1] = grain[i + 2] = value; grain[i + 3] = 255;
  }
  const stoneTexture = new THREE.DataTexture(grain, 64, 64); stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping; stoneTexture.repeat.set(5, 5); stoneTexture.needsUpdate = true;
  textures.add(stoneTexture); stone.map = stoneTexture;
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
  lathe(plate, [[0,.18],[.8,.18],[1.2,.22],[1.5,.29],[1.8,.42],[2.15,.55],[2.43,.59],[2.5,.57],[2.52,.52],[2.47,.47],[2.15,.45],[1.78,.32],[1.42,.14],[1.1,.065],[.8,.045],[0,.045]].reverse(), ceramic);
  ring(plate, 0, .575, 0, 2.435, .012, rim); ring(plate, 0, .065, 0, 1.05, .04, ceramic);
  sphere(plate, 0, .27, 0, 1, sauce, 1.62, .055, 1.4);
  const noodles = part('noodles', plate), samples: {p:THREE.Vector3;layer:number}[] = [];
  for (let strand = 0; strand < 96; strand++) {
    const layer = Math.floor(strand / 12), phase = random() * Math.PI * 2, turns = .7 + random() * .9;
    const radial = 1.4 - layer * .105 + random() * .24, points: THREE.Vector3[] = [];
    for (let j = 0; j <= 32; j++) {
      const t = j / 32, a = phase + t * Math.PI * 2 * turns;
      const r = radial + .18 * Math.sin(a * 2.3 + phase) + .09 * Math.sin(a * 5 + strand);
      const x = Math.cos(a) * r, z = Math.sin(a) * r * (.83 + .08 * Math.sin(phase));
      const y = .22 + .25 * (r / 1.7) ** 2 + layer * .072 + .035 * Math.sin(a * 3 + phase) ** 2;
      const point = new THREE.Vector3(x, y, z); points.push(point); if (j > 1 && j < 31) samples.push({p:point,layer});
    }
    tube(noodles, points, .033 + random() * .008, pasta[strand % 3], 72);
  }
  for (let i = 0; i < 4; i++) {
    const a = -.7 + i * 1.4, points = [];
    for (let j = 0; j < 28; j++) { const t = j / 27, r = 1.7 + Math.sin(t * Math.PI) * .28, angle = a + t * 1.3; points.push(new THREE.Vector3(Math.cos(angle) * r, .47 + .06 * Math.sin(t * Math.PI), Math.sin(angle) * r * .86)); }
    tube(noodles, points, .034, pasta[i % 3]);
  }
  for (let i = 0; i < 22; i++) {
    const angle = random() * Math.PI * 2, phase = random() * Math.PI * 2, length = .65 + random() * .5, points = [];
    for (let j = 0; j <= 32; j++) {
      const t = j / 32, u = (t * 2 - 1) * length, v = .15 * Math.sin(t * Math.PI * 4 + phase) + .08 * Math.sin(t * Math.PI * 7 + i);
      const point = new THREE.Vector3(u * Math.cos(angle) - v * Math.sin(angle), .73 + .13 * Math.sin(t * Math.PI) + .025 * Math.sin(t * 10 + phase), u * Math.sin(angle) + v * Math.cos(angle));
      points.push(point); samples.push({p:point,layer:8});
    }
    tube(noodles, points, .034 + random() * .006, pasta[i % 3], 64);
  }
  const guanciale = part('guanciale', plate), baconGeometry = new RoundedBoxGeometry(.15, .09, .11, 2, .018);
  const bacon = instances(guanciale, baconGeometry, crust, 68), streaks = instances(guanciale, new THREE.BoxGeometry(.145, .026, .108), fat, 68);
  for (let i = 0; i < 68; i++) {
    const sample = samples[Math.floor(random() * samples.length)]; dummy.position.copy(sample.p).add(new THREE.Vector3(0, .065, 0)); dummy.rotation.set(random() * .3, random() * Math.PI, random() * .3); dummy.scale.set(.7 + random(), .7 + random() * .6, .7 + random()); dummy.updateMatrix(); bacon.setMatrixAt(i, dummy.matrix);
    dummy.position.y += .026; dummy.updateMatrix(); streaks.setMatrixAt(i, dummy.matrix); bacon.setColorAt(i, new THREE.Color().setHSL(.045 + random() * .025, .43 + random() * .2, .29 + random() * .12));
  }
  const pepperPart = part('pepper', plate), pepperBits = instances(pepperPart, new THREE.DodecahedronGeometry(.016, 0), pepper, 700);
  const cheesePart = part('cheese', plate), shavings = instances(cheesePart, new THREE.BoxGeometry(.028,.012,.074), cheese, 520);
  for (const [value,count,lift] of [[pepperBits,700,.044],[shavings,520,.051]] as const) for (let i = 0; i < count; i++) {
    const point = samples[Math.floor(random() * samples.length)].p; dummy.position.copy(point); dummy.position.y += lift; dummy.rotation.set(random() * .6, random() * Math.PI, random() * .5); dummy.scale.setScalar(.5 + random() * 1.1); dummy.updateMatrix(); value.setMatrixAt(i,dummy.matrix);
  }
  const fork = part('fork'); fork.position.set(.3, 2.14, .9); fork.rotation.set(0, -.12, -.42);
  box(fork, 0, 1.49, 0, .145, 1.53, .09, steel, .035);
  sphere(fork, 0, 2.25, 0, .08, steel, 1, 1.1, .58);
  box(fork, 0, .73, 0, .74, .3, .085, steel, .055);
  for (const x of [-.285, -.095, .095, .285]) tube(fork, [new THREE.Vector3(x,.66,0),new THREE.Vector3(x,.39,.025),new THREE.Vector3(x,.06,.085)], .032, steel, 24);
  for (let i = 0; i < 8; i++) {
    const points = []; for (let j = 0; j <= 55; j++) { const t = j / 55, a = i * .84 + t * Math.PI * 2 * 2.3, r = .22 + .028 * Math.sin(a * 3); points.push(new THREE.Vector3(Math.cos(a)*r,.25+t*.67,Math.sin(a)*r)); }
    tube(fork, points, .031, pasta[i % 3], 72);
  }
  tube(root,[new THREE.Vector3(.45,2.6,1.05),new THREE.Vector3(.69,2.24,1.21),new THREE.Vector3(.51,1.96,1.13),new THREE.Vector3(.3,1.86,1.0)], .034, pasta[0]);

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
  }

  const steamMaterial = new THREE.ShaderMaterial({ transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{opacity:{value:.1}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float opacity; varying vec2 vUv; void main(){float a=sin(vUv.x*3.14159)*pow(1.-vUv.y,1.5)*opacity;gl_FragColor=vec4(1.,.97,.9,a);}' });materials.add(steamMaterial);
  const steams:THREE.Mesh[]=[];
  for(let i=0;i<3;i++){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    for(let j=0;j<=20;j++){const t=j/20,x=Math.sin(t*8+i)*.1;for(const side of [-1,1]){positions.push(x+side*(.035+.07*t),t*.9,Math.sin(t*4+i)*.03);uvs.push(side===-1?0:1,t);}if(j<20){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
    const vapor=mesh(root,g,steamMaterial,-.8+i*.45,2.12,.65+i*.17);vapor.name='pasta-steam';vapor.castShadow=false;steams.push(vapor);
  }
  const lamp=new THREE.PointLight(0xffe4af,18,11,2);lamp.position.set(-.3,4.1,1.7);lamp.castShadow=false;root.add(lamp);
  root.updateMatrixWorld(true);
  for(const group of groups){
    const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const object of [...group.children]){
      if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material)||object.material.transparent)continue;
      object.updateMatrix();const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();g.applyMatrix4(object.matrix);
      const items=buckets.get(object.material)??[];items.push(g);buckets.set(object.material,items);object.removeFromParent();
    }
    for(const [material,parts] of buckets){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(merged)mesh(group,merged,material);}
  }
  const instanced:THREE.InstancedMesh[]=[];root.traverse(o=>{if(o instanceof THREE.InstancedMesh)instanced.push(o);});
  return {
    update(time:number,reduced:boolean){steams.forEach((s,i)=>{s.visible=!reduced;s.position.y=2.12+((time*.18+i/3)%1)*.35;});lamp.visible=!reduced;},
    updateTime(night:number){lamp.intensity=2+night*14;},
    dispose(){root.removeFromParent();instanced.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
