import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { cats, groundBirds, getBirdFlight } from "../../lib/world-wildlife.ts";
import { getWalkingHeight } from "../../lib/world-navigation.ts";

export function createWildlife(scene: THREE.Scene, shadowTexture: THREE.Texture) {
  const root = new THREE.Group(); root.name = "wildlife"; scene.add(root);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Map<number, THREE.MeshStandardMaterial>();
  const sphere = new THREE.SphereGeometry(1, 16, 12), cone = new THREE.ConeGeometry(1, 1, 3), rod = new THREE.CylinderGeometry(1,1,1,6);
  [sphere,cone,rod].forEach(g=>geometries.add(g));
  const mat = (color: number) => {
    if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));
    return materials.get(color)!;
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: number, position: number[], scale = [1,1,1]) => {
    geometries.add(geometry);
    const m = new THREE.Mesh(geometry,mat(color)); m.position.set(...position as [number,number,number]);
    m.scale.set(...scale as [number,number,number]); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  };
  const oval = (parent: THREE.Object3D, color: number, position: number[], scale: number[]) => mesh(parent,sphere,color,position,scale);
  const beam = (parent: THREE.Object3D, color: number, a: number[], b: number[], radius: number) => {
    const from=new THREE.Vector3(...a), to=new THREE.Vector3(...b), m=mesh(parent,rod,color,[0,0,0]);
    m.position.copy(from).add(to).multiplyScalar(.5);m.scale.set(radius,from.distanceTo(to),radius);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return m;
  };
  // Bake each articulated part by material; ears, paws and faces do not each add a draw call.
  const batch = (group: THREE.Group) => {
    group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map<THREE.Material,THREE.Mesh[]>();
    group.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const list=buckets.get(o.material)??[];list.push(o);buckets.set(o.material,list);}});
    for(const [material,objects]of buckets) {
      if(objects.length<2)continue;
      const parts=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});
      const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
      if(merged){geometries.add(merged);objects.forEach(o=>o.removeFromParent());const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}
    }
  };
  const shadowMaterial = new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.7});
  const shadowGeometry = new THREE.PlaneGeometry(1,1);geometries.add(shadowGeometry);
  const shadow = (parent: THREE.Group, size: number) => {
    const m=new THREE.Mesh(shadowGeometry,shadowMaterial);m.rotation.x=-Math.PI/2;m.position.y=.012;m.scale.set(size,size*.8,1);parent.add(m);
  };
  const coats = {
    ginger:[0xd59254,0xffe9ca,0x93603f], tuxedo:[0x414550,0xffefd8,0x414550],
    calico:[0xffefd8,0xffefd8,0xc77e48], silver:[0xa4aab0,0xf3eadc,0x626c7d], cream:[0xe4c6a1,0xffeed8,0xb49b7a],
  };
  const catModels = cats.map((data,index)=>{
    const group=new THREE.Group();group.name=`cat-${index}`;root.add(group);
    group.position.set(data.x,getWalkingHeight(data)+.025,data.z);group.rotation.y=data.rotation;
    group.userData.cat=index;
    const body=new THREE.Group(),head=new THREE.Group(),eyes=new THREE.Group(),tail=new THREE.Group(),paw=new THREE.Group();
    body.name="body";head.name="head";tail.name="tail";paw.name="grooming-paw";
    group.add(body,head,tail,paw);const [fur,white,stripe]=coats[data.coat],sleeping=data.pose==='sleep';
    oval(body,fur,[0,sleeping?.2:.32,-.07],sleeping?[.26,.18,.37]:[.21,.3,.26]);
    oval(body,white,[0,sleeping?.2:.36,.12],sleeping?[.21,.13,.21]:[.155,.23,.12]);
    for(const side of [-1,1]) {
      oval(body,fur,[side*.15,.12,-.17],[.12,.115,.18]);
      oval(body,white,[side*.14,.055,sleeping?.15:-.1],[.105,.055,.135]);
      if(!sleeping && !(side===1&&data.pose==='groom')) {
        oval(body,fur,[side*.105,.22,.17],[.055,.19,.06]);
        oval(body,white,[side*.105,.052,.23],[.074,.05,.10]);
      }
      if(data.coat==='ginger'||data.coat==='silver')for(let i=0;i<3;i++)
        oval(body,stripe,[side*.197,.36+i*.055,-.13+i*.075],[.018,.024,.10]).rotation.z=side*-.25;
    }
    if(data.coat==='calico') {
      oval(body,stripe,[-.18,.38,-.12],[.075,.16,.14]);
      oval(body,0x414550,[.16,.3,-.23],[.08,.13,.13]);
    }
    head.position.set(0,sleeping?.31:.64,sleeping?.27:.18);
    oval(head,fur,[0,0,0],[.21,.185,.18]);
    oval(head,white,[-.069,-.067,.146],[.085,.065,.065]);
    oval(head,white,[.069,-.067,.146],[.085,.065,.065]);
    oval(head,white,[0,-.12,.03],[.13,.06,.12]);
    if(data.coat==='tuxedo')oval(head,white,[0,-.015,.162],[.045,.11,.03]);
    if(data.coat==='calico')oval(head,stripe,[-.11,.025,.08],[.10,.13,.115]);
    const ears: THREE.Group[]=[];
    for(const side of [-1,1]) {
      const ear=new THREE.Group();ear.position.set(side*.137,.14,-.005);ear.rotation.z=-side*.22;head.add(ear);ears.push(ear);
      mesh(ear,cone,fur,[0,.07,0],[.105,.20,.08]);
      mesh(ear,cone,0xdfaaa3,[0,.071,.034],[.064,.135,.023]);batch(ear);
    }
    if(data.coat==='ginger'||data.coat==='silver')for(const x of [-.05,0,.05])
      oval(head,stripe,[x,.10,.137],[.013,.055,.016]).rotation.z=-x*3;
    head.add(eyes);eyes.name="eyes";
    for(const side of [-1,1]) {
      oval(eyes,0x34413e,[side*.09,.015,.164],[.052,.041,.021]);
      oval(eyes,data.coat==='tuxedo'?0xd5b65b:0xb6c490,[side*.09,.017,.181],[.038,.029,.009]);
      oval(eyes,0x262e33,[side*.09,.017,.19],[.011,.026,.006]);
      oval(eyes,0xfff5df,[side*.08,.028,.195],[.009,.009,.004]);
      for(const j of [-1,0,1])beam(head,0xf7edda,[side*.07,-.067,.20],[side*(.25+Math.abs(j)*.015),-.055+j*.035,.18],.003);
    }
    const nose=mesh(head,cone,0xc78584,[0,-.045,.204],[.034,.035,.025]);nose.rotation.z=Math.PI;
    beam(head,0x745c59,[0,-.057,.205],[0,-.09,.205],.004);
    for(const side of [-1,1])beam(head,0x745c59,[0,-.09,.205],[side*.025,-.10,.195],.003);
    // Keep blinkable eyes and twitchable ears separate from the static face.
    head.remove(eyes,...ears);batch(head);head.add(eyes,...ears);batch(eyes);batch(body);
    tail.position.set(0,.16,-.28);
    const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.06,.02,-.24),new THREE.Vector3(.34,.09,-.33),new THREE.Vector3(.43,.26,-.17),new THREE.Vector3(.34,.36,-.06)]);
    const tailGeo=new THREE.TubeGeometry(tailCurve,28,.052,8,false);
    mesh(tail,tailGeo,fur,[0,0,0]);
    for(let i=0;i<3;i++){const p=tailCurve.getPoint(.65+i*.12);oval(tail,stripe,p.toArray(),[.055,.055,.055]);}batch(tail);
    paw.position.set(.105,.43,.18);paw.visible=data.pose==='groom';
    oval(paw,fur,[0,-.12,0],[.054,.15,.058]);oval(paw,white,[0,-.24,.04],[.072,.06,.09]);batch(paw);
    shadow(group,1.05);
    return {group,body,head,eyes,tail,paw,ears,data};
  });
  const heartShape=new THREE.Shape();
  heartShape.moveTo(0,-.13);heartShape.bezierCurveTo(-.04,-.07,-.19,.02,-.13,.11);
  heartShape.bezierCurveTo(-.08,.18,-.015,.12,0,.08);heartShape.bezierCurveTo(.015,.12,.08,.18,.13,.11);
  heartShape.bezierCurveTo(.19,.02,.04,-.07,0,-.13);
  const heartGeometry=new THREE.ExtrudeGeometry(heartShape,{depth:.025,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:1,curveSegments:12});geometries.add(heartGeometry);
  const hearts=catModels.map(({data},i)=>{
    const group=new THREE.Group();group.name=`cat-hearts-${i}`;root.add(group);group.position.set(data.x,getWalkingHeight(data)+1.15,data.z);group.rotation.y=Math.atan2(12,20);group.visible=false;
    for(let j=0;j<3;j++){const heart=mesh(group,heartGeometry,j===1?0xf3c57a:0xe99c94,[(j-1)*.3,j===1?.15:0,0]);heart.castShadow=false;heart.receiveShadow=false;}
    return group;
  });

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0,.12);wingShape.bezierCurveTo(.24,.14,.52,.03,.72,-.15);
  wingShape.lineTo(.55,-.14);wingShape.lineTo(.61,-.23);wingShape.lineTo(.43,-.19);
  wingShape.lineTo(.46,-.28);wingShape.lineTo(.29,-.23);wingShape.lineTo(.27,-.30);
  wingShape.quadraticCurveTo(.08,-.21,0,-.16);wingShape.closePath();
  const wingGeometry=new THREE.ExtrudeGeometry(wingShape,{depth:.025,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:1,steps:1,curveSegments:8});
  wingGeometry.rotateX(Math.PI/2);geometries.add(wingGeometry);
  const birdModel = (gull: boolean, flying: boolean) => {
    const group=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group(),wings: THREE.Group[]=[];
    group.add(body,head);const feather=gull?0xf7efdf:0x9f7d5c,back=gull?0xa3b0bf:0x6f5c50;
    oval(body,feather,[0,.2,0],[.13,.16,.23]);oval(body,gull?0xe8e5d6:0xe1c8a7,[0,.21,.14],[.105,.13,.10]);
    const tail=mesh(body,cone,back,[0,.20,-.24],[.13,.26,.045]);tail.rotation.x=-Math.PI/2;
    head.position.set(0,.34,.14);oval(head,feather,[0,0,0],[.12,.115,.12]);
    if(!gull)oval(head,back,[0,.065,-.01],[.12,.065,.105]);
    for(const side of [-1,1]) {
      oval(head,0x303b41,[side*.09,.015,.065],[.019,.024,.018]);
      oval(head,0xffefd8,[side*.099,.024,.073],[.006,.007,.006]);
      if(!flying){beam(body,0xb58a63,[side*.06,.12,0],[side*.06,.025,.03],.012);for(const offset of [-.03,0,.03])beam(body,0xb58a63,[side*.06,.025,.03],[side*.06+offset,.018,.10],.008);}
      const wing=new THREE.Group();wing.position.set(side*.09,.24,-.015);wing.scale.x=side;group.add(wing);wings.push(wing);
      mesh(wing,wingGeometry,back,[0,0,0]);
      if(!flying){wing.rotation.y=side*1.12;wing.rotation.z=-side*1.05;wing.scale.multiplyScalar(.47);}
      batch(wing);
    }
    const beak=mesh(head,cone,gull?0xe8b45c:0xb79569,[0,-.025,.15],[.032,gull?.12:.07,.03]);beak.rotation.x=Math.PI/2;
    batch(body);batch(head);if(!gull)group.scale.setScalar(.85);
    return {group,head,wings};
  };
  const resting = groundBirds.map((data,index)=>{
    const model=birdModel(data.kind==='gull',false);model.group.name=`resting-bird-${index}`;
    root.add(model.group);model.group.position.set(data.x,getWalkingHeight(data)+.025,data.z);model.group.rotation.y=data.rotation;shadow(model.group,.6);return {...model,data};
  });
  const flying = Array.from({length:6},(_,index)=>{
    const model=birdModel(true,true),flock=Math.floor(index/3),member=index%3;
    model.group.name=`flying-bird-${flock}-${member}`;root.add(model.group);model.group.visible=false;return {...model,flock,member};
  });
  let started: number | null=null;
  let elapsed=0,petting:{index:number;time:number}|null=null;
  return {
    selectable:catModels.map(cat=>cat.group),
    pet(index:number){petting={index,time:elapsed};return catModels[index].head.getWorldPosition(new THREE.Vector3());},
    update(time: number,reduced: boolean) {
      started??=time;elapsed=time-started;const t=reduced?0:elapsed;
      catModels.forEach(({body,head,eyes,tail,paw,ears,data},i)=>{
        const phase=t*.7+i*1.9,sleeping=data.pose==='sleep';
        body.scale.y=1+(reduced?0:Math.sin(phase*1.4)*.016);
        head.rotation.set(data.pose==='groom'&&!reduced?Math.sin(t*2.8+i)*.10+.2:sleeping?.13:0,reduced?0:Math.sin(phase*.55)*.16,0);
        eyes.scale.y=sleeping?.12:reduced?1:1-Math.exp(-Math.pow(((t+i*1.3)%5.7-5.4)/.095,2))*.94;
        tail.rotation.z=reduced?0:Math.sin(phase)*.16;tail.rotation.y=reduced?0:Math.sin(phase*.6)*.12;
        paw.rotation.x=data.pose==='groom'?-(reduced?1.8:1.9+Math.sin(t*2.8+i)*.18):0;
        ears.forEach((ear,j)=>{ear.rotation.x=reduced?0:Math.sin(phase+j)*.04;});
        const age=petting?.index===i?elapsed-petting.time:Infinity;
        const affection=age>=0&&age<1.6?Math.sin(age/1.6*Math.PI):0;
        if(affection>0){
          eyes.scale.y=Math.min(eyes.scale.y,1-affection*.9);
          head.rotation.z=affection*.14;
          if(!reduced)tail.rotation.z+=Math.sin(t*8)*affection*.2;
        }
        hearts[i].visible=!reduced&&affection>0;
        if(hearts[i].visible){hearts[i].position.y=getWalkingHeight(data)+1.1+age*.42;hearts[i].scale.setScalar(Math.sin(age/1.6*Math.PI)*.85+.15);}
      });
      resting.forEach(({head,group,data},i)=>{
        const peck=reduced?0:Math.max(0,Math.sin(t*1.8+i*2))**12;
        head.rotation.x=peck*.85;head.rotation.y=reduced?0:Math.sin(t*.7+i)*.28;
        group.rotation.y=data.rotation+(reduced?0:Math.sin(t*.25+i)*.15);
      });
      flying.forEach(({group,wings,flock,member})=>{
        const flight=getBirdFlight(elapsed,flock,member);group.visible=!reduced&&flight.visible;
        if(!group.visible)return;
        group.position.set(flight.x,flight.y,flight.z);group.rotation.set(0,flight.heading,flight.bank);
        const glide=Math.sin(elapsed*.55+member)>.45;
        wings.forEach((wing,j)=>{wing.rotation.z=(j===0?-1:1)*(glide?.12:Math.sin(elapsed*6.5+member*.9)*.62);});
      });
    },
    dispose() {root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());shadowMaterial.dispose();},
  };
}
