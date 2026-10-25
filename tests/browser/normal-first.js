async page => {
  const results = [];
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    try {
      await context.addInitScript(() => {
        window.__entryQA = { gl: 0, audio: 0 };
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type.startsWith('webgl')) window.__entryQA.gl++;
          return getContext.call(this, type, ...args);
        };
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () { window.__entryQA.audio++; return play.call(this); };
      });
      const p = await context.newPage(); await p.bringToFront();
      p.on('pageerror', error => errors.push(error.message));
      const started = Date.now();
      await p.goto('http://localhost:3001');
      if (!await p.locator('#career').isVisible() || await p.locator('.worldPage').count()) throw Error('The initial page is not the readable portfolio');
      const readingReadyMs = Date.now() - started;
      await p.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/models/rion-walker.glb') && e.responseEnd > 0));
      const idle = await p.evaluate(() => window.__entryQA);
      if (idle.gl || idle.audio || await p.locator('.worldSurface').count()) throw Error('Reading started rendering or BGM: ' + JSON.stringify(idle));
      await p.screenshot({ path: `output/playwright/normal-first-${width}.png` });
      await p.locator('#career').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
      const readY = await p.evaluate(() => scrollY), timeOrigin = await p.evaluate(() => performance.timeOrigin);
      const switchStart = Date.now();
      await p.locator('.modeSwitch a').filter({ hasText: '3Dワールド' }).click();
      await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
      const switchReadyMs = Date.now() - switchStart;
      if (!p.url().includes('mode=world') || await p.locator('.worldEntry').count() || await p.evaluate(() => performance.timeOrigin) !== timeOrigin) throw Error('Entering 3D reloaded the page or showed the old entry choice');
      await p.locator('.modeSwitch a').filter({ hasText: '通常表示' }).click();
      await p.locator('#career').waitFor();
      await p.waitForFunction(y => Math.abs(scrollY - y) < 3, readY);
      await p.goBack();
      await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
      await p.goForward(); await p.locator('#career').waitFor();
      await p.waitForFunction(y => Math.abs(scrollY - y) < 3, readY);
      await p.goto('http://localhost:3001/?detail=yoin');
      await p.getByRole('dialog', { name: 'Yoin館', exact: true }).waitFor();
      await p.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
      if (!p.url().includes('mode=world') || !await p.locator('.worldPage').isVisible()) throw Error('Closing a direct detail left the world');
      await p.locator('.worldGuide > summary').click(); await p.locator('.guideTour').click();
      for (let index = 0; index < 4; index++) {
        await p.locator('.worldPage[data-tour-phase="reading"]').waitFor();
        await p.locator('.tourFooter .tourNext').click();
      }
      await p.locator('.worldPage[data-tour-phase="complete"]').waitFor();
      if (p.url().includes('detail=') || !p.url().includes('mode=world')) throw Error('Tour completion lost the world mode');
      await p.locator('.tourCompleteFooter .tourNext').click();
      await p.goto('http://localhost:3001/profile');
      if (!await p.locator('#career').isVisible()) throw Error('The existing profile URL broke');
      await p.getByRole('link', { name: '3Dの街を歩く', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
      await p.locator('.modeSwitch a').filter({ hasText: '通常表示' }).click();
      await p.waitForURL('**/profile');
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
      if (errors.length) throw Error(errors.join('\n'));
      results.push({ width, readingReadyMs, switchReadyMs, idle, readerPositionRestored: true, history: true, directDetail: true, tourComplete: true, errors });
    } finally { await context.close(); }
  }
  const noJS = await page.context().browser().newContext({ javaScriptEnabled: false });
  try {
    const p = await noJS.newPage(); await p.goto('http://localhost:3001');
    if (!await p.locator('#career').isVisible() || !await p.locator('#products').isVisible()) throw Error('The portfolio requires JavaScript to read');
    results.push({ serverRenderedWithoutJavaScript: true });
  } finally { await noJS.close(); }
  return results;
}
