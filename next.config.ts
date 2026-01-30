import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Redirects for component aliases - SEO friendly permanent redirects
  async redirects() {
    return [
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
