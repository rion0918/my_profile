import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { halls } from '../lib/world-halls.ts';

const expected={experience:{word:'Experience',primary:0x356f5d,surface:0xf0eadb,light:0xb9cfb2,lettering:0x356f5d},yoin:{word:'Yoin',primary:0x795166,surface:0xe9c9c2,light:0xf4d9a6,lettering:0xfff1db},'pop-reminder':{word:'ふわっと。',primary:0x67adb5,surface:0xffddd6,light:0xfff0dc,lettering:0x2f7078},history:{word:'Career',primary:0x243b55,surface:0xf2ebdb,light:0xc5a46b,lettering:0xf2ebdb},github:{word:'GitHub',primary:0x0fbf3e,surface:0x232925,light:0xf2f5f3,lettering:0xf2f5f3},zenn:{word:'Zenn',primary:0x3ea8ff,surface:0xffffff,light:0xe7f4ff,lettering:0x3ea8ff},x:{word:'X',primary:0x202327,surface:0x171a1e,light:0xf4f5f6,lettering:0xffffff}};

test('the themed halls carry their own lettering and building palette',()=>{
 assert.equal(Object.keys(expected).length,halls.length);
 for(const [id,theme] of Object.entries(expected))assert.deepEqual(halls.find(h=>h.id===id).theme,theme);
 for(const h of halls.filter(h=>!expected[h.id]))assert.equal(h.theme,undefined);
});

test('sculptural signs contain the real glyphs, visible depth and fit the existing facades',async()=>{
 const {createHallWordGeometry}=await import('../components/world/create-hall-word.ts');
 const font=new FontLoader().parse(JSON.parse(readFileSync(new URL('../components/world/assets/helvetiker_regular.typeface.json',import.meta.url))));
 for(const [id,{word}] of Object.entries(expected)){
  const signFont=id==='pop-reminder'?new FontLoader().parse(JSON.parse(readFileSync(new URL('../components/world/assets/fuwatto.typeface.json',import.meta.url)))):font;
  for(const char of word)assert.ok(signFont.data.glyphs[char],char+' is present in the local font');
  const geometry=createHallWordGeometry(word,signFont,3.15,.62);
  try{
   geometry.computeBoundingBox();const bounds=geometry.boundingBox;
   assert.ok(bounds.max.x-bounds.min.x<=3.151);
   assert.ok(bounds.max.y-bounds.min.y<=.621);
   assert.ok(bounds.max.z-bounds.min.z>.1,'solid lettering has visible side faces');
   assert.ok(Math.abs(bounds.min.x+bounds.max.x)<.0001,'word is centered');
   assert.ok(Math.abs(bounds.min.y)<.0001,'letters sit on their mounting rail');
   assert.equal(geometry.parameters.options.bevelEnabled,true);
   assert.equal(geometry.groups.length,2,'the complete word uses only two material draws');
   assert.equal(geometry.index.count,geometry.getAttribute('position').count,'all faces remain present after grouping');
   assert.deepEqual([...new Set(geometry.groups.map(g=>g.materialIndex))].sort(),[0,1],'letter faces and extruded sides can use separate colors');
  }finally{geometry.dispose();}
 }
});

test('the Japanese product sign bundles only its five glyphs and keeps the font source and license',()=>{
 const data=JSON.parse(readFileSync(new URL('../components/world/assets/fuwatto.typeface.json',import.meta.url)));
 assert.deepEqual(Object.keys(data.glyphs),Array.from('ふわっと。'));
 assert.equal(data.originalFont,'Zen Maru Gothic Black');
 assert.ok(data.license.includes('SIL OPEN FONT LICENSE'));
 assert.equal(data.sourceSha256,'6bd74fe76cd39ee0ec18775c3661d845343fb3f6f8fa09a3076638417baf741f');
});

test('every letter face and edge has dedicated fluorescent materials, independent of scene lighting',async()=>{
 const {createHallWordMaterials}=await import('../components/world/create-hall-word.ts');
 for(const theme of Object.values(expected)){
  const pair=createHallWordMaterials(theme.lettering,theme.primary);
  const second=createHallWordMaterials(theme.lettering,theme.primary);
  try{
   assert.equal(pair.length,2);
   assert.equal(pair[0].color.getHex(),theme.lettering,'keep the facade palette');
   assert.equal(pair[1].color.getHex(),theme.primary);
   for(let i=0;i<2;i++){
    assert.ok(pair[i].emissiveIntensity>=.8,'faces and extruded sides remain visibly lit');
    assert.ok(pair[i].emissive.getHex()>0);
    assert.equal(pair[i].toneMapped,false,'exposure cannot dim the sign');
    assert.notEqual(pair[i],second[i],'do not illuminate walls sharing the same base color');
   }
  }finally{[...pair,...second].forEach(m=>m.dispose());}
 }
});
