import { expect, test } from '@playwright/test';

const jsonLdOn = async (page: import('@playwright/test').Page) => {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks.flatMap((raw) => {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    // The layout emits one @graph document; page-level blocks are plain.
    return list.flatMap((node) =>
      Array.isArray(node['@graph']) ? node['@graph'] : [node]
    );
  });
};

test.describe('SEO surfaces', () => {
  test('robots.txt allows the site and blocks internal routes', async ({
    request,
  }) => {
    const body = await (await request.get('/robots.txt')).text();

    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /preview/');
    expect(body).toContain('Disallow: /test');
    expect(body).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test('the sitemap is valid XML and excludes internal routes', async ({
    request,
  }) => {
    const body = await (await request.get('/sitemap.xml')).text();

    expect(body).toContain('<urlset');
    expect(body).not.toContain('/preview/');
    expect(body).not.toContain('/test<');
    expect(body).not.toContain('?category=');
    // Aliases 301 elsewhere and must not be advertised.
    expect(body).not.toContain('/components/odometer-counter');
  });

  test('llms.txt indexes every component with an install command', async ({
    request,
  }) => {
    const response = await request.get('/llms.txt');
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('# messy-ui');
    expect(body).toContain('npx shadcn@latest add');
    expect(body).toContain('hold-button');
  });

  test('a component page emits valid structured data', async ({ page }) => {
    await page.goto('/components/hold-button');
    const schemas = await jsonLdOn(page);

    expect(schemas.length).toBeGreaterThan(0);
    for (const schema of schemas) {
      expect(typeof schema['@type'], JSON.stringify(schema).slice(0, 120)).toBe(
        'string'
      );
    }

    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('SoftwareSourceCode');
    expect(types).toContain('BreadcrumbList');
  });

  test('a component page carries canonical, OG and Twitter tags', async ({
    page,
  }) => {
    await page.goto('/components/hold-button');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/components\/hold-button$/
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
  });

  test('every page has exactly one h1', async ({ page }) => {
    const paths = ['/', '/components', '/components/hold-button', '/timer'];
    // The default budget is sized for one navigation, and this test does one
    // per path. Scale it, or the test fails on arithmetic rather than on h1s.
    test.setTimeout(15_000 + paths.length * 15_000);

    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('h1'), `${path} h1 count`).toHaveCount(1);
    }
  });

  test('the homepage advertises its FAQ as structured data', async ({
    page,
  }) => {
    await page.goto('/');
    const types = (await jsonLdOn(page)).map((s) => s['@type']);
    expect(types).toContain('FAQPage');
  });
});
