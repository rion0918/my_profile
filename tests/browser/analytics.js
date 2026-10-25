async page => {
  const origin = 'http://localhost:3001';
  const response = await page.request.get('https://riomaru.jp/_vercel/insights/script.js');
  if (!response.ok()) throw Error('Analytics script is unavailable on the configured Vercel project');
  const script = await response.text();
  const results = [];
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await page.context().browser().newContext({
      viewport: { width, height }, isMobile: width < 760, hasTouch: width < 760,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
    });
    const views = [], errors = [], violations = [];
    try {
      // Exercise the real collector locally without sending test visits to production.
      await context.route(`${origin}/_vercel/insights/**`, async route => {
        if (new URL(route.request().url()).pathname.endsWith('/script.js')) {
          await route.fulfill({ contentType: 'application/javascript', body: script });
        } else {
          if (route.request().method() === 'POST') views.push(route.request().postDataJSON());
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      });
      await context.addInitScript(() => {
        // The collector normally excludes browser automation from traffic reports.
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.__analyticsViolations = [];
        document.addEventListener('securitypolicyviolation', event => window.__analyticsViolations.push(event.effectiveDirective));
      });
      const p = await context.newPage();
      await p.bringToFront();
      p.on('pageerror', error => errors.push(error.message));
      await p.goto(`${origin}/profile`);
      await p.locator('script[src*="/_vercel/insights/"]').waitFor({ state: 'attached', timeout: 5000 });
      await p.waitForFunction(() => window.vai === true);
      await p.waitForTimeout(100);
      if (views.length !== 1 || new URL(views[0].o).pathname !== '/profile') throw Error(`Missing initial page view: ${JSON.stringify(views)}`);
      await p.getByRole('link', { name: '3Dワールド', exact: true }).click();
      await p.locator('.worldSurface[aria-busy="false"]').waitFor();
      await p.waitForTimeout(100);
      if (views.length !== 2 || new URL(views[1].o).pathname !== '/') throw Error(`Client navigation was not tracked exactly once: ${JSON.stringify(views)}`);
      if (await p.locator('script[src*="/_vercel/insights/"]').count() !== 1) throw Error('Duplicate analytics script');
      await p.getByRole('link', { name: '通常表示', exact: true }).click();
      await p.waitForURL(`${origin}/profile`);
      await p.waitForTimeout(100);
      if (views.length !== 3 || new URL(views[2].o).pathname !== '/profile') throw Error('Returning to standard mode was not tracked');
      violations.push(...await p.evaluate(() => window.__analyticsViolations));
      if (errors.length || violations.length) throw Error(JSON.stringify({ errors, violations }));
      results.push({ width, views: views.map(view => new URL(view.o).pathname), duplicateScripts: false, cspViolations: 0 });
    } finally { await context.close(); }
  }
  return results;
}
