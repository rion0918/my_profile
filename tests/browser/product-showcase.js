async page => {
  const origin = 'http://localhost:3001';
  const products = [
    { slug: 'pop-reminder', name: 'ふわっと。', destination: 'https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja' },
    { slug: 'idea-boost', name: 'Idea Boost', destination: 'https://ideaboost.dev/' },
  ];
  const checks = [];
  const checkImages = async images => {
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      const ok = await image.evaluate(async element => {
        await element.decode();
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.right <= innerWidth + 1 &&
          Math.abs(rect.width / rect.height - element.naturalWidth / element.naturalHeight) < .015;
      });
      if (!ok) throw Error('Product screenshot is distorted or outside the viewport');
    }
  };
  for (const width of [390, 1440]) {
    const context = await page.context().browser().newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      const p = await context.newPage();
      for (const product of products) {
        await p.goto(origin + '/profile#products');
        const articles = p.locator('#products article');
        if (await articles.count() !== 2) throw Error('Expected two products');
        const article = articles.filter({ has: p.getByRole('heading', { name: product.name, exact: true }) });
        const primary = article.locator('.productPrimary');
        if (await primary.getAttribute('href') !== product.destination) throw Error('Wrong primary link');
        await checkImages(article.locator('img'));
        await article.getByRole('link', { name: product.name + 'の作品詳細' }).click();
        await p.waitForURL(origin + '/projects/' + product.slug);
        if (await p.locator('.productPrimary').getAttribute('href') !== product.destination) throw Error('Wrong article destination');
        await checkImages(p.locator('.productScreen img'));
        if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
        await p.goto(origin + '/world?detail=' + product.slug);
        const hall = p.getByRole('dialog', { name: product.name + '館', exact: true });
        await hall.waitFor();
        if (await hall.locator('.hallProductHeroActions .hallAction').getAttribute('href') !== product.destination) throw Error('Wrong exhibit destination');
        await hall.getByRole('button', { name: /2枚目を表示/ }).click();
        await hall.locator('.hallGalleryMain img').evaluate(image => image.decode());
        checks.push({ width, product: product.name });
      }
      if ((await p.goto(origin + '/projects/yoin')).status() !== 404) throw Error('Old project still published');
    } finally {
      await context.close();
    }
  }
  return checks;
}
