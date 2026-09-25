import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  categories,
  components,
  getAllSlugsAndAliases,
  getComponentBySlug,
  getComponentBySlugOrAlias,
  getComponentsByCategory,
} from '@/config/components';
import { parseDefaultValue } from '@/components/docs/interactive-props-playground/utils';
import { toCategorySlug } from '@/lib/category';

const ROOT = process.cwd();
const cases = components.map((c) => [c.slug, c] as const);

describe('slug and alias uniqueness', () => {
  it('has no duplicate slugs', () => {
    const slugs = components.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never reuses an alias across components', () => {
    const aliases = components.flatMap((c) => c.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('never uses a real slug as an alias', () => {
    const slugs = new Set(components.map((c) => c.slug));
    for (const component of components) {
      for (const alias of component.aliases) {
        expect(
          slugs.has(alias),
          `"${alias}" is an alias of ${component.slug} but also a real slug`
        ).toBe(false);
      }
    }
  });

  it('returns every slug and alias exactly once from getAllSlugsAndAliases', () => {
    const all = getAllSlugsAndAliases();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(
      components.length + components.flatMap((c) => c.aliases).length
    );
  });
});

describe('lookup helpers', () => {
  it.each(cases)('resolves %s by its own slug', (slug, component) => {
    expect(getComponentBySlug(slug)).toBe(component);
    expect(getComponentBySlugOrAlias(slug)).toBe(component);
  });

  it('resolves every alias to its component', () => {
    for (const component of components) {
      for (const alias of component.aliases) {
        expect(getComponentBySlugOrAlias(alias)).toBe(component);
      }
    }
  });

  it('returns undefined for an unknown slug', () => {
    expect(getComponentBySlug('nope')).toBeUndefined();
    expect(getComponentBySlugOrAlias('nope')).toBeUndefined();
  });

  it('partitions every component into exactly one category bucket', () => {
    const seen = categories.flatMap((c) => getComponentsByCategory(c));
    expect(seen).toHaveLength(components.length);
    expect(new Set(seen.map((c) => c.slug)).size).toBe(components.length);
  });

  it('derives categories from the components themselves, with no duplicates', () => {
    expect(new Set(categories).size).toBe(categories.length);
    for (const component of components) {
      expect(categories).toContain(component.category);
    }
  });

  it('gives every category a URL-safe, unique slug', () => {
    const slugs = categories.map(toCategorySlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});

describe('SEO metadata invariants', () => {
  it.each(cases)('%s carries the copy every page needs', (slug, component) => {
    expect(component.name, slug).toBeTruthy();
    expect(component.description, slug).toBeTruthy();
    expect(component.seoTitle, slug).toBeTruthy();
    expect(component.seoDescription, slug).toBeTruthy();
    expect(component.keywords.length, slug).toBeGreaterThan(0);
  });

  it.each(cases)(
    '%s keeps its meta description under the 160 char cutoff',
    (slug, component) => {
      // Google truncates past ~160 characters, so anything longer is wasted.
      expect(component.seoDescription.length, slug).toBeLessThanOrEqual(160);
    }
  );

  it.each(cases)('%s declares a valid sandbox mode', (slug, component) => {
    expect(['inline', 'iframe']).toContain(component.sandbox);
  });

  it.each(cases)(
    '%s has a thumbnail that exists, if local',
    (slug, component) => {
      const urls =
        typeof component.thumbnailUrl === 'string'
          ? [component.thumbnailUrl]
          : component.thumbnailUrl
            ? [component.thumbnailUrl.light, component.thumbnailUrl.dark]
            : [];

      for (const url of urls) {
        if (!url.startsWith('/')) continue;
        expect(
          fs.existsSync(path.join(ROOT, 'public', url)),
          `${slug}: thumbnail ${url} is missing from public/`
        ).toBe(true);
      }
    }
  );
});

describe('prop definitions', () => {
  it.each(cases)('%s prop defaults all parse', (slug, component) => {
    for (const prop of component.props) {
      if (prop.type.includes('=>')) continue;
      expect(
        () => parseDefaultValue(prop.default, prop.type),
        `${slug}.${prop.name}`
      ).not.toThrow();
    }
  });

  it.each(cases)('%s has no duplicate prop names', (slug, component) => {
    const names = component.props.map((p) => p.name);
    expect(new Set(names).size, slug).toBe(names.length);
  });

  it.each(cases)('%s describes every prop', (slug, component) => {
    for (const prop of component.props) {
      expect(prop.description, `${slug}.${prop.name}`).toBeTruthy();
      expect(prop.type, `${slug}.${prop.name}`).toBeTruthy();
    }
  });

  it.each(cases)('%s gives every select control options', (slug, component) => {
    for (const prop of component.props) {
      if (prop.control !== 'select' && prop.control !== 'select-custom') {
        continue;
      }
      expect(
        prop.options?.length,
        `${slug}.${prop.name} is a ${prop.control} with no options`
      ).toBeGreaterThan(0);
    }
  });

  it.each(cases)(
    '%s select options include the declared default',
    (slug, component) => {
      for (const prop of component.props) {
        // select-custom accepts free text, so its default need not be listed.
        if (prop.control !== 'select' || !prop.options) continue;
        const parsed = parseDefaultValue(prop.default, prop.type);
        expect(
          (prop.options as unknown[]).map(String),
          `${slug}.${prop.name} default "${parsed}" is not among its options`
        ).toContain(String(parsed));
      }
    }
  );

  it.each(cases)('%s slider bounds are coherent', (slug, component) => {
    for (const prop of component.props) {
      if (prop.control !== 'slider') continue;
      const label = `${slug}.${prop.name}`;
      expect(prop.min, label).toBeTypeOf('number');
      expect(prop.max, label).toBeTypeOf('number');
      expect(prop.max!, label).toBeGreaterThan(prop.min!);

      const value = parseDefaultValue(prop.default, prop.type) as number;
      expect(value, `${label} default is below min`).toBeGreaterThanOrEqual(
        prop.min!
      );
      expect(value, `${label} default is above max`).toBeLessThanOrEqual(
        prop.max!
      );
    }
  });
});

describe('next.config.ts redirects', () => {
  const source = fs.readFileSync(path.join(ROOT, 'next.config.ts'), 'utf-8');
  const componentRedirects = [
    ...source.matchAll(
      /source:\s*'\/components\/([a-z0-9-]+)',\s*destination:\s*'\/components\/([a-z0-9-]+)'/g
    ),
  ];

  it('points every component redirect at a real slug', () => {
    for (const [, from, to] of componentRedirects) {
      expect(
        getComponentBySlug(to),
        `redirect ${from} -> ${to} targets a component that does not exist`
      ).toBeDefined();
    }
  });

  it('only redirects sources that are declared aliases', () => {
    for (const [, from, to] of componentRedirects) {
      const target = getComponentBySlug(to);
      expect(
        target?.aliases,
        `${from} redirects to ${to} but is not listed in its aliases`
      ).toContain(from);
    }
  });
});
