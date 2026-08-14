import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Redirects for component aliases - SEO friendly permanent redirects
  async redirects() {
    return [
      // Legacy query-string category filter -> real category landing page.
      // The category page normalises the value and redirects to its canonical
      // slug, so both "?category=Animations" and "?category=animations" land
      // on /components/category/animations.
      {
        source: '/components',
        has: [
          {
            type: 'query',
            key: 'category',
            value: '(?<category>.*)',
          },
        ],
        destination: '/components/category/:category',
        permanent: true,
      },
      // Animated Counter aliases
      {
        source: '/components/odometer-counter',
        destination: '/components/animated-counter',
        permanent: true, // 301 redirect for SEO
      },
      {
        source: '/components/number-counter',
        destination: '/components/animated-counter',
        permanent: true,
      },
      {
        source: '/components/digit-counter',
        destination: '/components/animated-counter',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
