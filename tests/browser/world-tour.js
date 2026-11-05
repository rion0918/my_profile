async page => {
  const origin = 'http://localhost:3001', results = [], errors = [];
  for (const [width, height, reducedMotion] of [[1440, 900, 'no-preference'], [390, 844, 'reduce']]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, isMobile: width < 760, hasTouch: width < 760, reducedMotion, timezoneId: 'Asia/Tokyo' });
    try {
      const p = await context.newPage(); await p.bringToFront();
      p.on('pageerror', error => errors.push(error.message));
      const raw = await (await p.request.get(origin)).text();
      if (!raw.includes('神戸電子専門学校') || !raw.includes('id="career"') || !raw.includes('href="/world"')) throw Error('Missing static portfolio before entering 3D');
      const worldHtml = await (await p.request.get(origin + '/world')).text();
      if (!worldHtml.includes('通常表示でプロフィールと作品を読む')) throw Error('Missing pre-hydration fallback');
      await p.goto(origin + '/world');
      await p.waitForFunction(() => document.querySelector('.welcomeTour')?.disabled === false);
      const historyLength = await p.evaluate(() => history.length);
      await p.getByRole('button', { name: '案内を見る', exact: true }).click();
      const reading = async title => {
        await p.waitForFunction(title => document.querySelector('.worldPage')?.dataset.tourPhase === 'reading' && document.querySelector('#detail-title')?.textContent === title, title);
        const footer = await p.locator('.tourFooter').boundingBox();
        if (footer.x < 0 || footer.x + footer.width > width || footer.y < 0 || footer.y + footer.height > height) throw Error('Clipped tour footer');
      };
      await reading('Background');
      if (!await p.getByRole('button', { name: '← 前へ', exact: true }).isDisabled()) throw Error('First previous is enabled');
      const position = () => p.evaluate(() => JSON.parse(sessionStorage.getItem('portfolio-position-v5')));
      const before = await position(); await p.keyboard.down('w'); await p.waitForTimeout(120); await p.keyboard.up('w');
      const after = await position(); if (before.x !== after.x || before.z !== after.z) throw Error('Movement during reading');
      await p.locator('.tourNext').click(); await reading('経験館');
      const titles = await p.locator('.hallActivity h3').allTextContents();
      if (!titles[0].includes('Sky') || !titles[1].includes('We部')) throw Error('Experience order changed');
      await p.getByRole('button', { name: '← 前へ', exact: true }).click(); await reading('Background');
      for (const title of ['経験館', 'Yoin館', 'ふわっと。館']) {
        await p.locator('.tourNext').click(); await reading(title);
        if (title !== '経験館') await p.locator('.hallGalleryMain img').waitFor();
      }
      await p.screenshot({ path: `output/playwright/tour-current-${width}.png` });
      if (await p.evaluate(() => history.length) !== historyLength + 1) throw Error('Tour floods history');
      await p.locator('.tourNext').click(); await p.locator('.worldPage[data-tour-phase="complete"]').waitFor();
      const finish = await position(); if (Math.hypot(finish.x, finish.z) > .01) throw Error('Tour did not finish at the central plaza');
      await p.locator('.tourCompleteFooter .tourNext').click(); await p.getByRole('dialog').waitFor({ state: 'hidden' });
      if (new URL(p.url()).searchParams.has('detail')) throw Error('Tour left a stale detail URL');

      // Exercise cancellation of a running camera move without late reopening.
      await p.locator('.worldGuide > summary').click(); await p.locator('.guideTour').click(); await reading('Background');
      if (reducedMotion !== 'reduce') {
        await p.locator('.tourNext').click();
        await p.getByRole('region', { name: '展示へ移動中' }).getByRole('button', { name: '案内を離れて探索', exact: true }).click();
        await p.waitForTimeout(850);
        if (await p.getByRole('dialog').isVisible() || await p.locator('.worldPage').getAttribute('data-tour-phase') !== 'exploring') throw Error('Late focus reopened the tour');
        if ((await position()).view.panned) throw Error('Cancelled tour detached the camera');
        await p.locator('.worldGuide > summary').click(); await p.locator('.guideTour').click(); await reading('Background');
      }
      await p.goBack(); await p.getByRole('dialog').waitFor({ state: 'hidden' });
      await p.waitForTimeout(800);
      if (await p.locator('.worldPage').getAttribute('data-tour-phase') !== 'exploring') throw Error('Back did not exit the tour');
      await p.goForward(); await p.getByRole('dialog', { name: 'Background', exact: true }).waitFor();
      if (await p.locator('.tourFooter').count()) throw Error('Forward restored stale tour progress');
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'hidden' });

      if (width < 760) {
        await p.getByLabel('画質・BGM設定').click(); await p.getByLabel('画質モード', { exact: true }).selectOption('low'); await p.getByLabel('画質・BGM設定').click();
        await p.locator('.worldGuide > summary').click();
        const started = await p.evaluate(() => performance.now()); await p.locator('.guideTour').click(); await reading('Background');
        if (await p.evaluate(() => performance.now()) - started > 650) throw Error('Reduced motion waited for camera animation');
        for (const title of ['経験館', 'Yoin館', 'ふわっと。館']) { await p.locator('.tourNext').click(); await reading(title); }
        await p.locator('.tourNext').click(); await p.locator('.worldPage[data-tour-phase="complete"]').waitFor();
        const lowFinish = await position(); if (Math.hypot(lowFinish.x, lowFinish.z) > .01) throw Error('Low quality changes the tour destination');
      }
      await p.goto(origin + '/?detail=yoin'); await p.getByRole('dialog', { name: 'Yoin館', exact: true }).waitFor();
      if (await p.locator('.tourFooter').count()) throw Error('Direct URL restored stale tour progress');
      for (const route of ['/profile', '/about', '/career', '/projects/yoin', '/projects/pop-reminder', '/tech', '/social']) {
        const response = await p.goto(origin + route);
        if (response.status() !== 200 || await p.locator('h1').count() !== 1) throw Error('Article unavailable: ' + route);
      }
      results.push({ width, fourStops: true, previous: true, history: true, readingPauses: true, cancellation: reducedMotion !== 'reduce', backForward: true, directUrls: true, staticFallback: true, lowQualityTour: width < 760, reducedMotionInstant: width < 760 });
    } finally { await context.close(); }
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { results, errors };
}
