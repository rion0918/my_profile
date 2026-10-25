import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldAudio } from '../lib/world-audio.ts';

function fixture(play = async () => {}) {
  const media = { src: '', loop: false, preload: '', volume: 1, paused: true, playCalls: 0, pauseCalls: 0,
    play() { this.playCalls++; return play().then(() => { this.paused = false; }); },
    pause() { this.pauseCalls++; this.paused = true; },
    removeAttribute() { this.src = ''; }, load() {} };
  const states = [], controller = createWorldAudio(media, state => states.push(state));
  return { media, states, controller };
}

test('BGM defaults to enabled and starts when mounted', async () => {
  const { media, controller } = fixture();
  assert.equal(controller.state, 'waiting');
  assert.equal(media.src, ''); assert.equal(media.playCalls, 0);
  await controller.enable();
  assert.equal(media.src, '/audio/bossa-antigua.mp3');
  assert.equal(media.loop, true); assert.equal(media.volume, 0.5);
  assert.equal(controller.state, 'playing');
  controller.disable(); assert.equal(media.paused, true); assert.equal(controller.state, 'off');
  controller.dispose();
});

test('autoplay blocking keeps BGM on and the first interaction starts it, unless switched off', async () => {
  let blocked = true;
  const { media, controller } = fixture(async () => {
    if (blocked) throw Object.assign(new Error('Autoplay blocked'), { name: 'NotAllowedError' });
  });
  await controller.enable();
  assert.equal(controller.state, 'waiting');
  blocked = false;
  await controller.unlock();
  assert.equal(controller.state, 'playing');
  const calls = media.playCalls;
  controller.disable();
  await controller.unlock();
  assert.equal(controller.state, 'off');
  assert.equal(media.playCalls, calls);
  controller.dispose();
});

test('leaving the page pauses music and returning resumes only if it is still enabled', async () => {
  const { media, controller } = fixture(); await controller.enable();
  await controller.setVisible(false); assert.equal(media.paused, true); assert.equal(controller.state, 'paused');
  await controller.setVisible(true); assert.equal(media.playCalls, 2); assert.equal(controller.state, 'playing');
  await controller.setVisible(false); controller.disable(); await controller.setVisible(true);
  assert.equal(media.playCalls, 2); assert.equal(controller.state, 'off');
});

test('stopping during a pending play cannot restart music and a failed start remains retryable', async () => {
  let resolve;
  const { media, controller } = fixture(() => new Promise(r => { resolve = r; }));
  const pending = controller.enable(); controller.disable(); resolve(); await pending;
  assert.equal(media.paused, true); assert.equal(controller.state, 'off');
  let fail = true;
  const other = fixture(async () => { if(fail) throw Error('blocked'); });
  await other.controller.enable(); assert.equal(other.controller.state, 'error'); assert.equal(other.media.paused, true);
  fail = false; await other.controller.enable(); assert.equal(other.controller.state, 'playing');
  other.controller.setVolume(0.2); assert.equal(other.media.volume, 0.2);
  other.controller.dispose(); assert.equal(other.media.src, ''); assert.equal(other.media.paused, true);
});

test('a late media error after stopping does not turn a silent player into an error state', async () => {
  const { controller } = fixture();
  await controller.enable(); controller.disable(); controller.fail();
  assert.equal(controller.state, 'off');
});
