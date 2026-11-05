async page => {
  const origin = 'http://localhost:3001';
  const html = await (await page.request.get(origin)).text();
  let preloadUrl;
  for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const source = await (await page.request.get(origin + src)).text();
    const chunk = source.match(/world-preload\.[\w-]+\.js/)?.[0];
    if (chunk) preloadUrl = `${origin}/_astro/${chunk}`;
  }
  if (!preloadUrl) throw Error('Cannot locate the built preloader');
  const results = [];
  for (const [width, height, dpr, cpu] of [[1440, 900, 2, 1], [390, 844, 3, 4]]) {
    for (const strategy of ['automatic', 'idle', 'hover', 'entry']) {
      const c = await page.context().browser().newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: cpu > 1, hasTouch: cpu > 1 });
      try {
        await c.route('**/_vercel/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await c.addInitScript(() => {
          window.__prefetchQA = { gl: 0, audio: 0, lcp: 0 };
          const get = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) { if (type.startsWith('webgl')) window.__prefetchQA.gl++; return get.call(this, type, ...args); };
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () { window.__prefetchQA.audio++; return play.call(this); };
          new PerformanceObserver(list => { window.__prefetchQA.lcp = list.getEntries().at(-1).startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
        const p = await c.newPage(); await p.bringToFront(); const client = await c.newCDPSession(p);
        await client.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        await p.goto(origin, { waitUntil: 'domcontentloaded' });
        if (strategy === 'automatic') await p.evaluate(url => { window.__prefetch = import(url).then(m => m.preloadWorld()); }, preloadUrl);
        if (strategy === 'idle') await p.evaluate(url => { requestIdleCallback(() => { window.__prefetch = import(url).then(m => m.preloadWorld()); }); }, preloadUrl);
        await p.waitForTimeout(1500);
        if (strategy === 'hover') await p.getByRole('link', { name: '3Dワールド', exact: true }).hover();
        await p.waitForTimeout(1500);
        const reading = await p.evaluate(() => ({ ...window.__prefetchQA, requests: performance.getEntriesByType('resource').length, bytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.encodedBodySize, 0) }));
        if (reading.gl || reading.audio) throw Error('Prefetch started rendering or audio');
        const start = Date.now(); await p.getByRole('link', { name: '3Dワールド', exact: true }).click();
        await p.locator('.worldSurface[aria-busy="false"]').waitFor({ timeout: 90000 });
        results.push({ width, cpu, strategy, reading, readyMs: Date.now() - start });
      } finally { await c.close(); }
    }
  }
  return results;
}
