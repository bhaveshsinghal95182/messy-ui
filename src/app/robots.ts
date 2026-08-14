import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

/**
 * Serves /robots.txt.
 *
 * Everything user-facing is crawlable. The excluded paths are internal:
 * - /preview/* renders a bare component for the docs iframe, so it would
 *   otherwise compete with the real component page for the same content.
 * - /test is a scratch route.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/preview/', '/test'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
