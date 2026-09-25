import { describe, expect, it } from 'vitest';
import { categories, components } from '@/config/components';
import {
  absoluteUrl,
  breadcrumbSchema,
  categoryDescription,
  collectionSchema,
  componentSchema,
  faqSchema,
  getCategoryBySlug,
  pageMetadata,
  personSchema,
  siteConfig,
  toCategorySlug,
  websiteSchema,
} from '@/lib/seo';

describe('absoluteUrl', () => {
  it('resolves a root-relative path onto the canonical domain', () => {
    expect(absoluteUrl('/components')).toBe(`${siteConfig.url}/components`);
  });

  it('defaults to the site root', () => {
    expect(absoluteUrl()).toBe(`${siteConfig.url}/`);
  });

  it('never produces a double slash', () => {
    expect(absoluteUrl('/')).not.toMatch(/[^:]\/\//);
    expect(absoluteUrl('/components/tabs')).not.toMatch(/[^:]\/\//);
  });
});

describe('getCategoryBySlug', () => {
  it('round-trips every real category', () => {
    for (const category of categories) {
      expect(getCategoryBySlug(toCategorySlug(category))).toBe(category);
    }
  });

  it('accepts a non-canonical spelling so the page can redirect it', () => {
    const category = categories[0];
    expect(getCategoryBySlug(category)).toBe(category);
    expect(getCategoryBySlug(category.toUpperCase())).toBe(category);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getCategoryBySlug('not-a-category')).toBeUndefined();
  });

  it('never throws on malformed percent-encoding', () => {
    // /components/category/%25 arrives here as a bare "%".
    for (const slug of ['%', '%zz', '%E0%A4%A']) {
      expect(() => getCategoryBySlug(slug), slug).not.toThrow();
    }
  });
});

describe('categoryDescription', () => {
  it('counts the components in the category', () => {
    for (const category of categories) {
      const count = components.filter((c) => c.category === category).length;
      expect(categoryDescription(category)).toContain(`${count} free React`);
    }
  });

  it('agrees in number with the count', () => {
    const singular = categories.find(
      (c) => components.filter((x) => x.category === c).length === 1
    );
    if (singular) {
      expect(categoryDescription(singular)).toContain('1 free React component');
      expect(categoryDescription(singular)).not.toContain('components in the');
    }
  });
});

describe('structured data', () => {
  const isJsonLd = (schema: Record<string, unknown>) => {
    expect(schema['@context']).toBe('https://schema.org');
    expect(typeof schema['@type']).toBe('string');
  };

  it('emits a valid WebSite schema anchored by @id', () => {
    const schema = websiteSchema();
    isJsonLd(schema);
    expect(schema['@id']).toBe(`${siteConfig.url}/#website`);
    expect(schema.publisher).toEqual({ '@id': `${siteConfig.url}/#person` });
  });

  it('emits a Person schema the website can reference', () => {
    const schema = personSchema();
    isJsonLd(schema);
    // The publisher @id on the website must resolve to this node.
    expect(schema['@id']).toBe(websiteSchema().publisher!['@id' as never]);
  });

  it('numbers breadcrumb positions from 1 and absolutises paths', () => {
    const schema = breadcrumbSchema([
      { name: 'Components', path: '/components' },
      { name: 'Tabs', path: '/components/tabs' },
    ]);
    isJsonLd(schema);

    const items = schema.itemListElement as Record<string, unknown>[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toBe(`${siteConfig.url}/components/tabs`);
  });

  it('describes every real component as SoftwareSourceCode', () => {
    for (const component of components) {
      const schema = componentSchema(component);
      isJsonLd(schema);
      expect(schema['@type']).toBe('SoftwareSourceCode');
      expect(schema.url).toBe(`${siteConfig.url}/components/${component.slug}`);
      expect(schema.name).toBe(component.name);
      // softwareRequirements is only present when there are dependencies.
      expect('softwareRequirements' in schema).toBe(
        component.dependencies.length > 0
      );
    }
  });

  it('builds a CollectionPage whose count matches its items', () => {
    const schema = collectionSchema({
      name: 'All',
      description: 'everything',
      path: '/components',
      items: components,
    });
    isJsonLd(schema);

    const list = schema.mainEntity as Record<string, unknown>;
    expect(list.numberOfItems).toBe(components.length);
    expect((list.itemListElement as unknown[]).length).toBe(components.length);
  });

  it('strips rich-link syntax out of collection descriptions', () => {
    const schema = collectionSchema({
      name: 'x',
      description: 'y',
      path: '/components',
      items: components,
    });
    const list = schema.mainEntity as Record<string, unknown>;
    for (const entry of list.itemListElement as Record<string, unknown>[]) {
      expect(entry.description).not.toMatch(/\[\[|\]\(/);
    }
  });

  it('shapes FAQ entries as Question/Answer pairs', () => {
    const schema = faqSchema([{ question: 'q?', answer: 'a.' }]);
    isJsonLd(schema);
    expect(schema.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'q?',
        acceptedAnswer: { '@type': 'Answer', text: 'a.' },
      },
    ]);
  });
});

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Tabs',
    description: 'A tabs component.',
    path: '/components/tabs',
    keywords: ['tabs'],
  });

  it('keeps the canonical relative and the OG url absolute', () => {
    expect(meta.alternates?.canonical).toBe('/components/tabs');
    expect(meta.openGraph?.url).toBe(`${siteConfig.url}/components/tabs`);
  });

  it('derives OG and Twitter from the same title and description', () => {
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.twitter?.title).toBe(meta.title);
    expect(meta.openGraph?.description).toBe(meta.description);
    expect(meta.twitter?.description).toBe(meta.description);
  });

  it('defaults to the site card at 1200x630', () => {
    expect(meta.openGraph?.images).toEqual([
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'Tabs',
      },
    ]);
  });

  it('omits keywords entirely when none are given', () => {
    const bare = pageMetadata({
      title: 't',
      description: 'd',
      path: '/',
    });
    expect(bare.keywords).toBeUndefined();
  });

  it('uses a large summary card', () => {
    // Next's Twitter metadata type is a union; `card` narrows it.
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe(
      'summary_large_image'
    );
  });
});
