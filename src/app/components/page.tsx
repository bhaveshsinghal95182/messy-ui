'use client';

import { components, categories } from '@/config/components';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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

function ComponentsContent() {
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category');

  // Filter components by category if selected
  const filteredComponents = selectedCategory
    ? components.filter((c) => c.category === selectedCategory)
    : components;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-16 px-6 overflow-hidden">
        {/* Gradient background orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-linear-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-linear-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {selectedCategory ? (
            <>
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/components">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  All Components
                </Link>
              </Button>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-linear-to-r from-foreground via-foreground/80 to-foreground bg-clip-text">
                {selectedCategory}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {filteredComponents.length} component
                {filteredComponents.length !== 1 ? 's' : ''} in this category
              </p>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                {components.length} Components Available
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-linear-to-r from-foreground via-foreground/80 to-foreground bg-clip-text">
                Component Gallery
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Beautifully crafted, animated React components ready to enhance
                your next project. Built with GSAP, Framer Motion, and modern
                best practices.
              </p>
            </>
          )}
        </motion.div>
      </section>

      {/* Category Navigation */}
      {!selectedCategory && (
        <section className="px-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="max-w-6xl mx-auto flex flex-wrap justify-center gap-2"
          >
            {categories.map((category) => (
              <Link key={category} href={`/components?category=${category}`}>
                <Badge
                  variant="outline"
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </Badge>
              </Link>
            ))}
          </motion.div>
        </section>
      )}

      {/* Components Grid */}
      <section className="px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredComponents.map((component) => (
            <ComponentCard key={component.slug} component={component} />
          ))}
        </motion.div>
      </section>
    </div>
  );
}

// Loading fallback for Suspense
function ComponentsLoading() {
  return (
    <div className="min-h-screen pb-20">
      <section className="relative py-16 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <Skeleton className="h-6 w-48 mx-auto mb-4" />
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
      </section>
      <section className="px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <Suspense fallback={<ComponentsLoading />}>
      <ComponentsContent />
    </Suspense>
  );
}

interface ComponentCardProps {
  component: (typeof components)[number];
}

function ComponentCard({ component }: ComponentCardProps) {
  const Component = component.component;
  const showLivePreview = component.sandbox === 'inline';

  return (
    <motion.div variants={cardVariants}>
      <Link href={`/components/${component.slug}`} className="block group">
        <div className="relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          {/* Preview Area */}
          <div className="relative h-48 bg-linear-to-br from-muted/30 via-background to-muted/50 p-6 flex items-center justify-center overflow-hidden">
            {/* Dot pattern background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at center, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

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
                    alt={component.name}
                    className="w-full h-full object-cover rounded-md shadow-sm"
                  />
                ) : (
                  // Separate images for light/dark themes
                  <>
                    {/* Light Mode Image - Hidden in Dark Mode */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={component.thumbnailUrl.light}
                      alt={`${component.name} Light`}
                      className="w-full h-full object-cover rounded-md shadow-sm dark:hidden"
                    />
                    {/* Dark Mode Image - Hidden in Light Mode */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={component.thumbnailUrl.dark}
                      alt={`${component.name} Dark`}
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
          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {component.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {component.description}
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
        </div>
      </Link>
    </motion.div>
  );
}
