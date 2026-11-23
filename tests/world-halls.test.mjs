import test from 'node:test';
import assert from 'node:assert/strict';
import { halls } from '../lib/world-halls.ts';
import { buildings } from '../lib/world-layout.ts';
import { sections } from '../lib/sections.ts';
import { tourStops, tourFork } from '../lib/world-tour.ts';
import { products } from '../lib/products.ts';
import * as portfolio from '../lib/portfolio.ts';
import { career, activities } from '../lib/portfolio.ts';
import { createEntryController } from '../lib/world-entry.ts';

test('seven halls share their identity, placement and doorway destination',()=>{
  const expected=[['experience',8,23],['idea-boost',-8,6],['pop-reminder',8,6],['history',-8,23],['github',-22,14],['zenn',22,14],['x',-32,7]];
  assert.deepEqual(halls.map(h=>[h.id,h.x,h.z]),expected);
  assert.equal(new Set(halls.map(h=>h.model)).size,6);
  for(const h of halls){
    const b=buildings.find(b=>b.id===h.id),section=sections.find(s=>s.id===h.id);
    assert.equal(b.name,h.name);assert.equal(b.model,h.model);assert.equal(section.label,h.name);
    assert.equal(section.href,h.href);assert.ok(h.tagline.length);
    const entry=createEntryController(buildings);entry.update(b.entry.outside);assert.equal(entry.update(b.entry.inside),h.id);
  }
  assert.deepEqual(tourStops.map(s=>s.id),['history','experience','idea-boost','pop-reminder']);
  assert.deepEqual(tourFork,{x:0,z:0});
});

test('external link doors target the owner profiles and the real Fuwatto site',()=>{
  assert.equal(halls.find(h=>h.id==='github').external.href,'https://github.com/rion0918');
  assert.equal(halls.find(h=>h.id==='zenn').external.href,'https://zenn.dev/riozenn');
  assert.equal(halls.find(h=>h.id==='x').external.href,'https://x.com/rioi7_0918');
  assert.equal(halls.find(h=>h.id==='pop-reminder').external.href,'https://fuwatto.riomaru.jp/');
  assert.equal(halls.find(h=>h.id==='idea-boost').external.href,'https://ideaboost.dev/');
  const product=products.find(p=>p.slug==='pop-reminder');
  assert.equal(product.name,'ふわっと。');
  assert.equal(product.status, 'Android');
  assert.equal(product.officialSite.href,'https://fuwatto.riomaru.jp/');
  assert.equal(product.primaryLink.href,'https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja');
});

test('detail identifiers and article paths remain available without tech stack',()=>{
  for(const id of ['about','career','activities','social','idea-boost','pop-reminder'])assert.ok(sections.find(s=>s.id===id));
  assert.equal(sections.find(s=>s.id==='tech'),undefined);
  assert.equal(sections.find(s=>s.id==='pop-reminder').href,'/projects/pop-reminder');
  assert.equal(sections.find(s=>s.id==='experience').href,'/activities');
  assert.equal(sections.find(s=>s.id==='history').href,'/career');
  assert.equal(sections.find(s=>s.id==='github').href,'/social#github');
  assert.equal(sections.find(s=>s.id==='zenn').href,'/social#zenn');
  assert.equal(sections.find(s=>s.id==='x').href,'/social#x');
});

test('Career and Activities are separated across the normal headings, halls, signs and tour stops',()=>{
  const historyHall=halls.find(h=>h.id==='history');
  assert.equal(historyHall.name,'Career');
  assert.equal(sections.find(s=>s.id==='history').title,historyHall.name);
  assert.equal(sections.find(s=>s.id==='career').title,historyHall.name);
  assert.equal(tourStops[0].title,historyHall.name);
  assert.deepEqual(historyHall.theme,{word:'Career',primary:0x243b55,surface:0xf2ebdb,light:0xc5a46b,lettering:0xf2ebdb});
  assert.equal(historyHall.model,'gallery');
  assert.equal(historyHall.href,'/career');

  const experienceHall=halls.find(h=>h.id==='experience');
  assert.equal(experienceHall.name,'Activities');
  assert.equal(sections.find(s=>s.id==='experience').title,experienceHall.name);
  assert.equal(sections.find(s=>s.id==='activities').title,experienceHall.name);
  assert.equal(tourStops[1].title,experienceHall.name);
  assert.deepEqual(experienceHall.theme,{word:'Activities',primary:0x356f5d,surface:0xf0eadb,light:0xb9cfb2,lettering:0x356f5d});
  assert.equal(experienceHall.model,'workshop');
  assert.equal(experienceHall.href,'/activities');
});

test('career contains only education and work history, activities holds We部, and techGroups/careerGroups are removed',()=>{
  assert.deepEqual(career.map(entry=>entry.title),['合同会社DMM.com','Sky株式会社','神戸電子専門学校','上宮高等学校']);
  assert.equal(career.some(entry=>entry.title.includes('We部')),false);
  assert.equal(activities.length,2);
  const event = activities.find(entry => entry.title === 'KOBE STUDENT HACK 2027');
  assert.equal(event?.period, '開催準備中');
  assert.match(event.description, /実行委員/);
  assert.equal(event.links[0].href, 'https://ksh2027.web-u.dev/');
  assert.equal(activities[0].title, 'Webu（We部）');
  assert.equal(activities[0].prefix, '学生団体');
  assert.match(activities[0].description, /学校生活の困りごと/);
  assert.doesNotMatch(activities[0].description, /インターン合格/);
  assert.deepEqual(activities[0].links,[
    { label: 'We部の公式サイト', href: 'https://join.web-u.dev/' },
    { label: '神戸電子の紹介記事', href: 'https://www.kobedenshi.ac.jp/media/article/career_advice/746/' },
  ]);
  assert.equal('techGroups' in portfolio,false);
  assert.equal('careerGroups' in portfolio,false);
});
