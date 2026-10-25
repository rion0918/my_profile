async (page) => {
  const origin = 'http://localhost:3001';
  const headerText = await (await page.request.get(`${origin}/_headers`)).text();
  const headers = Object.fromEntries(headerText.split('\n').filter(line => /^  [\w-]+:/.test(line)).map(line => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()];
  }));
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [], results = [];
  try {
    // The local preview does not read _headers; emulate a static host applying it.
    await context.route(`${origin}/**`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
    });
    const p = await context.newPage();
    await p.bringToFront();
    p.on('pageerror', error => errors.push(error.message));
    await p.addInitScript(() => {
      if (!sessionStorage.getItem('portfolio-position-v5')) sessionStorage.setItem('portfolio-position-v5', JSON.stringify({ version: 5, x: 16.15, z: 25 }));
      window.__securityViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__securityViolations.push(event.effectiveDirective));
    });
    for (const path of ['/', '/?mode=world', '/profile', '/about', '/tech', '/career', '/social', '/projects/yoin', '/projects/pop-reminder', '/404.html', '/_not-found']) {
      const response = await p.goto(`${origin}${path}`);
      if (path.includes('mode=world')) await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
      await p.waitForTimeout(100);
      const state = await p.evaluate(() => ({
        policy: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
        referrer: document.querySelector('meta[name="referrer"]')?.content,
        violations: window.__securityViolations,
        unsafeLinks: [...document.querySelectorAll('a[target="_blank"]')].filter(link => !link.relList.contains('noreferrer') && !link.relList.contains('noopener')).length,
      }));
      if (!state.policy || state.violations.length || state.unsafeLinks) throw Error(`${path}: ${JSON.stringify(state)}`);
      if (state.referrer !== 'no-referrer') throw Error(`Missing referrer protection on ${path}`);
      if (await response.headerValue('x-content-type-options') !== 'nosniff') throw Error(`Missing response headers on ${path}`);
      results.push({ path, scriptsAllowed: true, violations: 0 });
    }
    await p.goto(origin+'/?mode=world');
    await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
    const defaults = await p.evaluate(() => ({ quality: document.querySelector('#world-quality').value, bgm: document.querySelector('.bgmToggle').getAttribute('aria-pressed') }));
    if (defaults.quality !== 'quality' || defaults.bgm !== 'true') throw Error('Initial settings changed');
    await p.getByRole('button', { name: '自由に探索する', exact: true }).tap();
    await p.getByLabel('画質・BGM設定').tap();
    await p.waitForFunction(() => !document.querySelector('audio').paused);
    await p.getByLabel('画質モード', { exact: true }).selectOption('low');
    await p.getByLabel('画質モード', { exact: true }).selectOption('quality');
    await p.getByLabel('画質・BGM設定').tap();
    await p.getByRole('button', { name: '自転車に乗る', exact: true }).tap();
    await p.getByRole('button', { name: '自転車を降りる', exact: true }).waitFor({ timeout: 60000 });
    if ((await p.evaluate(() => window.__securityViolations)).length) throw Error('CSP blocked a legitimate world feature');
    results.push({ world: true, qualitySwitch: true, bgm: true, wasmBike: true });
    await p.goto(`${origin}/?detail=yoin`);
    await p.getByRole('dialog').waitFor({ state: 'visible' });
    if (!await p.getByRole('dialog').getByRole('heading', { name: 'Yoin館', exact: true }).isVisible()) throw Error('Valid detail URL stopped working');
    const payload = '<img src=x onerror="window.__queryInjection=true">';
    await p.goto(`${origin}/?detail=${encodeURIComponent(payload)}`);
    await p.waitForFunction(() => document.querySelector('.worldSurface')?.getAttribute('aria-busy') === 'false');
    const querySafe = await p.evaluate(() => !window.__queryInjection && !document.querySelector('dialog').open);
    if (!querySafe) throw Error('Untrusted detail query was accepted');
    await p.evaluate(async () => {
      const inline = document.createElement('script');
      inline.textContent = 'window.__inlineInjection=true'; document.head.append(inline);
      const external = document.createElement('script');
      external.src = 'https://blocked.invalid/evil.js'; document.head.append(external);
      const base = document.createElement('base'); base.href = 'https://blocked.invalid/'; document.head.append(base);
      await fetch('https://blocked.invalid/collect').catch(() => {});
    });
    await p.waitForTimeout(100);
    const blocked = await p.evaluate(() => ({
      injected: !!window.__inlineInjection,
      baseSafe: new URL(document.baseURI).hostname === 'localhost',
      violations: window.__securityViolations,
    }));
    if (blocked.injected || !blocked.baseSafe || !blocked.violations.includes('script-src-elem') || !blocked.violations.includes('connect-src') || !blocked.violations.includes('base-uri')) throw Error(JSON.stringify(blocked));
    results.push({ querySafe, injectedScriptBlocked: true, externalConnectionBlocked: true, baseInjectionBlocked: true });
    const parent = await context.newPage(), frameErrors = [];
    parent.on('console', message => { if (message.type() === 'error') frameErrors.push(message.text()); });
    await parent.setContent(`<iframe src="${origin}/profile"></iframe>`);
    await parent.waitForTimeout(500);
    if (!frameErrors.some(message => message.includes('frame-ancestors'))) throw Error(`Embedding was not blocked: ${frameErrors}`);
    await parent.close();
    results.push({ embeddingBlockedWithHostingHeaders: true });
    if (errors.length) throw Error(errors.join('\n'));
    return results;
  } finally { await context.close(); }
}
