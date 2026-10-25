import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { products } from '../../lib/products';
import { projectExhibits } from '../../lib/world-layout';
import { getWalkingHeight } from '../../lib/world-navigation';

export function createProjectExhibits(scene:THREE.Scene,applyVisibility:(material:THREE.MeshStandardMaterial|THREE.MeshBasicMaterial)=>void,onTextureReady:()=>void) {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const groups:THREE.Group[]=[],loader=new THREE.TextureLoader();let disposed=false;
  const mat=(color:number)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65});materials.add(m);applyVisibility(m);return m;};
  const mesh=(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number)=>{
    geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  };
  const box=(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>mesh(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(.07,w/4,h/4,d/4)),m,x,y,z);
  const cream=mat(0xffe8c8),teal=mat(0x4f9995),ink=mat(0x334f56),coral=mat(0xe89f8b),gold=mat(0xe6bf7e);
  const installations=projectExhibits.map(data=>{
    const product=products.find(p=>p.slug===data.id)!,group=new THREE.Group();groups.push(group);scene.add(group);
    group.name=`product-exhibit-${data.id}`;group.userData.detail=data.id;group.position.set(data.x,getWalkingHeight(data),data.z);group.rotation.y=data.rotation;group.scale.setScalar(data.scale);
    const placeholder=document.createElement('canvas');placeholder.width=390;placeholder.height=844;
    const context=placeholder.getContext('2d')!;context.fillStyle=data.id==='yoin'?'#142d39':'#e6eee7';context.fillRect(0,0,390,844);
    context.fillStyle=data.id==='yoin'?'#fff0cf':'#3e7772';context.textAlign='center';context.font='600 34px sans-serif';context.fillText(product.name,195,400);
    context.font='18px sans-serif';context.fillText('アプリの画面を見る',195,446);
    const poster=new THREE.CanvasTexture(placeholder);poster.colorSpace=THREE.SRGBColorSpace;textures.add(poster);
    const screenMaterial=new THREE.MeshBasicMaterial({map:poster,toneMapped:false});materials.add(screenMaterial);applyVisibility(screenMaterial);
    const h=data.id==='yoin'?2.38:2.47;
    mesh(group,new THREE.CylinderGeometry(.96,1.05,.18,40),cream,0,.09,0);
    mesh(group,new THREE.CylinderGeometry(.88,.88,.055,40),data.id==='yoin'?teal:coral,0,.20,0);
    box(group,teal,0,.48,-.06,.18,.6,.18);
    box(group,data.id==='yoin'?ink:cream,0,.8+h/2,0,1.3,h+.18,.14);
    const screen=mesh(group,new THREE.PlaneGeometry(1.12,h),screenMaterial,0,.8+h/2,.078);screen.castShadow=false;screen.name='product-screen-front';
    const backScreen=mesh(group,new THREE.PlaneGeometry(1.12,h),screenMaterial,0,.8+h/2,-.078);backScreen.rotation.y=Math.PI;backScreen.castShadow=false;backScreen.name='product-screen-back';
    box(group,gold,0,.8+h+.05,.01,.20,.025,.02);
    const plaque=document.createElement('canvas');plaque.width=640;plaque.height=128;const p=plaque.getContext('2d')!;
    p.fillStyle='#fff2dc';p.fillRect(0,0,640,128);p.fillStyle='#365e58';p.textAlign='center';p.font='700 38px sans-serif';p.fillText(product.name,320,55);p.font='22px sans-serif';p.fillText('作品を読む ↗',320,100);
    const labelTexture=new THREE.CanvasTexture(plaque);labelTexture.colorSpace=THREE.SRGBColorSpace;textures.add(labelTexture);
    const labelMaterial=new THREE.MeshBasicMaterial({map:labelTexture,toneMapped:false});materials.add(labelMaterial);applyVisibility(labelMaterial);
    box(group,cream,0,.44,.34,1.52,.36,.10);
    mesh(group,new THREE.PlaneGeometry(1.45,.29),labelMaterial,0,.44,.396).castShadow=false;
    const ornaments:THREE.Object3D[]=[];
    if(data.id==='yoin'){
      const disc=new THREE.Group();disc.position.set(-.94,1.45,0);group.add(disc);ornaments.push(disc);
      mesh(disc,new THREE.CylinderGeometry(.40,.40,.045,48),ink,0,0,0).rotation.x=Math.PI/2;
      for(const radius of [.22,.30,.36])mesh(disc,new THREE.TorusGeometry(radius,.004,4,48),teal,0,0,.03);
      mesh(disc,new THREE.CylinderGeometry(.11,.11,.05,32),coral,0,0,.01).rotation.x=Math.PI/2;
      mesh(disc,new THREE.SphereGeometry(.025,8,6),gold,0,0,.05);
      box(group,gold,-.96,1.03,-.03,.035,.8,.035);
    }else{
      const bubbleMaterial=new THREE.MeshPhysicalMaterial({color:0xe6e5f4,roughness:.14,metalness:.12,transparent:true,opacity:.62,clearcoat:1});materials.add(bubbleMaterial);
      for(let i=0;i<3;i++){
        const bubble=mesh(group,new THREE.SphereGeometry(.18+i*.035,20,14),bubbleMaterial,i%2?-.93:.92,1.1+i*.7,.05);
        ornaments.push(bubble);mesh(bubble,new THREE.SphereGeometry(.042,10,8),cream,-.07,.09,.13);
      }
    }
    return {data,group,product,screenMaterial,requested:false,ornaments};
  });
  return {
    selectable:groups,
    update(time:number,position:{x:number;z:number},reduced:boolean){
      installations.forEach(({data,ornaments},index)=>{
        const t=reduced?0:time;
        if(data.id==='yoin')ornaments[0].rotation.z=t*.16;
        else ornaments.forEach((o,i)=>{o.position.y=1.1+i*.7+(reduced?0:Math.sin(t*.8+i)*.06);});
        const item=installations[index];
        if(!item.requested&&Math.hypot(position.x-data.x,position.z-data.z)<14*data.scale){
          item.requested=true;
          loader.load(item.product.media![0].src,texture=>{
            if(disposed){texture.dispose();return;}
            texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);item.screenMaterial.map=texture;item.screenMaterial.needsUpdate=true;
            onTextureReady();
          },undefined,()=>{/* The title and the HTML project remain available. */});
        }
      });
    },
    dispose(){disposed=true;groups.forEach(g=>g.removeFromParent());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
