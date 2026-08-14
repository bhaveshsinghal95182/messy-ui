import type { Metadata } from 'next';
import { components, categories } from '@/config/components';
import JsonLd from '@/components/seo/json-ld';
import {
  pageMetadata,
  breadcrumbSchema,
  collectionSchema,
  categoryPath,
  siteConfig,
} from '@/lib/seo';
import Gallery from './gallery-client';

const title = `React Component Gallery - ${components.length} Animated Components | messy-ui`;
const description = `Browse ${components.length} free, copy-paste React components animated with GSAP and Framer Motion. Counters, buttons, menus, tabs and more - install with the shadcn CLI or copy the source.`;

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/components',
  keywords: [
    'react component gallery',
    'animated react components',
    'gsap components',
    'framer motion components',
    'shadcn components',
    'free react components',
    ...siteConfig.keywords,
  ],
});

export default function ComponentsPage() {
  return (
    <>
      <JsonLd
        schema={[
          collectionSchema({
            name: 'Component Gallery',
            description,
            path: '/components',
            items: components,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Components', path: '/components' },
          ]),
        ]}
      />
      <Gallery
        items={components}
        heading="Component Gallery"
        description="Beautifully crafted, animated React components ready to enhance your next project. Built with GSAP, Framer Motion, and modern best practices."
        badge={`${components.length} Components Available`}
        categoryLinks={categories.map((category) => ({
          name: category,
          href: categoryPath(category),
        }))}
      />
    </>
  );
}
