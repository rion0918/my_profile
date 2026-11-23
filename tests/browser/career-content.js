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
      for (const path of ['/career', '/activities', '/profile', '/?detail=career', '/?detail=activities', '/?detail=history', '/?detail=experience']) {
        await p.goto(origin + path);
        if (path.includes('detail=')) await p.locator('dialog[open] #detail-title').filter({ hasText: /.+/ }).waitFor();
        const isProfile = path === '/profile';
        if (isProfile) {
          if (await p.locator('#tech').count()) throw Error('Tech Stack section still exists on /profile');
        }
        const careerScope = isProfile ? p.locator('#career') : (!path.includes('activities') && !path.includes('experience')) ? (path.includes('detail=') ? p.locator('dialog[open]') : p.locator('main')) : null;
        if (await p.locator('.careerItem .miniTags,.activityItem .miniTags,.hallActivityTags').count()) throw Error(path + ': redundant tags');
        if (careerScope) {
          const text = await careerScope.innerText();
          for (const fact of ['2019 - 2022', '上宮高等学校', '2023 - 2027', '神戸電子専門学校', 'Sky株式会社', '2025.03 - 2026.08', 'Webエンジニアとして内定']) {
            if (!text.includes(fact)) throw Error(`${path}: missing career fact ${fact}`);
          }
          if (text.includes('Webフロントエンドエンジニア')) throw Error(`${path}: outdated offer title`);
          if (text.includes('We部')) throw Error(`${path}: activity mixed into career`);
          const internship = careerScope.locator('.careerItem,.hallCareerCard').filter({ hasText: 'Sky株式会社' });
          if ((await internship.innerText()).includes('現在')) throw Error(`${path}: incorrect internship dates`);
        }
        const activitiesScope = isProfile ? p.locator('#activities') : (path.includes('activities') || path.includes('experience')) ? (path.includes('detail=') ? p.locator('dialog[open]') : p.locator('main')) : null;
        if (activitiesScope) {
          const text = await activitiesScope.innerText();
          if (text.includes('Sky株式会社')) throw Error(`${path}: career mixed into activities`);
          const event = activitiesScope.locator('.activityItem,.hallActivity').filter({ hasText: 'KOBE STUDENT HACK 2027' });
          if (!(await event.innerText()).includes('開催準備中') || await event.getByRole('link').getAttribute('href') !== 'https://ksh2027.web-u.dev/') throw Error(path + ': missing current event');
          const community = activitiesScope.locator('.activityItem,.hallActivity').filter({ hasText: 'Webu（We部）' });
          for (const href of destinations) {
            const link = community.locator(`a[href="${href}"]`);
            if (await link.count() !== 1 || await link.getAttribute('target') !== '_blank' || !await link.getAttribute('rel').then(value => value.includes('noopener') && value.includes('noreferrer'))) throw Error(`${path}: missing or unsafe community resource`);
            if (path.endsWith('experience')) {
              const url = p.url(), popupPromise = p.waitForEvent('popup');
              await link.click(); const popup = await popupPromise; await popup.waitForLoadState();
              if (popup.url() !== href) throw Error('Wrong community destination');
              await popup.close();
              if (p.url() !== url || !await activitiesScope.isVisible()) throw Error('Opening a community link closed the hall');
            }
          }
        }
        if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) || path.includes('detail=') && await p.locator('dialog[open] .hallDialogBody, dialog[open] .dialogContent').evaluateAll(nodes => nodes.some(node => node.scrollWidth > node.clientWidth + 1))) throw Error(`${path}: horizontal overflow`);
        if (path.endsWith('history') || path.endsWith('experience')) await p.screenshot({ path: `output/playwright/career-${path.split('=').pop()}-${width}.png` });
      }
      await p.goto(origin + '/about');
      const internship = p.locator('.factRow').filter({ hasText: 'Internship' });
      if (!(await internship.innerText()).includes('2026年8月') || (await internship.innerText()).includes('現在')) throw Error('About still shows an ongoing internship');
      if (errors.length) throw Error(errors.join('\n'));
      results.push({ width, separatedCareerAndActivities: true, techRemoved: true, resourcesOpenSeparately: true, hallPreserved: true, errors });
    } finally { await context.close(); }
  }
  return results;
}
