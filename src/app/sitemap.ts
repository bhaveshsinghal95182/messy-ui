import { MetadataRoute } from 'next';
import { components, categories } from '@/config/components';

/**
 * Generates a comprehensive sitemap for maximum SEO optimization.
 *
 * Priority Guidelines:
 * - 1.0: Homepage (most important)
 * - 0.9: Main section pages (components gallery)
 * - 0.8: Individual component pages
 * - 0.7: Category filtered pages
 *
 * Change Frequency:
 * - Homepage & Gallery: weekly (content may be updated regularly)
 * - Component pages: monthly (more stable content)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://messyui.dev';
  const currentDate = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/components`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Individual component pages - high priority for SEO
  const componentPages: MetadataRoute.Sitemap = components.map((component) => ({
    url: `${baseUrl}/components/${component.slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Component alias pages - redirect support for alternative names
  const aliasPages: MetadataRoute.Sitemap = components.flatMap((component) =>
    component.aliases.map((alias) => ({
      url: `${baseUrl}/components/${alias}`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  );

  // Category filtered pages - good for discovery
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/components?category=${encodeURIComponent(category)}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...componentPages, ...aliasPages, ...categoryPages];
}
