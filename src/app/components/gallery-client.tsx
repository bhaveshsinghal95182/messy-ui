'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComponentConfig } from '@/config/types';
import { plainText } from '@/lib/text';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

interface GalleryProps {
  /** Components to render in the grid. */
  items: ComponentConfig[];
  /** Rendered as the page's h1. */
  heading: string;
  /** Intro copy under the heading. */
  description: string;
  /** Category chips, shown on the main gallery only. */
  categoryLinks?: { name: string; href: string }[];
  /** Shown on category pages to get back to the full gallery. */
  backLink?: { label: string; href: string };
  /** Optional pill above the heading. */
  badge?: string;
}

/**
 * Shared gallery layout for /components and the category landing pages.
 * Metadata and structured data are owned by the server pages that render this.
 */
export default function Gallery({
  items,
  heading,
  description,
  categoryLinks,
  backLink,
  badge,
}: GalleryProps) {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-16 px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {backLink && (
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={backLink.href}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backLink.label}
              </Link>
            </Button>
          )}
          {badge && (
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              {badge}
            </Badge>
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-linear-to-r from-foreground via-foreground/80 to-foreground bg-clip-text">
            {heading}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </motion.div>
      </section>

      {/* Category Navigation */}
      {categoryLinks && categoryLinks.length > 0 && (
        <nav aria-label="Component categories" className="px-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="max-w-6xl mx-auto flex flex-wrap justify-center gap-2"
          >
            {categoryLinks.map((category) => (
              <Link key={category.name} href={category.href}>
                <Badge
                  variant="outline"
                  className="px-4 py-2 rounded-full text-[1rem] cursor-pointer bg-card/80 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {category.name}
                </Badge>
              </Link>
            ))}
          </motion.div>
        </nav>
      )}

      {/* Components Grid */}
      <section className="px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((component) => (
            <ComponentCard key={component.slug} component={component} />
          ))}
        </motion.div>
      </section>
    </div>
  );
}

interface ComponentCardProps {
  component: ComponentConfig;
}

function ComponentCard({ component }: ComponentCardProps) {
  const Component = component.component;
  const showLivePreview = component.sandbox === 'inline';

  return (
    <motion.div variants={cardVariants}>
      <Link href={`/components/${component.slug}`} className="block group">
        <article className="relative rounded-2xl bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-foreground/5">
          {/* Preview Area */}
          <div className="relative h-48 bg-muted/30 p-6 flex items-center justify-center overflow-hidden">
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-linear-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Component Preview or Thumbnail */}
            <div className="relative z-10 w-full h-full transform group-hover:scale-105 transition-transform duration-300">
              {showLivePreview ? (
                <div className="flex px-8 items-center justify-center w-full h-full">
                  <Suspense
                    fallback={<Skeleton className="w-full h-12 rounded-lg" />}
                  >
                    <Component />
                  </Suspense>
                </div>
              ) : component.thumbnailUrl ? (
                typeof component.thumbnailUrl === 'string' ? (
                  // Single image for both themes
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={component.thumbnailUrl}
                    alt={`${component.name} React component preview`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-md shadow-sm"
                  />
                ) : (
                  // Separate images for light/dark themes
                  <>
                    {/* Light Mode Image - Hidden in Dark Mode */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={component.thumbnailUrl.light}
                      alt={`${component.name} React component preview, light theme`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-md shadow-sm dark:hidden"
                    />
                    {/* Dark Mode Image - Hidden in Light Mode */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={component.thumbnailUrl.dark}
                      alt={`${component.name} React component preview, dark theme`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-md shadow-sm hidden dark:block"
                    />
                  </>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
                  <div className="w-16 h-16 rounded-xl bg-background/50 border-2 border-dashed border-current flex items-center justify-center mb-3">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 bg-card/50 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {component.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {plainText(component.description)}
                </p>
              </div>
              <div className="shrink-0 p-2 rounded-full bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                {component.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {component.props.length} props
              </Badge>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
