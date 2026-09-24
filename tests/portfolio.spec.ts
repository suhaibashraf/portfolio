import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const route = (path: string) => `/portfolio${path}`;

const data = JSON.parse(readFileSync(new URL('../src/data/portfolio.json', import.meta.url), 'utf8'));
const removals = JSON.parse(readFileSync(new URL('../scripts/content-removals.json', import.meta.url), 'utf8'));
const projectCategories = (project: { category: string; additionalCategories?: string[] }) => [project.category, ...(project.additionalCategories ?? [])];

test('flocking shooter belongs to robotics and games with related links for each', async ({ page }) => {
  await page.goto(route('/'));
  for (const category of ['Robotics', 'Games']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    await expect(page.locator('.project-card:visible').filter({ hasText: 'Evolutionary Flocking Shooter' })).toHaveCount(1);
  }
  await page.goto(route('/evolutionary-flocking-shooter.html'));
  const robotics = page.getByRole('region', { name: 'Other Robotics Projects' });
  const games = page.getByRole('region', { name: 'Other Games Projects' });
  for (const slug of ['augmum', 'kenOB1', 'sidewalk-robot', 'fusion-fission-dynamics']) {
    await expect(robotics.locator(`a[href="/portfolio/${slug}.html"]`)).toHaveCount(1);
  }
  for (const slug of ['super-nim', 'snake-and-cake']) {
    await expect(games.locator(`a[href="/portfolio/${slug}.html"]`)).toHaveCount(1);
  }
  await expect(page.locator('.related-section a[href="/portfolio/evolutionary-flocking-shooter.html"]')).toHaveCount(0);
});

test('removed project links and confidential photos are not published', async ({ page, request }) => {
  for (const name of [...removals.images, ...removals.videos]) {
    expect((await request.get(route(`/images/${name}`))).status()).toBe(404);
  }
  for (const project of data.projects) {
    await page.goto(route(`/${project.slug}.html`));
    const links = await page.locator('a[href]').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    for (const href of removals.links) expect(links).not.toContain(href);
    if (removals.photoProjects.includes(project.slug)) {
      await expect(page.locator('.photo-link')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Photos', exact: true })).toHaveCount(0);
    }
    if (project.slug === 'sidewalk-robot') {
      await expect(page.locator('.project-banner img')).toHaveAttribute('src', route('/images/sw0.jpg'));
      await expect(page.locator('video')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Video Demo', exact: true })).toHaveCount(0);
    }
  }
});

test('home content and project filters work without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route('/'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(data.shortName);
  await expect(page.locator('.project-card:visible')).toHaveCount(data.projects.length);
  const categories = [...new Set<string>(data.projects.flatMap(projectCategories)), 'All'];
  for (const category of categories) {
    const count = category === 'All' ? data.projects.length : data.projects.filter((project: { category: string; additionalCategories?: string[] }) => projectCategories(project).includes(category)).length;
    const filter = page.getByRole('button', { name: category, exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.project-card:visible')).toHaveCount(count);
  }
  await expect(page.locator('#page-2 .resume-item')).toHaveCount(data.experience.length);
  await expect(page.locator('#page-1 .resume-item')).toHaveCount(data.education.length);
  await expect(page.locator('meter')).toHaveCount(data.skills.length);
  const location = data.details.find((item: { label: string }) => ['Address', 'Location'].includes(item.label));
  if (location) await expect(page.locator('.contact-grid')).toContainText(location.value);
  expect(errors).toEqual([]);
});

test('navigation works using a keyboard on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(route('/'));
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Resume', exact: true }).click();
  await expect(page).toHaveURL(/#resume-section$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('all content and navigation are available with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4333/portfolio/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.project-card')).toHaveCount(data.projects.length);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.getByRole('link', { name: /Augmum/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Augmum');
  await context.close();
});

for (const project of data.projects) {
  test(`${project.slug}: content, assets, home navigation and small-screen layout`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto(route(`/${project.slug}.html`));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title);
    for (const paragraph of project.paragraphs) {
      await expect(page.locator('.project-prose')).toContainText(paragraph);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    const photos = page.locator('.photo-link img');
    await expect(photos).toHaveCount(project.photos.filter((photo: { src: string }) => photo.src !== project.cover).length);
    const gallerySources = await photos.evaluateAll((items) => items.map((item) => item.getAttribute('src')));
    expect(gallerySources).not.toContain(route(project.cover));
    for (const photo of project.photos) {
      const asset = await page.request.get(route(photo.src));
      expect(asset.status()).toBe(200);
      expect(asset.headers()['content-type']).toMatch(/^image\//);
    }
    await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(route('/'));
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 375, 768, 1440]) {
  test(`home layout fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route('/'));
    await expect(page.locator('.hero')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `test-results/home-${width}.png` });
    if (width === 1440) await page.screenshot({ path: 'test-results/home-full.png', fullPage: true });
  });
}

for (const path of ['/', '/kenOB1.html']) {
  test(`${path} passes automated accessibility checks`, async ({ page }) => {
    await page.goto(route(path));
    // YouTube owns its player DOM; check our iframe labels separately.
    for (const frame of await page.locator('iframe').all()) {
      await expect(frame).toHaveAttribute('title', /.+ video demo/);
    }
    const result = await new AxeBuilder({ page }).exclude('iframe[src^="https://www.youtube.com/"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  });
}

test('CV, sitemap, old project URLs and 404 are served', async ({ request }) => {
  const cv = await request.get(route('/CVASHRAF.pdf'));
  expect(cv.status()).toBe(200);
  expect(cv.headers()['content-type']).toContain('application/pdf');
  expect((await request.get(route('/sitemap.xml'))).status()).toBe(200);
  for (const project of data.projects) {
    expect((await request.get(route(`/${project.slug}`))).status()).toBe(200);
  }
  expect((await request.get(route('/404.html'))).status()).toBe(200);
});


test('resume opens in a new tab and embeds the downloadable PDF', async ({ page, context, request }) => {
  await page.goto(route('/'));
  const popup = context.waitForEvent('page');
  await page.locator('.hero-actions').getByRole('link', { name: /Resume/ }).click();
  const resume = await popup;
  await resume.waitForLoadState('domcontentloaded');
  await expect(resume).toHaveURL(/\/portfolio\/resume\.html$/);
  await expect(resume.getByRole('heading', { level: 1 })).toHaveText('Resume');
  await expect(resume.locator('object')).toHaveAttribute('data', route(data.cv));
  await expect(resume.getByRole('link', { name: 'Download Resume' })).toHaveAttribute('href', route(data.cv));
  const pdf = await request.get(route(data.cv));
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await resume.close();
});

test('project covers load and numbered badges stay removed', async ({ page }) => {
  await page.goto(route('/'));
  await expect(page.locator('.project-number')).toHaveCount(0);
  for (const project of data.projects.filter((item: { cover: string }) => item.cover)) {
    const image = page.locator(`a[href="${route(`/${project.slug}.html`)}"] img`);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', route(project.cover));
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
});

test('reduced motion keeps content visible without entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route('/'));
  await expect(page.locator('.hero-copy')).toBeVisible();
  await expect(page.locator('.hero-visual')).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});
