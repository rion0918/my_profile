async page => {
  const context = await page.context().browser().newContext({ reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => {
      sessionStorage.setItem('portfolio-welcome-v4', 'seen');
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__THREE_DEVTOOLS__.addEventListener('observe', ({ detail: renderer }) => {
        if (!renderer.isWebGLRenderer) return;
        let town;
        const compile = renderer.compileAsync.bind(renderer);
        renderer.compileAsync = (...args) => {
          const reflection = !!renderer.getRenderTarget();
          if (!reflection && args[0].isScene) town = args[0];
          const shaders = compile(...args);
          if (!reflection) return shaders;
          window.reflectionStarted = true;
          return Promise.all([shaders, new Promise(resolve => { window.releaseReflection = resolve; })]);
        };
        const render = renderer.render.bind(renderer);
        renderer.render = (...args) => {
          if (args[0] === town && renderer.getRenderTarget()) window.reflectionDrawn = true;
          return render(...args);
        };
      });
    });
    const p = await context.newPage();
    await p.goto('http://localhost:3001/world');
    const surface = p.locator('.worldSurface[aria-busy="false"]');
    await surface.waitFor({ timeout: 12000 });
    await surface.focus();
    const position = () => p.evaluate(() => JSON.parse(sessionStorage.getItem('portfolio-position-v5')));
    const before = await position() ?? { x: 0, z: 31 };
    await p.keyboard.down('ArrowUp'); await p.waitForTimeout(300); await p.keyboard.up('ArrowUp');
    const after = await position();
    if (!after || (after.x === before.x && after.z === before.z)) throw Error('The character did not move');
    await p.waitForFunction(() => window.reflectionStarted);
    if (await p.evaluate(() => !!window.reflectionDrawn)) throw Error('A reflection rendered before preparation finished');
    await p.evaluate(() => window.releaseReflection());
    await p.getByRole('button', { name: '街全体を見る', exact: true }).click();
    await p.waitForFunction(() => window.reflectionDrawn);
    return { walkingWhileCompiling: true, reflectionsRestored: true };
  } finally { await context.close(); }
}
