async page => {
  const c = await page.context().browser().newContext({ reducedMotion: 'reduce' });
  try {
    await c.addInitScript(() => sessionStorage.setItem('portfolio-welcome-v4', 'seen'));
    const p = await c.newPage();
    await p.goto('http://localhost:3001/world');
    await p.locator('.worldSurface[aria-busy="false"]').waitFor();
    await p.evaluate(() => { window.__originalCanvas = document.querySelector('canvas'); window.__timeOrigin = performance.timeOrigin; });
    await p.locator('.worldGuide > summary').click();
    await p.locator('.worldDirectory a').filter({ hasText: 'Background' }).click();
    await p.getByRole('dialog', { name: 'Background', exact: true }).waitFor();
    await p.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
    await p.waitForFunction(() => !new URLSearchParams(location.search).has('detail'));
    await p.waitForTimeout(150);
    if (!await p.evaluate(() => window.__originalCanvas === document.querySelector('canvas') && window.__originalCanvas.isConnected)) throw Error('Closing an exhibit rebuilt the world');
    await p.goForward();
    await p.getByRole('dialog', { name: 'Background', exact: true }).waitFor();
    if (!await p.evaluate(() => window.__originalCanvas === document.querySelector('canvas'))) throw Error('Forward rebuilt the world');
    await p.getByRole('link', { name: '通常表示で読む ↗', exact: true }).click();
    await p.locator('.detailPage h1').waitFor();
    await p.goBack(); await p.getByRole('dialog', { name: 'Background', exact: true }).waitFor();
    await p.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
    await p.locator('.worldSurface[aria-busy="false"]').waitFor();
    if (!await p.evaluate(() => performance.timeOrigin === window.__timeOrigin)) throw Error('History navigation reloaded the document');
    return { exhibitCloseRetainsCanvas: true, forwardRetainsCanvas: true, articleBackRestoresExhibit: true, clientNavigation: true };
  } finally { await c.close(); }
}
