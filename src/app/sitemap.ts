import { MetadataRoute } from 'next';
import { components, categories } from '@/config/components';
import { curatedTimers } from '@/config/timers';
import { curatedPdfTools } from '@/config/pdf';
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
 * - 0.7: Category landing pages, standalone tools
 * - 0.6: Individual timer presets
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
    {
      url: absoluteUrl('/timer'),
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/pdf'),
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
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

  // Only curated timer presets are listed. Slugs that merely resolve to a
  // working countdown (/timer/17-minute-timer) are noindex, so they stay out.
  const timerPages: MetadataRoute.Sitemap = curatedTimers.map((timer) => ({
    url: absoluteUrl(`/timer/${timer.slug}`),
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Same rule as the timers: unrecognised /pdf/* slugs open a working editor
  // but are noindex, so only the curated tools appear here.
  const kitPage: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/pdf/kit'),
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  const pdfToolPages: MetadataRoute.Sitemap = curatedPdfTools.map((tool) => ({
    url: absoluteUrl(`/pdf/${tool.slug}`),
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...componentPages,
    ...categoryPages,
    ...timerPages,
    ...pdfToolPages,
    ...kitPage,
  ];
}
