import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { categories, getComponentsByCategory } from '@/config/components';
import JsonLd from '@/components/seo/json-ld';
import {
  pageMetadata,
  breadcrumbSchema,
  collectionSchema,
  categoryDescription,
  categoryPath,
  getCategoryBySlug,
  toCategorySlug,
  siteConfig,
} from '@/lib/seo';
import Gallery from '../../gallery-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Category landing pages exist so each category is a real, indexable URL with
 * its own title, description and copy. The old `/components?category=X` filter
 * rendered identical HTML for every category, so search engines saw one page.
 */
export async function generateStaticParams() {
  return categories.map((category) => ({ slug: toCategorySlug(category) }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found', robots: { index: false } };
  }

  const items = getComponentsByCategory(category);

  return pageMetadata({
    title: `${category} - Animated React Components | messy-ui`,
    description: categoryDescription(category),
    path: categoryPath(category),
    keywords: [
      `react ${category.toLowerCase()}`,
      `animated react ${category.toLowerCase()}`,
      `${category.toLowerCase()} component library`,
      ...items.flatMap((component) => component.keywords.slice(0, 3)),
      ...siteConfig.keywords,
    ],
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  // Anything that is not the canonical slug (e.g. the legacy "Animations"
  // capitalisation from ?category= links) redirects to the canonical URL.
  if (slug !== toCategorySlug(category)) {
    redirect(categoryPath(category));
  }

  const items = getComponentsByCategory(category);
  const description = categoryDescription(category);

  return (
    <>
      <JsonLd
        schema={[
          collectionSchema({
            name: `${category} Components`,
            description,
            path: categoryPath(category),
            items,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Components', path: '/components' },
            { name: category, path: categoryPath(category) },
          ]),
        ]}
      />
      <Gallery
        items={items}
        heading={category}
        description={description}
        backLink={{ label: 'All Components', href: '/components' }}
      />
    </>
  );
}
