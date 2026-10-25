import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusTransition } from '../lib/world-focus.ts';
function clock(){let time=0,callback,id=0;return {request:cb=>(callback=cb,++id),cancel:()=>{callback=null;},now:()=>time,tick(t){time=t;const cb=callback;callback=null;cb?.(time);}};}
test('focus takes 700ms, reduced motion completes immediately',async()=>{
  const c=clock(),focus=createFocusTransition(c.request,c.cancel,c.now),values=[];
  const result=focus.move(t=>values.push(t),false);c.tick(350);assert.ok(values.at(-1)>.4&&values.at(-1)<.6);c.tick(700);
  assert.equal(await result,true);assert.equal(values.at(-1),1);
  assert.equal(await focus.move(t=>values.push(t),true),true);assert.equal(values.at(-1),1);
});
test('leaving or replacing a focus cancels it without a stale completion',async()=>{
  const c=clock(),focus=createFocusTransition(c.request,c.cancel,c.now),values=[];
  const first=focus.move(t=>values.push(t),false);c.tick(200);focus.cancel();assert.equal(await first,false);
  const count=values.length;c.tick(1000);assert.equal(values.length,count);
  const second=focus.move(()=>{},false);const third=focus.move(()=>{},true);
  assert.equal(await second,false);assert.equal(await third,true);
});
