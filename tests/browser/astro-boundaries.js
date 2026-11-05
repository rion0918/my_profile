async page => {
  const browser = page.context().browser(), origin = 'http://localhost:3001', results = [];
  const routes = ['/', '/profile', '/about', '/career', '/tech', '/social', '/projects/yoin', '/projects/pop-reminder'];
  const plain = await browser.newContext({ javaScriptEnabled: false });
  try {
    const p = await plain.newPage();
    for (const route of routes) {
      const response = await p.goto(origin + route);
      if (response.status() !== 200 || await p.locator('h1').count() !== 1 || await p.locator('main').innerText() === '') throw Error('Unreadable static route: ' + route);
      if (await p.locator('astro-island').count()) throw Error('Normal route contains a React island: ' + route);
    }
    await p.goto(origin + '/world');
    await p.getByRole('link', { name: '通常表示でプロフィールと作品を読む', exact: true }).click();
    await p.locator('#career').waitFor();
    results.push({ noJavaScript: routes, worldFallback: true });
  } finally { await plain.close(); }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await context.route('**/_vercel/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await context.addInitScript(() => {
      window.__boundary = { gl: 0, play: 0, frames: 0, violations: [] };
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { if (type.startsWith('webgl')) window.__boundary.gl++; return get.call(this, type, ...args); };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__boundary.play++; return play.call(this); };
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__THREE_DEVTOOLS__.addEventListener('observe', e => { if (e.detail.isWebGLRenderer) { const render = e.detail.render.bind(e.detail); e.detail.render = (...args) => { window.__boundary.frames++; return render(...args); }; } });
      document.addEventListener('securitypolicyviolation', e => window.__boundary.violations.push(e.effectiveDirective));
    });
    const p = await context.newPage(), requests = [], errors = [];
    p.on('request', r => requests.push(r.url())); p.on('pageerror', e => errors.push(e.message));
    await p.goto(origin); await p.waitForTimeout(3200);
    const initial = await p.evaluate(() => window.__boundary);
    if (initial.gl || initial.play || requests.some(url => /WorldApp|WorldCanvas|rapier|world-map|\/models\/|\/textures\/|\/audio\//.test(url))) throw Error('Normal page loaded the world: ' + JSON.stringify({ initial, requests }));
    const timeOrigin = await p.evaluate(() => performance.timeOrigin);
    await p.getByRole('link', { name: '3Dワールド', exact: true }).focus();
    await p.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/models/rion-walker.glb')));
    if (await p.evaluate(() => window.__boundary.gl || window.__boundary.play)) throw Error('Prefetch initialized WebGL or audio');
    await p.getByRole('link', { name: '3Dワールド', exact: true }).click();
    await p.locator('.worldSurface[aria-busy="false"]').waitFor({ timeout: 60000 });
    await p.getByRole('link', { name: '通常表示', exact: true }).click(); await p.locator('#career').waitFor();
    await p.waitForTimeout(300);
    const frames = await p.evaluate(() => window.__boundary.frames);
    await p.waitForTimeout(300);
    if (await p.evaluate(() => window.__boundary.frames) !== frames || await p.locator('audio, canvas').count()) throw Error('World continued after returning to reading');
    if (await p.evaluate(() => performance.timeOrigin) !== timeOrigin) throw Error('Mode navigation reloaded the document');
    if (errors.length || await p.evaluate(() => window.__boundary.violations.length)) throw Error(JSON.stringify({ errors, state: await p.evaluate(() => window.__boundary) }));
    results.push({ noAutomaticPrefetch: true, focusPrefetchWithoutRendering: true, worldDisposed: true, clientNavigation: true, cspViolations: 0 });
  } finally { await context.close(); }

  for (const failure of ['webgl', 'model', 'island']) {
    const c = await browser.newContext();
    try {
      if (failure === 'webgl') await c.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : get.call(this, type, ...args); }; });
      if (failure === 'model') await c.route('**/models/rion-walker.glb', r => r.abort());
      if (failure === 'island') await c.route('**/WorldApp.*.js', r => r.abort());
      const p = await c.newPage(); await p.goto(origin + '/world');
      if (failure === 'island') await p.getByRole('link', { name: '通常表示でプロフィールと作品を読む ↗', exact: true }).click();
      else { await p.locator('.worldFallback').waitFor(); await p.getByRole('dialog', { name: '閲覧方法を選択' }).getByRole('link', { name: '通常表示で読む' }).click(); }
      await p.locator('#career').waitFor();
      results.push({ failure, readableFallback: true });
    } finally { await c.close(); }
  }
  const legacy = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const p = await legacy.newPage();
    await p.goto(origin + '/?mode=world#career');
    await p.waitForURL('**/profile#career');
    await p.locator('#career').waitFor();
    await p.goto(origin + '/?detail=yoin&source=legacy');
    await p.getByRole('dialog', { name: 'Yoin館', exact: true }).waitFor();
    const url = new URL(p.url());
    if (url.pathname !== '/world' || url.searchParams.get('source') !== 'legacy') throw Error('Legacy query parameters were lost');
    results.push({ legacyAnchor: true, legacyDetail: true, queryPreserved: true });
  } finally { await legacy.close(); }
  const economical = await browser.newContext();
  try {
    await economical.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } }));
    const p = await economical.newPage();
    await p.goto(origin);
    await p.getByRole('link', { name: '3Dワールド', exact: true }).focus();
    await p.waitForTimeout(700);
    if (await p.evaluate(() => performance.getEntriesByType('resource').some(e => /world-preload|WorldApp|world-map/.test(e.name)))) throw Error('Save-Data still prefetches the world');
    results.push({ saveDataSkipsPrefetch: true });
  } finally { await economical.close(); }
  return results;
}
