import test from 'node:test';
import assert from 'node:assert/strict';
import { halls } from '../lib/world-halls.ts';
import { buildings } from '../lib/world-layout.ts';
import { sections } from '../lib/sections.ts';
import { tourStops, tourFork } from '../lib/world-tour.ts';
import { products } from '../lib/products.ts';
import { careerGroups } from '../lib/portfolio.ts';
import { createEntryController } from '../lib/world-entry.ts';

test('seven halls share their identity, placement and doorway destination',()=>{
  const expected=[['experience',8,23],['yoin',-8,6],['pop-reminder',8,6],['history',-8,23],['github',-22,14],['zenn',22,14],['x',-32,7]];
  assert.deepEqual(halls.map(h=>[h.id,h.x,h.z]),expected);
  assert.equal(new Set(halls.map(h=>h.model)).size,6);
  for(const h of halls){
    const b=buildings.find(b=>b.id===h.id),section=sections.find(s=>s.id===h.id);
    assert.equal(b.name,h.name);assert.equal(b.model,h.model);assert.equal(section.label,h.name);
    assert.equal(section.href,h.href);assert.ok(h.tagline.length);
    const entry=createEntryController(buildings);entry.update(b.entry.outside);assert.equal(entry.update(b.entry.inside),h.id);
  }
  assert.deepEqual(tourStops.map(s=>s.id),['history','experience','yoin','pop-reminder']);
  assert.deepEqual(tourFork,{x:0,z:0});
});

test('external link doors target the owner profiles and the real Fuwatto site',()=>{
  assert.equal(halls.find(h=>h.id==='github').external.href,'https://github.com/rion0918');
  assert.equal(halls.find(h=>h.id==='zenn').external.href,'https://zenn.dev/riozenn');
  assert.equal(halls.find(h=>h.id==='x').external.href,'https://x.com/rioi7_0918');
  assert.equal(halls.find(h=>h.id==='pop-reminder').external.href,'https://fuwatto.pages.dev/');
  assert.equal(halls.find(h=>h.id==='yoin').external,undefined);
  const product=products.find(p=>p.slug==='pop-reminder');
  assert.equal(product.name,'ふわっと。');
  assert.ok(product.links.some(l=>l.href==='https://fuwatto.pages.dev/'));
});

test('legacy detail identifiers and article paths remain available alongside new halls',()=>{
  for(const id of ['about','career','social','tech','yoin','pop-reminder'])assert.ok(sections.find(s=>s.id===id));
  assert.equal(sections.find(s=>s.id==='pop-reminder').href,'/projects/pop-reminder');
  assert.equal(sections.find(s=>s.id==='experience').href,'/career#experience');
  assert.equal(sections.find(s=>s.id==='history').href,'/career#history');
  assert.equal(sections.find(s=>s.id==='github').href,'/social#github');
  assert.equal(sections.find(s=>s.id==='zenn').href,'/social#zenn');
  assert.equal(sections.find(s=>s.id==='x').href,'/social#x');
});

test('Background is shared by the normal heading, hall, sign and first tour stop',()=>{
  const hall=halls.find(h=>h.id==='history');
  assert.equal(hall.name,'Background');
  assert.equal(careerGroups.find(group=>group.id==='history').title,hall.name);
  assert.equal(sections.find(s=>s.id==='history').title,hall.name);
  assert.equal(tourStops[0].title,hall.name);
  assert.deepEqual(hall.theme,{word:'Background',primary:0x243b55,surface:0xf2ebdb,light:0xc5a46b,lettering:0xf2ebdb});
  assert.equal(hall.model,'gallery');
  assert.equal(hall.href,'/career#history');
});
