async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Tokyo' });
  const errors = [], violations = [], results = [];
  try {
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    p.on('console', message => { if (message.type() === 'error' && /shader|WebGLProgram|security policy/i.test(message.text())) errors.push(message.text()); });
    await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+09:00'));
    await p.addInitScript(() => {
      sessionStorage.setItem('portfolio-position-v5', JSON.stringify({ version: 5, x: 16.15, z: 25 }));
      window.__THREE_DEVTOOLS__ = new EventTarget(); window.__onsenQA = {};
      window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
        if (event.detail.isScene) window.__onsenQA.scene = event.detail;
        if (event.detail.isWebGLRenderer) window.__onsenQA.renderer = event.detail;
      });
      window.__onsenViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__onsenViolations.push(event.effectiveDirective));
    });
    await p.goto('http://localhost:3001');
    await p.getByRole('button', { name: '自由に探索する', exact: true }).click();
    await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
    await p.evaluate(() => { window.__onsenQA.person = window.__onsenQA.scene.children.find(object => object.getObjectByName('Hips')); });
    // Exercise the existing bicycle, then switch to walking for the bathhouse.
    await p.getByRole('button', { name: '自転車に乗る', exact: true }).click();
    await p.getByRole('button', { name: '自転車を降りる', exact: true }).waitFor({ timeout: 60000 });
    await p.locator('.worldGuide > summary').click();
    await p.getByRole('button', { name: '露天風呂へ歩く ↗', exact: true }).click();
    await p.getByRole('button', { name: '自転車に乗る', exact: true }).waitFor();
    await p.waitForFunction(() => {
      const position = window.__onsenQA.person.position;
      return Math.hypot(position.x + 19.4, position.z + 24.7) < .08;
    }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const exterior = await p.evaluate(() => {
      const qa = window.__onsenQA, root = qa.scene.getObjectByName('onsen');
      qa.geometry = []; root.traverse(object => { if (object.isMesh) qa.geometry.push(object.geometry.uuid); });
      qa.root = root; qa.canvas = document.querySelector('.worldSurface canvas');
      return { roof: qa.scene.getObjectByName('onsen-roof').visible, steam: qa.scene.getObjectByName('onsen-steam').visible, position: qa.person.position.toArray(), meshes: qa.geometry.length };
    });
    if (!exterior.roof || !exterior.steam) throw Error(JSON.stringify(exterior));
    await p.screenshot({ path: 'output/playwright/onsen/exterior-desktop.png' });
    results.push({ outdoorReachedFromPlaza: true, dismountBeforeBaths: true, exterior });
    await p.locator('.worldGuide > summary').click();
    await p.getByRole('button', { name: '内湯へ歩く ↗', exact: true }).click();
    await p.waitForFunction(() => {
      const qa = window.__onsenQA, position = qa.person.position;
      return Math.hypot(position.x + 14.6, position.z + 23.2) < .08 && !qa.scene.getObjectByName('onsen-roof').visible;
    }, null, { timeout: 15000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: 'output/playwright/onsen/interior-desktop.png' });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: 'output/playwright/onsen/interior-mobile.png' });
    await p.getByLabel('画質・BGM設定').click();
    await p.getByLabel('画質モード', { exact: true }).selectOption('low');
    const low = await p.evaluate(() => {
      const qa = window.__onsenQA, geometry = [];
      qa.root.traverse(object => { if (object.isMesh) geometry.push(object.geometry.uuid); });
      return { sameGeometry: JSON.stringify(geometry) === JSON.stringify(qa.geometry), sameCanvas: qa.canvas === document.querySelector('.worldSurface canvas'), roof: qa.scene.getObjectByName('onsen-roof').visible, steam: qa.scene.getObjectByName('onsen-steam').visible, shadows: qa.renderer.shadowMap.enabled };
    });
    if (!low.sameGeometry || !low.sameCanvas || low.roof || low.steam || low.shadows) throw Error(JSON.stringify(low));
    await p.getByLabel('画質・BGM設定').click();
    await p.screenshot({ path: 'output/playwright/onsen/interior-low-mobile.png' });
    results.push({ indoorReached: true, lowMode: low });
    await p.locator('.worldGuide > summary').click();
    await p.getByRole('button', { name: '露天風呂へ歩く ↗', exact: true }).click();
    await p.waitForFunction(() => window.__onsenQA.scene.getObjectByName('onsen-roof').visible, null, { timeout: 15000 });
    await p.waitForFunction(() => Math.hypot(window.__onsenQA.person.position.x + 19.4, window.__onsenQA.person.position.z + 24.7) < .08);
    await p.getByLabel('画質・BGM設定').click();
    await p.getByLabel('画質モード', { exact: true }).selectOption('quality');
    await p.getByLabel('画質・BGM設定').click();
    if (!await p.evaluate(() => window.__onsenQA.scene.getObjectByName('onsen-steam').visible)) throw Error('Steam did not return in quality mode');
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.clock.setFixedTime(new Date('2026-10-24T21:00:00+09:00'));
    await p.waitForTimeout(100);
    await p.screenshot({ path: 'output/playwright/onsen/night-desktop.png' });
    violations.push(...await p.evaluate(() => window.__onsenViolations));
    if (violations.length || errors.length) throw Error(JSON.stringify({ errors, violations }));
    results.push({ roofRestoredOnExit: true, steamRestored: true, errors, violations });
    return results;
  } finally { await context.close(); }
}
