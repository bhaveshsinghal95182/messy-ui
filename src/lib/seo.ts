import type { Metadata } from 'next';
import { components, categories } from '@/config/components';
import type { ComponentConfig } from '@/config/types';
import { toCategorySlug } from './category';
import { plainText } from './text';

/**
 * Single source of truth for site-wide SEO values.
 * Anything that appears in metadata, structured data, robots.txt,
 * the sitemap or llms.txt should read from here.
 */
export const siteConfig = {
  name: 'messy-ui',
  url: 'https://messyui.dev',
  title:
    'messy-ui - Beautiful React Components powered by Framer Motion and GSAP',
  shortTitle: 'messy-ui',
  description:
    'A collection of animated, accessible React components built with GSAP and Framer Motion for teams that value performance and accessibility.',
  ogImage: '/og-image.png',
  author: {
    name: 'Bhavesh Singhal',
    url: 'https://github.com/bhaveshsinghal95182',
  },
  repository: 'https://github.com/bhaveshsinghal95182/messy-ui',
  twitter: '@descentkatil_',
  /** Keywords that describe the whole site, not a single component. */
  keywords: [
    'react components',
    'animated react components',
    'gsap react components',
    'framer motion components',
    'motion react components',
    'shadcn registry',
    'tailwind components',
    'copy paste react components',
    'react component library',
    'messy-ui',
  ],
} as const;

/** Turns a relative path into an absolute URL on the canonical domain. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, siteConfig.url).toString();
}

/* -------------------------------------------------------------------------- */
/*                                 Categories                                  */
/* -------------------------------------------------------------------------- */

export { toCategorySlug, categoryPath } from './category';

/**
 * Resolves a URL slug back to the category name used in component metadata.
 * Input is normalised first, so "Form Controls" and "form-controls" both
 * resolve - the page then redirects anything non-canonical to the real slug.
 */
export function getCategoryBySlug(slug: string): string | undefined {
  const normalised = toCategorySlug(decodeURIComponent(slug));
  return categories.find((category) => toCategorySlug(category) === normalised);
}

/**
 * Human-readable blurb for a category landing page. Falls back to a generated
 * sentence so a new category never ships with an empty description.
 */
export function categoryDescription(category: string): string {
  const count = components.filter((c) => c.category === category).length;
  const plural = count === 1 ? 'component' : 'components';

  // Phrased so it stays grammatical whether the category name is singular
  // ("Layout") or already plural ("Buttons").
  return `${count} free React ${plural} in the ${category} category, animated with GSAP and Framer Motion. Copy the source or install with the shadcn CLI.`;
}

/* -------------------------------------------------------------------------- */
/*                              Structured data                                */
/* -------------------------------------------------------------------------- */

type JsonLdObject = Record<string, unknown>;

/** Identity of the site itself, referenced by @id from other schemas. */
export function websiteSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: 'messy ui',
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: 'en',
    publisher: { '@id': `${siteConfig.url}/#person` },
  };
}

/** The author, used as publisher/creator across the site. */
export function personSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteConfig.url}/#person`,
    name: siteConfig.author.name,
    url: siteConfig.author.url,
    sameAs: [
      siteConfig.author.url,
      siteConfig.repository,
      `https://x.com/${siteConfig.twitter.replace('@', '')}`,
    ],
  };
}

/**
 * Breadcrumbs let Google render the "Components › Animations › Counter"
 * trail instead of a bare URL in the result.
 */
export function breadcrumbSchema(
  items: { name: string; path: string }[]
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Describes a single component page as installable source code. */
export function componentSchema(component: ComponentConfig): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: component.name,
    description: component.seoDescription,
    url: absoluteUrl(`/components/${component.slug}`),
    codeRepository: siteConfig.repository,
    programmingLanguage: ['TypeScript', 'TSX'],
    runtimePlatform: 'React',
    keywords: component.keywords.join(', '),
    // Add `license` here once the repo has a LICENSE file - asserting a
    // licence in structured data that the repo does not actually carry would
    // be a claim the project cannot back.
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    author: { '@id': `${siteConfig.url}/#person` },
    image: absoluteUrl(`/components/${component.slug}/opengraph-image`),
    ...(component.dependencies.length > 0 && {
      softwareRequirements: component.dependencies.join(', '),
    }),
  };
}

/** Describes a gallery/category page and the components it lists. */
export function collectionSchema({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: ComponentConfig[];
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((component, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: component.name,
        description: plainText(component.description),
        url: absoluteUrl(`/components/${component.slug}`),
      })),
    },
  };
}

export function faqSchema(
  entries: { question: string; answer: string }[]
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Metadata factory                                */
/* -------------------------------------------------------------------------- */

interface PageMetadataInput {
  title: string;
  description: string;
  /** Canonical path, e.g. "/components". */
  path: string;
  keywords?: readonly string[];
  /** Absolute or root-relative OG image. Defaults to the site card. */
  image?: string;
  type?: 'website' | 'article';
}

/**
 * Builds a complete, consistent metadata object for a page: canonical URL,
 * Open Graph and Twitter card all derived from the same values so they can
 * never drift apart.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  image = siteConfig.ogImage,
  type = 'website',
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      type,
      url,
      siteName: siteConfig.name,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: siteConfig.twitter,
      site: siteConfig.twitter,
    },
  };
}
