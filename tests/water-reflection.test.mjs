import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWater } from '../components/world/create-water.ts';

test('the harbor reflection clips submerged piles while keeping objects above the sea', () => {
  const scene = new THREE.Scene();scene.background=new THREE.Color(0xbcd4d3);
  const water = createWater(scene, []);
  const camera = new THREE.OrthographicCamera(-10.08, 10.08, 6.3, -6.3, .1, 600);
  camera.position.set(9, 12.8, -27);camera.lookAt(-3, .4, -47);camera.updateMatrixWorld();
  let reflected;
  const renderer = {
    xr: { enabled: false }, shadowMap: { autoUpdate: true }, autoClear: true,
    state: { buffers: { depth: { setMask() {} } } },
    getSize: (v) => v.set(1440, 900), getRenderTarget: () => null, setRenderTarget() {},
    render: (_, c) => { reflected = c.clone(); },
  };
  try {
    water.reflect(renderer, camera);
    assert.ok(reflected, 'the sea reflection was captured');
    const clipZ = (y) => {
      const p = new THREE.Vector4(-3.4, y, -46.7, 1)
        .applyMatrix4(reflected.matrixWorldInverse).applyMatrix4(reflected.projectionMatrix);
      return p.z / p.w;
    };
    assert.ok(clipZ(.5) >= -1 && clipZ(.5) <= 1, 'above-water geometry stays visible');
    assert.ok(clipZ(-.2) < -1, 'even a pile just below sea level must be clipped');
    assert.ok(clipZ(-3.7) < -1, 'the underwater pile cannot appear above its reflection');
  } finally { water.dispose(); }
});
