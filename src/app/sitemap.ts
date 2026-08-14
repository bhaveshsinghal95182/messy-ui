import { MetadataRoute } from 'next';
import { components, categories } from '@/config/components';
import { absoluteUrl, categoryPath, siteConfig } from '@/lib/seo';

/**
 * Generates the sitemap.
 *
 * Only canonical, indexable URLs belong here. Deliberately excluded:
 * - Component aliases (/components/odometer-counter): they 301 to the
 *   canonical slug, and listing redirects wastes crawl budget.
 * - ?category= query URLs: the filter is client-side, so those URLs render
 *   the same HTML as /components. The real category landing pages under
 *   /components/category/* are listed instead.
 * - /preview/* and /test: blocked in robots.txt.
 *
 * Priority guidelines:
 * - 1.0: Homepage
 * - 0.9: Components gallery
 * - 0.8: Individual component pages
 * - 0.7: Category landing pages
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      // No trailing slash, so it matches the canonical tag exactly.
      url: siteConfig.url,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: absoluteUrl('/components'),
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const componentPages: MetadataRoute.Sitemap = components.map((component) => ({
    url: absoluteUrl(`/components/${component.slug}`),
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(categoryPath(category)),
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...componentPages, ...categoryPages];
}
