import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  getComponentBySlugOrAlias,
  getAllSlugsAndAliases,
  components,
} from '@/config/components';
import { resolveComponentCode } from '@/lib/component-loader';
import { Button } from '@/components/ui/button';
import AnimatedPageContent from './animated-content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static params for all component slugs AND their aliases
export async function generateStaticParams() {
  const allSlugs = getAllSlugsAndAliases();
  return allSlugs.map((slug) => ({ slug }));
}

// Generate dynamic SEO metadata for each component page
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const component = getComponentBySlugOrAlias(slug);

  if (!component) {
    return {
      title: 'Component Not Found',
    };
  }

  // Check if this is an alias - if so, we'll redirect in the page component
  const isAlias = component.slug !== slug;

  return {
    title: component.seoTitle,
    description: component.seoDescription,
    keywords: component.keywords,
    robots: isAlias ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: `/components/${component.slug}`,
    },
    openGraph: {
      title: component.seoTitle,
      description: component.seoDescription,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: component.seoTitle,
      description: component.seoDescription,
    },
  };
}

export default async function ComponentPage({ params }: PageProps) {
  const { slug } = await params;
  const component = getComponentBySlugOrAlias(slug);

  if (!component) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Component Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          The component you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Link>
        </Button>
      </div>
    );
  }

  // Redirect aliases to canonical URL for SEO
  if (component.slug !== slug) {
    redirect(`/components/${component.slug}`);
  }

  // Get related components from same category
  const relatedComponents = components
    .filter(
      (c) => c.category === component.category && c.slug !== component.slug
    )
    .slice(0, 3);

  // Resolve component code files (server-side only)
  // This loads ComponentFileRef[] into ComponentFile[] before passing to client
  const resolvedComponent = {
    ...component,
    componentCode: resolveComponentCode(
      component.slug,
      component.componentCode
    ),
  };

  return (
    <AnimatedPageContent
      component={resolvedComponent}
      relatedComponents={relatedComponents}
    />
  );
}
