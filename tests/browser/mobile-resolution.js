async page => {
  const results = [];
  for (const [width, height, dpr, touch, cap] of [[390,844,3,true,2], [393,852,2,true,2], [360,740,1,true,2], [844,390,3,true,2], [1440,900,2,false,1.5]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    const errors = [];
    try {
      await context.addInitScript(() => sessionStorage.setItem('portfolio-welcome-v4', 'seen'));
      const p = await context.newPage(); await p.bringToFront();
      p.on('pageerror', error => errors.push(error.message));
      await p.goto('http://localhost:3001/?mode=world');
      await p.locator('.worldSurface[aria-busy="false"]').waitFor();
      await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
      await p.locator('.worldSurface').focus(); await p.keyboard.press('Escape');
      const canvas = p.locator('.worldSurface > canvas');
      const size = () => canvas.evaluate(c => ({ width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight }));
      const check = async ratio => {
        await p.waitForFunction(ratio => {
          const c = document.querySelector('.worldSurface > canvas');
          return c.width === Math.floor(c.clientWidth * ratio) && c.height === Math.floor(c.clientHeight * ratio);
        }, ratio, { timeout: 3000 });
      };
      const quality = await size();
      await p.screenshot({ path: `output/playwright/mobile-resolution-${width}-${dpr}.png`, scale: 'device' });
      if (quality.width !== Math.floor(quality.cssWidth * Math.min(dpr, cap)) || quality.height !== Math.floor(quality.cssHeight * Math.min(dpr, cap))) throw Error(`Expected quality DPR ${Math.min(dpr, cap)}: ${JSON.stringify(quality)}`);
      await p.getByLabel('画質・BGM設定').click();
      await p.getByLabel('画質モード', { exact: true }).selectOption('low');
      await check(Math.min(dpr, .75));
      const low = await size();
      await p.getByLabel('画質モード', { exact: true }).selectOption('quality');
      await p.getByLabel('画質・BGM設定').click();
      await check(Math.min(dpr, cap));
      if (width === 390) {
        await p.setViewportSize({ width: height, height: width });
        await check(Math.min(dpr, cap));
        await p.setViewportSize({ width, height });
        await check(Math.min(dpr, cap));
      }
      if (errors.length) throw Error(errors.join('\n'));
      results.push({ width, height, dpr, quality, low, restored: true, rotation: width === 390, errors });
    } finally { await context.close(); }
  }
  return results;
}
