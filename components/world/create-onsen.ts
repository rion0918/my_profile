import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { onsen, onsenBoundary, onsenBambooGroves, onsenRocks, onsenLanterns, isInsideBathhouse, isBathhouseApproach } from '../../lib/world-onsen.ts';

export function createOnsen(scene: THREE.Scene, applyVisibility: (material: THREE.MeshStandardMaterial) => void) {
  const root = new THREE.Group(); root.name = 'onsen'; root.position.set(onsen.x,0,onsen.z); scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const parts: THREE.Group[] = [], time = {value:0}, waterLight = {value:1};
  let seed=7629;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const local=(x:number,y:number,z:number)=>new THREE.Vector3(x-onsen.x,y,z-onsen.z);
  const part=(name:string)=>{const g=new THREE.Group();g.name='onsen-'+name;root.add(g);parts.push(g);return g;};
  const material=(color:number,roughness=.8,metalness=0)=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.add(m);applyVisibility(m);return m;
  };
  const timber=material(0x624837),cedar=material(0x9d7751),hinoki=material(0xd4b37c,.65),plaster=material(0xe2ddc8);
  const tile=material(0x455754,.62),tileEdge=material(0x60736a,.54),stone=material(0x8b9181,.86),darkStone=material(0x555e55,.77),moss=material(0x68834b);
  const brass=material(0xbba574,.32,.65),linen=material(0x416d67),gravel=material(0x97977c,.97);
  const lamp=material(0xffe5ac,.5);lamp.emissive.setHex(0xffc580);lamp.emissiveIntensity=.2;
  const mesh=(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=onsen.x,y=0,z=onsen.z)=>{
    geometries.add(g);const o=new THREE.Mesh(g,m);o.position.copy(local(x,y,z));o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;
  };
  const boxes=new Map<string,THREE.BufferGeometry>();
  const box=(p:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,r=.025)=>{
    const key=[w,h,d,r].join(',');if(!boxes.has(key))boxes.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/5,h/5,d/5)));
    return mesh(p,boxes.get(key)!,m,x,y,z);
  };
  const beamGeometry=new THREE.CylinderGeometry(1,1,1,10);
  const beam=(p:THREE.Object3D,a:number[],b:number[],radius:number,m:THREE.Material)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),o=mesh(p,beamGeometry,m);
    o.position.copy(start).add(end).multiplyScalar(.5).sub(new THREE.Vector3(onsen.x,0,onsen.z));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());o.scale.set(radius,start.distanceTo(end),radius);return o;
  };
  const tube=(p:THREE.Object3D,points:number[][],radius:number,m:THREE.Material)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x,y,z])=>local(x,y,z))),40,radius,6,false),m);
  const lathe=(p:THREE.Object3D,profile:number[][],m:THREE.Material,x:number,y:number,z:number)=>mesh(p,new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),80),m,x,y,z);
  const ring=(p:THREE.Object3D,x:number,y:number,z:number,r:number,t:number,m:THREE.Material)=>{const g=new THREE.TorusGeometry(r,t,r<.1?4:6,r<.1?12:72);g.rotateX(Math.PI/2);return mesh(p,g,m,x,y,z);};
  const instanced=(p:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,count:number)=>{
    geometries.add(g);const o=new THREE.InstancedMesh(g,m,count);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
  };
  const dummy=new THREE.Object3D();
  const relief=(size:number,wood=false)=>{
    const data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const noise=Math.sin(x*127.1+y*311.7)*43758.5453,grain=noise-Math.floor(noise);
      const v=wood?160+25*Math.sin(x*.6+Math.sin(y*.08)*1.5)+grain*16:170+grain*65-15*Math.sin(x*.08+y*.05);
      const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
    }
    const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.add(t);return t;
  };
  const granite=relief(128),wood=relief(128,true);wood.repeat.set(1,3);moss.bumpMap=granite;moss.bumpScale=.055;
  for(const m of [stone,darkStone,gravel]){m.bumpMap=granite;m.bumpScale=m===gravel?.035:.055;}
  for(const m of [hinoki,cedar,timber]){m.bumpMap=wood;m.bumpScale=.017;}
  const floor=part('garden'),rockwork=part('rockwork'),paths=part('paths'),entry=part('entry'),house=part('bathhouse'),roof=part('roof'),cutaway=part('cutaway');
  const potGroup=part('pot-baths'),falls=part('waterfall'),bamboo=part('bamboo'),ferns=part('ferns');
  const rockGeometries=Array.from({length:6},(_,k)=>{
    const g=new THREE.IcosahedronGeometry(1,3),p=g.getAttribute('position'),colors=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),noise=1+.09*Math.sin(x*8+k)*Math.cos(z*7+y*6);
      p.setXYZ(i,x*noise,y*(1+.08*Math.cos(z*9+x*5+k)),z*noise);
      const c=new THREE.Color().setRGB(.79+y*.13,.83+y*.14,.75+y*.11);colors.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.deleteAttribute('normal');const rounded=mergeVertices(g);g.dispose();rounded.computeVertexNormals();return rounded;
  });
  const rockMaterial=material(0x7f8a7a,.86);rockMaterial.vertexColors=true;rockMaterial.bumpMap=granite;rockMaterial.bumpScale=.055;
  const rock=(p:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,k=0)=>{
    const o=mesh(p,rockGeometries[Math.abs(k)%6],rockMaterial,x,y,z);o.scale.set(sx,sy,sz);o.rotation.y=k*.87;return o;
  };
  const groundShape=new THREE.Shape();onsenBoundary.forEach((p,i)=>{const x=p.x-onsen.x,z=p.z-onsen.z;if(!i)groundShape.moveTo(x,-z);else groundShape.lineTo(x,-z);});groundShape.closePath();
  const foundation=new THREE.ExtrudeGeometry(groundShape,{depth:.10,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1});foundation.rotateX(-Math.PI/2);mesh(floor,foundation,gravel,onsen.x,-.08,onsen.z);
  for(let i=0;i<onsenBoundary.length;i+=2){const p=onsenBoundary[i];rock(rockwork,p.x,.025,p.z,.26,.11,.19,i);}
  const pathMaterial=material(0xd3c7a4,.86);pathMaterial.bumpMap=granite;pathMaterial.bumpScale=.025;
  const path=(points:number[][],width:number)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>local(x,.065,z))),positions=[],uvs=[],indices=[];
    for(let i=0;i<=80;i++){
      const p=curve.getPoint(i/80),t=curve.getTangent(i/80),n=new THREE.Vector3(-t.z,0,t.x);
      for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*width/2);positions.push(q.x,q.y,q.z);uvs.push(side<0?0:1,i/8);}
      if(i<80){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();mesh(paths,g,pathMaterial);
    for(let i=0;i<=curve.getLength()/.7;i++){
      const t=i/Math.ceil(curve.getLength()/.7),p=curve.getPoint(Math.min(1,t)),v=curve.getTangent(Math.min(1,t));
      const seam=box(paths,p.x+onsen.x,.068,p.z+onsen.z,width*.96,.006,.018,darkStone,.002);seam.rotation.y=-Math.atan2(v.x,v.z);
    }
  };
  path([[-13.7,-19.4],[-14,-21.3],[-17,-22],[-21,-21.5],[-25,-21.8],[-28.3,-23]],1.15);
  path([[-16,-22],[-17.1,-24],[-18.4,-26.1],[-19.9,-27.2],[-19.9,-28.2]],1.5);
  path([[-16.8,-24.4],[-13,-25.8],[-11.5,-28.6],[-13.4,-31.8],[-15,-31.9]],1.15);
  const waterMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),time,waterLight,waterOpacity:{value:.68}},
    vertexShader:`varying vec3 bathPosition; varying vec2 bathUv; #include <fog_pars_vertex>
      void main(){bathUv=uv;bathPosition=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`varying vec3 bathPosition;varying vec2 bathUv;uniform float time;uniform float waterLight;uniform float waterOpacity;
      #include <fog_pars_fragment>
      void main(){vec2 p=bathPosition.xz;float wave=sin(p.x*5.+p.y*3.-time*.65)*sin(p.y*7.-time*.4);
      float ripple=pow(max(0.,sin(length(p-vec2(-27.7,-25.05))*15.-time*2.)),20.)*exp(-length(p-vec2(-27.7,-25.05))*.55);
      float caustic=pow(max(0.,sin(p.x*8.+p.y*4.+time*.3)*sin(p.y*9.-p.x*3.+time*.2)),8.);
      vec3 color=mix(vec3(.16,.39,.29),vec3(.43,.64,.48),.66+wave*.08)+vec3(.12,.16,.13)*ripple+vec3(.045)*caustic;
      gl_FragColor=vec4(color*waterLight,waterOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }`});materials.add(waterMaterial);
  // Preprocessor directives must begin on their own line in WebGL1 and WebGL2.
  waterMaterial.vertexShader=waterMaterial.vertexShader.replace(' #include','\n#include');
  const water=(p:THREE.Object3D,g:THREE.BufferGeometry,x:number,y:number,z:number)=>{g.rotateX(-Math.PI/2);const o=mesh(p,g,waterMaterial,x,y,z);o.castShadow=false;return o;};
  const outdoor=part('outdoor-bath'),pool=onsen.outdoorBath,poolShape=new THREE.Shape();
  const poolPoint=(a:number,offset=0)=>({x:Math.cos(a)*(pool.width/2-.32+offset)*(1+.025*Math.sin(a*5)),z:Math.sin(a)*(pool.depth/2-.26+offset)*(1+.035*Math.cos(a*3))});
  for(let i=0;i<=96;i++){const p=poolPoint(i/96*Math.PI*2);if(!i)poolShape.moveTo(p.x,-p.z);else poolShape.lineTo(p.x,-p.z);}poolShape.closePath();
  const basin=new THREE.ExtrudeGeometry(poolShape,{depth:.18,bevelEnabled:false});basin.rotateX(-Math.PI/2);mesh(outdoor,basin,darkStone,pool.x,.025,pool.z);
  water(outdoor,new THREE.ShapeGeometry(poolShape),pool.x,.27,pool.z);
  for(let i=0;i<54;i++){
    const a=i/54*Math.PI*2,p=poolPoint(a,.15),size=.33+random()*.12;
    rock(outdoor,pool.x+p.x,.21,pool.z+p.z,size*1.12,.22+random()*.08,size*.87,i);
    if(i%3===0)rock(outdoor,pool.x+p.x*.99,.08,pool.z+p.z*.96,size*.6,.08,size*.6,i+3);
  }
  const wetStone=material(0x657267,.48);wetStone.bumpMap=granite;wetStone.bumpScale=.025;
  for(let i=0;i<9;i++){const a=i/8*Math.PI;const p=poolPoint(a);rock(rockwork,pool.x+p.x*1.07,.07,pool.z+p.z*1.08,.22,.08,.16,i);}
  // The cascade is cut into a rock outcrop, with three different drops and a final spill into the foreground bath.
  for(let i=0;i<onsenRocks.length;i++){
    const p=onsenRocks[i];rock(falls,p.x,.55+(i%2)*.35,p.z,p.width*.6,.9+(i%3)*.3,p.depth*.62,i);
  }
  for(let i=0;i<12;i++){
    const t=i/11,x=-30.25+t*2.6,z=-27.5+t*1.8;
    rock(falls,x,.55+(1-t)*1.3,z,.58+random()*.24,.38+random()*.3,.45+random()*.3,i);
    if(i%2===0){const m=mesh(falls,new THREE.SphereGeometry(1,12,8),moss,x-.22,.84+(1-t)*1.25,z-.05);m.scale.set(.45,.09,.34);}
  }
  root.updateMatrixWorld(true);
  const rockFaces=falls.children.filter(o=>o instanceof THREE.Mesh),surfaceRay=new THREE.Raycaster(),forward=new THREE.Vector3(12,0,20).normalize();
  const flow=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time,waterLight},vertexShader:'varying vec2 flowUv;void main(){flowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 flowUv;uniform float time;uniform float waterLight;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){float coarse=noise(vec2(flowUv.x*19.,flowUv.y*14.-time*2.4));float fine=noise(vec2(flowUv.x*61.,flowUv.y*39.-time*5.));float rush=coarse*.65+fine*.35;
      float edge=smoothstep(0.,.08,flowUv.x)*smoothstep(1.,.92,flowUv.x);float foam=smoothstep(.2,.8,rush);
      gl_FragColor=vec4(mix(vec3(.49,.72,.64),vec3(.94,.98,.94),foam*.82)*waterLight,edge*(.48+foam*.38));}`});materials.add(flow);
  for(const points of [
    [[-29.9,2.5,-26.15],[-29.65,2.43,-25.98],[-29.35,1.55,-25.7]],
    [[-29.2,1.62,-25.65],[-28.9,1.57,-25.48],[-28.5,.77,-25.25]],
    [[-28.4,.85,-25.24],[-28.05,.8,-25.15],[-27.7,.28,-25.05]],
  ]){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>local(x,y,z))),positions=[],uvs=[],indices=[];
    for(let j=0;j<=28;j++){const p=curve.getPoint(j/28),width=.75+Math.sin(j*.31)*.045;
      for(let i=0;i<=8;i++){const t=i/8,q=new THREE.Vector3(p.x+(t-.5)*width,p.y+.014*Math.sin(i*2+j),p.z+.035*Math.sin(i*2+j*.3));
        const world=q.clone().add(root.position);surfaceRay.set(world.clone().addScaledVector(forward,8),forward.clone().negate());const hit=surfaceRay.intersectObjects(rockFaces,false)[0];
        if(hit&&hit.distance<8.03)q.copy(hit.point).addScaledVector(forward,.055).sub(root.position);
        positions.push(q.x,q.y,q.z);uvs.push(t,j/28);if(j<28&&i<8){const k=j*9+i;indices.push(k,k+1,k+9,k+1,k+10,k+9);}}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const sheet=mesh(falls,g,flow);sheet.castShadow=false;sheet.name='onsen-cascade';
  }
  const foam=new THREE.MeshBasicMaterial({color:0xe1eee0,transparent:true,opacity:.38,depthWrite:false});materials.add(foam);
  for(let i=0;i<4;i++)ring(falls,-27.7,.287+i*.001,-25.05,.18+i*.11,.014,foam).castShadow=false;
  const potColors=[0x537b6b,0x7b5d42,0x5c6f68];
  for(const [i,p] of onsen.potBaths.entries()){
    const pottery=new THREE.MeshPhysicalMaterial({color:potColors[i],roughness:.26,clearcoat:.8,clearcoatRoughness:.22,bumpMap:granite,bumpScale:.009,vertexColors:true});materials.add(pottery);applyVisibility(pottery);
    const r=p.radius;
    const vessel=lathe(potGroup,[[0,.05],[r*.6,.05],[r*.76,.1],[r*.94,.29],[r,.62],[r*.99,.77],[r*.96,.8],[r*.88,.8],[r*.86,.74],[r*.88,.6],[r*.78,.3],[r*.57,.17],[0,.17]],pottery,p.x,0,p.z);
    const v=vessel.geometry.getAttribute('position'),colors=[];
    for(let j=0;j<v.count;j++){const a=Math.atan2(v.getZ(j),v.getX(j)),y=v.getY(j),glaze=.84+.1*Math.sin(a*9+Math.sin(y*13))+.045*Math.cos(y*91+a*7);colors.push(glaze,glaze*.99,glaze*.94);}
    vessel.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    ring(potGroup,p.x,.11,p.z,r*.69,.018,darkStone);
    ring(potGroup,p.x,.79,p.z,r*.93,.025,darkStone);
    water(potGroup,new THREE.CircleGeometry(r*.865,80),p.x,.66,p.z);
    for(let j=0;j<13;j++){const a=j/13*Math.PI*2;rock(potGroup,p.x+Math.cos(a)*(r+.15),.055,p.z+Math.sin(a)*(r+.15),.15,.055,.12,j);}
    box(potGroup,p.x-.72,.13,p.z+.89,.55,.17,.35,wetStone,.06);
    box(potGroup,p.x,.88,p.z-.78,.18,.12,.38,hinoki);
    beam(potGroup,[p.x,.82,p.z-.59],[p.x,.67,p.z-.54],.022,brass);
  }
  const h=onsen.bathhouse,front=h.z+h.depth/2,back=h.z-h.depth/2,left=h.x-h.width/2,right=h.x+h.width/2;
  box(house,h.x,-.02,h.z,h.width,.12,h.depth,hinoki);
  for(let i=0;i<22;i++)box(house,left+.18+i*.36,.044,h.z,.012,.006,h.depth-.15,cedar,.001);
  box(house,h.x,1.42,back,h.width,2.75,.18,plaster);
  box(house,left,1.42,h.z,.18,2.75,h.depth,plaster);
  // Only the foreground upper walls lift with the roof; the physical doorway and columns stay readable.
  const upperWallBottom=.46,upperWallTop=2.795,upperWallCenter=(upperWallTop+upperWallBottom)/2,upperWallHeight=upperWallTop-upperWallBottom;
  box(cutaway,right,upperWallCenter,h.z,.16,upperWallHeight,h.depth,plaster);
  box(cutaway,-23.65,upperWallCenter,front,4.7,upperWallHeight,.16,plaster);
  box(cutaway,-18.35,upperWallCenter,front,.7,upperWallHeight,.16,plaster);
  box(house,right,.24,h.z,.16,.44,h.depth,cedar);
  box(house,-23.65,.24,front,4.7,.44,.16,plaster);
  box(house,-18.35,.24,front,.7,.44,.16,plaster);
  for(const x of [left,right])for(const z of [back,front])box(house,x,1.45,z,.18,2.9,.2,timber);
  for(const x of [-21.3,-18.7])box(house,x,1.45,front,.14,2.9,.2,timber);
  for(const y of [.22,2.72]){
    box(house,h.x,y,back,h.width+.1,.15,.22,timber);
    box(cutaway,h.x,y,front,h.width+.1,.15,.22,timber);
    for(const x of [left,right])box(x===right?cutaway:house,x,y,h.z,.2,.15,h.depth,timber);
  }
  const shoji=(p:THREE.Object3D,x:number,y:number,z:number,w:number,ht:number)=>{
    box(p,x,y,z,w,ht,.035,lamp,.008);
    for(let i=0;i<=8;i++)box(p,x-w/2+i*w/8,y,z+.027,.025,ht+.04,.035,timber,.004);
    for(let i=0;i<=4;i++)box(p,x,y-ht/2+i*ht/4,z+.035,w+.04,.025,.04,timber,.003);
  };
  shoji(cutaway,-23.6,1.65,front+.105,3.65,1.48);
  shoji(house,-23.2,1.73,back+.12,4.1,1.15);
  const entryRoof=new THREE.Group();roof.add(entryRoof);
  box(entry,-19.9,.015,front+.64,3.15,.06,1.35,wetStone,.05);
  for(const x of [-21.47,-18.33])box(entry,x,1.5,front+.68,.14,2.96,.16,timber);
  box(entry,-19.9,2.83,front+.68,3.38,.23,.24,timber);
  for(let i=0;i<6;i++)box(entry,-21.08+i*.47,2.18,front+.45,.435,.79,.025,linen,.008);
  const sign=(text:string,x:number,y:number,z:number,width:number,height:number,background:string,color:string)=>{
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const c=canvas.getContext('2d')!;
    c.fillStyle=background;c.fillRect(0,0,1536,256);c.fillStyle=color;c.font='500 150px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,768,140,1430);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;textures.add(t);
    const m=new THREE.MeshStandardMaterial({map:t,roughness:.7,emissive:0xffdfb5,emissiveMap:t,emissiveIntensity:.25});materials.add(m);applyVisibility(m);
    mesh(entry,new THREE.PlaneGeometry(width,height),m,x,y,z);
  };
  sign('内 湯',-19.9,2.23,front+.48,1.5,.36,'#416d67','#fff0d3');
  box(entry,-19.9,3.03,front+1.51,3.38,.36,.09,cedar);
  sign(onsen.name,-19.9,3.03,front+1.565,3.15,.34,'#77553a','#fff0d4');
  for(const x of [-21.1,-18.7]){
    box(entry,x,1.9,front+.73,.18,.52,.18,lamp);box(entry,x,2.18,front+.73,.25,.06,.25,timber);box(entry,x,1.61,front+.73,.25,.06,.25,timber);
  }
  const tiledRoof=(p:THREE.Group,x:number,z:number,width:number,depth:number,eave:number,rise:number)=>{
    const profile=(u:number)=>eave+rise*(1-u)+.13*u**4;
    for(const side of [-1,1]){
      const positions=[],indices=[];
      for(let i=0;i<=12;i++){
        const u=i/12;for(const end of [-1,1]){const q=local(x+end*width/2,profile(u),z+side*depth/2*u);positions.push(q.x,q.y,q.z);}
        if(i<12){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();tile.side=THREE.DoubleSide;mesh(p,g,tile);
      for(let lane=0;lane<=Math.ceil(width/.25);lane++){
        const xx=x-width/2+lane/Math.ceil(width/.25)*width,points=Array.from({length:10},(_,i)=>{const u=i/9;return[xx,profile(u)+.025,z+side*depth/2*u];});
        tube(p,points,.048,tileEdge);
        const cap=mesh(p,new THREE.CylinderGeometry(.071,.071,.11,12),tileEdge,xx,profile(1)+.015,z+side*depth/2);cap.rotation.x=Math.PI/2;
      }
      for(const u of [.3,.58,.86])beam(p,[x-width/2,profile(u)+.03,z+side*depth/2*u],[x+width/2,profile(u)+.03,z+side*depth/2*u],.018,tile);
      box(p,x,profile(1)-.14,z+side*depth/2,width+.12,.18,.16,timber);
      for(let i=0;i<18;i++)box(p,x-width/2+i/17*width,eave-.08,z+side*depth/2-.13*side,.07,.08,.35,cedar);
    }
    beam(p,[x-width/2-.12,eave+rise+.055,z],[x+width/2+.12,eave+rise+.055,z],.115,tileEdge);
  };
  tiledRoof(roof,h.x,h.z,h.width+1.2,h.depth+1.15,2.96,1.18);
  tiledRoof(entryRoof,-19.9,front+.7,3.65,1.45,3.08,.43);
  const gable=new THREE.Shape();gable.moveTo(-h.depth/2,0);gable.lineTo(0,1.15);gable.lineTo(h.depth/2,0);gable.closePath();
  for(const [x,side] of [[left-.12,-1],[right+.12,1]]){const panel=mesh(roof,new THREE.ShapeGeometry(gable),plaster,x,2.97,h.z);panel.rotation.y=side*Math.PI/2;}
  for(const z of [h.z-1.5,h.z,h.z+1.5])box(house,h.x,2.78,z,h.width,.1,.11,cedar);
  const indoor=onsen.indoorBath;
  box(house,indoor.x,.18,indoor.z,indoor.width,.28,indoor.depth,darkStone,.06);
  for(const z of [indoor.z-indoor.depth/2,indoor.z+indoor.depth/2])box(house,indoor.x,.39,z,indoor.width+.18,.29,.21,hinoki,.04);
  for(const x of [indoor.x-indoor.width/2,indoor.x+indoor.width/2])box(house,x,.39,indoor.z,.21,.29,indoor.depth,hinoki,.04);
  water(house,new THREE.PlaneGeometry(indoor.width-.22,indoor.depth-.22),indoor.x,.37,indoor.z);
  box(house,indoor.x,.65,back+.29,.68,.18,.47,hinoki);
  beam(house,[indoor.x,.59,back+.55],[indoor.x,.38,back+.61],.024,brass);
  for(const x of [-25.4,-22.6]){
    box(house,x,.28,-28,.48,.075,.43,hinoki);
    for(const dx of [-.17,.17])box(house,x+dx,.15,-28,.075,.25,.33,cedar);
    lathe(house,[[0,0],[.18,0],[.22,.05],[.245,.25],[.23,.27],[.21,.25],[.19,.05],[0,.04]],hinoki,x,.1,-27.65);
    for(const y of [.16,.3])ring(house,x,y,-27.65,.21,.009,brass);
    box(house,x,1.1,front-.16,.7,.8,.025,tileEdge);
    beam(house,[x,.5,front-.25],[x,.77,front-.25],.023,brass);beam(house,[x,.77,front-.25],[x,.77,front-.46],.023,brass);
  }
  const lantern=(x:number,z:number)=>{
    box(rockwork,x,.08,z,.47,.15,.45,darkStone,.05);box(rockwork,x,.32,z,.16,.43,.16,stone);box(rockwork,x,.65,z,.32,.31,.32,lamp);
    for(const dx of [-.15,.15])for(const dz of [-.15,.15])box(rockwork,x+dx,.65,z+dz,.035,.35,.035,darkStone,.005);
    const cap=mesh(rockwork,new THREE.ConeGeometry(.36,.19,4),darkStone,x,.9,z);cap.rotation.y=Math.PI/4;
  };
  onsenLanterns.forEach(p=>lantern(p.x,p.z));
  // Tapered culms, raised nodes, branching stems and folded, pointed leaves replace the old rock-shaped foliage.
  const culm=material(0x6f8c46,.47),node=material(0x9aaa68,.63),branch=material(0x647e40,.71);
  culm.bumpMap=wood;culm.bumpScale=.012;
  const leafMaterial=material(0x819367,.71);leafMaterial.side=THREE.DoubleSide;leafMaterial.vertexColors=true;
  const leafPositions=[],leafUvs=[],leafColors=[],leafIndices=[];
  for(let j=0;j<=8;j++){
    const t=j/8,w=.035*Math.sin(t*Math.PI)**.8;
    for(const side of [-1,0,1]){leafPositions.push(t*.46,-.14*t*t+(side===0?.022:0),side*w);leafUvs.push(t,(side+1)/2);const c=new THREE.Color().setHSL(.23+t*.025,.3,.3+t*.13+(side===0?.08:0));leafColors.push(c.r,c.g,c.b);}
    if(j<8){const k=j*3;leafIndices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
  }
  const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(leafPositions,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(leafUvs,2));leafGeometry.setAttribute('color',new THREE.Float32BufferAttribute(leafColors,3));leafGeometry.setIndex(leafIndices);leafGeometry.computeVertexNormals();
  const compile=leafMaterial.onBeforeCompile,key=leafMaterial.customProgramCacheKey();
  leafMaterial.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.bambooTime=time;shader.vertexShader='uniform float bambooTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=sin(bambooTime*.7+instanceMatrix[3].x*.8+instanceMatrix[3].z)*.025*uv.x*uv.x;');};leafMaterial.customProgramCacheKey=()=>key+'|bamboo-leaves';
  const leafMatrices:THREE.Matrix4[]=[];
  for(const [index,g] of onsenBambooGroves.entries())for(let stem=0;stem<5;stem++){
    const a=stem*2.4+index,x=g.x+Math.cos(a)*.29,z=g.z+Math.sin(a)*.29,height=2.7+random()*1.45,leanX=(random()-.5)*.27,leanZ=(random()-.5)*.23;
    const stalk=mesh(bamboo,new THREE.CylinderGeometry(.027,.05,height,10,9),culm,x+leanX/2,height/2,z+leanZ/2);stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(leanX,height,leanZ).normalize());
    for(let n=1;n<=9;n++){
      const t=n/10,xx=x+leanX*t,zz=z+leanZ*t,yy=height*t;
      ring(bamboo,xx,yy,zz,.05-.02*t,.007,node);
      if(n<6)continue;
      for(const side of [-1,1]){
        const angle=a+n*.7+side*1.3,length=.40+random()*.32,bx=xx+Math.cos(angle)*length,bz=zz+Math.sin(angle)*length,by=yy+.12;
        beam(bamboo,[xx,yy,zz],[bx,by,bz],.012,branch);
        for(let k=0;k<6;k++){
          const u=.25+k*.14,lx=xx+(bx-xx)*u,lz=zz+(bz-zz)*u,ly=yy+(by-yy)*u;
          dummy.position.copy(local(lx,ly,lz));dummy.rotation.set((random()-.5)*.8,-angle+(k%2?-.5:2.5),-.22+random()*.55);dummy.scale.setScalar(.65+random()*.55);dummy.updateMatrix();leafMatrices.push(dummy.matrix.clone());
        }
      }
    }
  }
  const leaves=instanced(bamboo,leafGeometry,leafMaterial,leafMatrices.length);leaves.castShadow=false;leafMatrices.forEach((m,i)=>leaves.setMatrixAt(i,m));
  const fernMaterial=material(0x527249,.87);fernMaterial.side=THREE.DoubleSide;fernMaterial.vertexColors=true;
  const fernPositions=[],fernColors=[],fernIndices=[];
  for(let i=0;i<9;i++){
    const t=(i+1)/10,length=.12*Math.sin(t*Math.PI)**.7,center=t*.55;
    for(const side of [-1,1]){
      const k=fernPositions.length/3;fernPositions.push(center,.18*Math.sin(t*2),0,center+.045,.18*Math.sin(t*2)+.012,side*length,center+.075,.18*Math.sin(t*2)-.015,side*length*.48);
      fernIndices.push(k,k+1,k+2);for(let n=0;n<3;n++)fernColors.push(.45+t*.12,.64+t*.13,.32+t*.09);
    }
  }
  const fernGeometry=new THREE.BufferGeometry();fernGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fernPositions,3));fernGeometry.setAttribute('color',new THREE.Float32BufferAttribute(fernColors,3));fernGeometry.setIndex(fernIndices);fernGeometry.computeVertexNormals();
  const fernSites=[[-28.7,-23.7],[-29.2,-24.4],[-29.8,-25],[-28.7,-28.7],[-27.3,-30.2],[-16.5,-27],[-16.7,-29.5],[-12,-28.3],[-12,-25.3],[-18,-32.2],[-30,-23.3]];
  const fronds=instanced(ferns,fernGeometry,fernMaterial,fernSites.length*9);fronds.castShadow=false;
  fernSites.forEach(([x,z],i)=>{for(let j=0;j<9;j++){dummy.position.copy(local(x,.06,z));dummy.rotation.set(0,j/9*Math.PI*2,-.15+random()*.2);dummy.scale.setScalar(.7+random()*.5);dummy.updateMatrix();fronds.setMatrixAt(i*9+j,dummy.matrix);}});
  for(let i=0;i<22;i++){
    const p=onsenBoundary[Math.floor(i/22*onsenBoundary.length)];if(p.z>-23)continue;
    const m=mesh(ferns,rockGeometries[i%6],moss,p.x+(onsen.x-p.x)*.1,.035,p.z+(onsen.z-p.z)*.06);m.scale.set(.6+random()*.4,.14+random()*.1,.4+random()*.3);
  }
  const steam=part('steam'),steamPositions=[],phases=[];
  const vaporSites=[{x:pool.x,z:pool.z,w:3.3,d:1.45},{x:indoor.x,z:indoor.z,w:2,d:.7},...onsen.potBaths.map(p=>({...p,w:.55,d:.55}))];
  for(const [index,b] of vaporSites.entries())for(let i=0;i<(index===0?24:7);i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random()),p=local(b.x+Math.cos(a)*r*b.w,index>1?.8:.4,b.z+Math.sin(a)*r*b.d);steamPositions.push(p.x,p.y,p.z);phases.push(random());
  }
  const steamGeometry=new THREE.BufferGeometry();steamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(steamPositions,3));steamGeometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));steamGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),20);geometries.add(steamGeometry);
  const steamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time},
    vertexShader:'attribute float phase;uniform float time;varying float opacity;void main(){float age=fract(time*.12+phase);vec3 p=position;p.y+=age*1.7;p.x+=sin(time*.4+phase*6.)*.15;opacity=sin(age*3.14159)*.13;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=32.+age*50.;}',
    fragmentShader:'varying float opacity;void main(){float d=length(gl_PointCoord-vec2(.5));gl_FragColor=vec4(1.,.99,.95,(1.-smoothstep(.05,.5,d))*opacity);}' });materials.add(steamMaterial);steam.add(new THREE.Points(steamGeometry,steamMaterial));
  // Keep architectural cutaways and animated surfaces separate; batch the remaining construction by material.
  for(const group of parts){
    const buckets=new Map<THREE.Material,THREE.Mesh[]>();group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert();
    group.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.InstancedMesh)&&!Array.isArray(o.material)&&!o.material.transparent){const a=buckets.get(o.material)??[];a.push(o);buckets.set(o.material,a);}});
    for(const [m,objects] of buckets){
      if(objects.length<2)continue;
      const geometriesToMerge=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});
      const merged=mergeGeometries(geometriesToMerge);geometriesToMerge.forEach(g=>g.dispose());if(merged){const indexed=mergeVertices(merged);merged.dispose();objects.forEach(o=>o.removeFromParent());mesh(group,indexed,m);}
    }
  }
  const live=new Set<THREE.BufferGeometry>(),instances:THREE.InstancedMesh[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh)live.add(o.geometry);if(o instanceof THREE.InstancedMesh)instances.push(o);if(o instanceof THREE.Points)live.add(o.geometry);});
  for(const g of geometries)if(!live.has(g)){g.dispose();geometries.delete(g);}
  let disposed=false;
  return {
    update(elapsed:number,position:{x:number;z:number},reduced:boolean){const reveal=isInsideBathhouse(position)||isBathhouseApproach(position);roof.visible=!reveal;cutaway.visible=!reveal;steam.visible=!reduced;time.value=reduced?0:elapsed;},
    updateTime(night:number){lamp.emissiveIntensity=.16+night*1.5;waterLight.value=1-night*.36;},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
