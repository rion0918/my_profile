async page => {
  const results = [];
  for (const width of [1280, 390]) {
    const context = await page.context().browser().newContext({
      viewport: { width, height: 844 }, reducedMotion: 'reduce', hasTouch: width === 390,
    });
    try {
      await context.addInitScript(() => sessionStorage.setItem('portfolio-welcome-v4', 'seen'));
      const p = await context.newPage();
      await p.goto('http://localhost:3001/world');
      await p.locator('.worldSurface[aria-busy="false"]').waitFor();
      const guide = p.locator('.worldGuide'), summary = guide.locator(':scope > summary');
      await summary.click();
      const atlas = guide.locator('.guideAtlas');
      if (await atlas.evaluate(el => el.open) !== (width > 760)) throw Error('Unexpected initial map layout');
      if (width === 390) await atlas.locator('summary').click();
      const marker = guide.locator('.guideCurrentPosition');
      const start = await marker.getAttribute('cy');
      await guide.getByRole('button', { name: 'Career館へ歩く', exact: true }).click();
      await p.getByRole('dialog', { name: 'Career館', exact: true }).waitFor({ timeout: 30000 });
      await p.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
      await summary.click();
      await p.waitForFunction(y => document.querySelector('.guideCurrentPosition')?.getAttribute('cy') !== y, start);
      for (const name of ['Activities館', 'Idea Boost館', 'ふわっと。館']) {
        await guide.locator('.worldDirectory a').filter({ hasText: name }).click();
        await p.getByRole('dialog', { name, exact: true }).waitFor();
        await p.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
        if (!await guide.evaluate(el => el.open)) await summary.click();
      }
      await guide.locator('.guideSpecs > summary').click();
      if (!await guide.getByText('RTX 3070 Ti', { exact: true }).isVisible()) throw Error('Missing PC details');
      await p.keyboard.press('Escape');
      if (!await summary.evaluate(el => document.activeElement === el && !el.parentElement.open)) throw Error('Guide dismissal lost focus');
      results.push({ width, mapTracksWalk: true, reading: true, keyboardDismissal: true });
    } finally { await context.close(); }
  }
  return results;
}
