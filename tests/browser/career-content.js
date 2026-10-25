async page => {
  const origin = 'http://localhost:3001', results = [];
  const destinations = ['https://join.web-u.dev/', 'https://www.kobedenshi.ac.jp/media/article/career_advice/746/'];
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    try {
      await context.addInitScript(() => sessionStorage.setItem('portfolio-welcome-v4', 'seen'));
      for (const url of destinations) await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Community resource</title>' }));
      const p = await context.newPage(); await p.bringToFront();
      p.on('pageerror', error => errors.push(error.message));
      for (const path of ['/career', '/profile', '/?detail=career', '/?detail=history', '/?detail=experience']) {
        await p.goto(origin + path);
        if (path.includes('detail=')) await p.locator('dialog[open] #detail-title').filter({ hasText: /.+/ }).waitFor();
        const scope = path.includes('detail=') ? p.locator('dialog[open]') : path === '/profile' ? p.locator('#career') : p.locator('main');
        const text = await scope.innerText();
        if (!path.endsWith('experience')) {
          for (const fact of ['2019 - 2022', '2023 - 2027', 'Webエンジニアとして内定']) if (!text.includes(fact)) throw Error(`${path}: missing ${fact}`);
          if (text.includes('Webフロントエンドエンジニア')) throw Error(`${path}: outdated offer title`);
        }
        if (!path.endsWith('history')) {
          const sky = scope.locator('.careerItem,.hallActivity').filter({ hasText: 'Sky株式会社' });
          const skyText = await sky.innerText();
          if (!skyText.includes('2025.03 - 2026.08') || skyText.includes('現在')) throw Error(`${path}: incorrect internship dates`);
          const community = scope.locator('.careerItem,.hallActivity').filter({ hasText: 'We部 community' });
          for (const href of destinations) {
            const link = community.locator(`a[href="${href}"]`);
            if (await link.count() !== 1 || await link.getAttribute('target') !== '_blank' || !await link.getAttribute('rel').then(value => value.includes('noopener') && value.includes('noreferrer'))) throw Error(`${path}: missing or unsafe community resource`);
            if (path.endsWith('experience')) {
              const url = p.url(), popupPromise = p.waitForEvent('popup');
              await link.click(); const popup = await popupPromise; await popup.waitForLoadState();
              if (popup.url() !== href) throw Error('Wrong community destination');
              await popup.close();
              if (p.url() !== url || !await scope.isVisible()) throw Error('Opening a community link closed the hall');
            }
          }
        }
        if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) || path.includes('detail=') && await scope.locator('.hallDialogBody,.dialogContent').evaluateAll(nodes => nodes.some(node => node.scrollWidth > node.clientWidth + 1))) throw Error(`${path}: horizontal overflow`);
        if (path.endsWith('history') || path.endsWith('experience')) await p.screenshot({ path: `output/playwright/career-${path.split('=').pop()}-${width}.png` });
      }
      await p.goto(origin + '/about');
      const internship = p.locator('.factRow').filter({ hasText: 'Internship' });
      if (!(await internship.innerText()).includes('2026年8月') || (await internship.innerText()).includes('現在')) throw Error('About still shows an ongoing internship');
      if (errors.length) throw Error(errors.join('\n'));
      results.push({ width, sharedCareerFacts: true, resourcesOpenSeparately: true, hallPreserved: true, errors });
    } finally { await context.close(); }
  }
  return results;
}
