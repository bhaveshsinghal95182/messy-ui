import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { components, categories } from '@/config/components';
import { curatedTimers } from '@/config/timers';
import { absoluteUrl, categoryPath, siteConfig } from '@/lib/seo';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { GET } from '@/app/llms.txt/route';

describe('robots.txt', () => {
  const result = robots();

  it('allows the site and blocks only the internal routes', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(['/preview/', '/test']);
  });

  it('advertises the sitemap and canonical host', () => {
    expect(result.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
    expect(result.host).toBe(siteConfig.url);
  });
});

describe('sitemap.xml', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const urls = () => sitemap().map((entry) => entry.url);

  it('lists the home, gallery and timer landing pages', () => {
    expect(urls()).toEqual(
      expect.arrayContaining([
        siteConfig.url,
        absoluteUrl('/components'),
        absoluteUrl('/timer'),
      ])
    );
  });

  it('lists every component by its canonical slug', () => {
    const listed = urls();
    for (const component of components) {
      expect(listed).toContain(absoluteUrl(`/components/${component.slug}`));
    }
  });

  it('never lists an alias', () => {
    const listed = urls();
    for (const component of components) {
      for (const alias of component.aliases) {
        expect(listed).not.toContain(absoluteUrl(`/components/${alias}`));
      }
    }
  });

  it('lists every category landing page', () => {
    const listed = urls();
    for (const category of categories) {
      expect(listed).toContain(absoluteUrl(categoryPath(category)));
    }
  });

  it('lists only curated timers', () => {
    const listed = urls();
    for (const timer of curatedTimers) {
      expect(listed).toContain(absoluteUrl(`/timer/${timer.slug}`));
    }
    expect(listed).not.toContain(absoluteUrl('/timer/17-minute-timer'));
  });

  it('excludes internal routes and query-filter URLs', () => {
    for (const url of urls()) {
      expect(url).not.toContain('/preview/');
      expect(url).not.toContain('/test');
      expect(url).not.toContain('?category=');
    }
  });

  it('emits no duplicate URLs', () => {
    const listed = urls();
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('gives the homepage the highest priority', () => {
    const home = sitemap().find((entry) => entry.url === siteConfig.url);
    expect(home?.priority).toBe(1);
  });

  it('keeps every priority within the valid range', () => {
    for (const entry of sitemap()) {
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it('stamps every entry with a lastModified date', () => {
    for (const entry of sitemap()) {
      expect(entry.lastModified).toBeDefined();
    }
  });
});

describe('llms.txt', () => {
  it('serves plain text with a cache header', async () => {
    const response = GET();
    expect(response.headers.get('Content-Type')).toMatch(/text\/plain/);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage');
  });

  it('lists every component', async () => {
    const body = await GET().text();
    for (const component of components) {
      expect(body, `missing ${component.slug}`).toContain(component.slug);
    }
  });

  it('lists every category', async () => {
    const body = await GET().text();
    for (const category of categories) {
      expect(body).toContain(category);
    }
  });

  it('strips rich-link markup out of the descriptions', async () => {
    // The site links themselves are markdown on purpose - that is the
    // llms.txt format. It is the component descriptions, which pass through
    // plainText, that must not leak [[wiki]] or [md](link) syntax.
    const body = await GET().text();
    const descriptionLines = (text: string) =>
      text.split('\n').filter((line) => line.startsWith('- Description:'));
    // The ## Tools section after the components carries its own descriptions.
    const [componentSection] = body.split('\n## Tools\n');
    const descriptions = descriptionLines(body);

    expect(descriptionLines(componentSection)).toHaveLength(components.length);
    for (const line of descriptions) {
      expect(line).not.toMatch(/\[\[/);
      expect(line).not.toMatch(/\]\(/);
    }
  });

  it('gives every component an install command pointing at its registry JSON', async () => {
    const body = await GET().text();
    for (const component of components) {
      expect(body).toContain(
        `- Install: npx shadcn@latest add ${component.registryUrl}`
      );
    }
  });
});
