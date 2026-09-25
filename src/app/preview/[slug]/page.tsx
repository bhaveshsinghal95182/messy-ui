import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getComponentBySlugOrAlias } from '@/config/components';
import { decodePreviewProps } from '@/lib/preview-props';
import { Loader2 } from 'lucide-react';

// Bare component renderer for the docs iframe - it duplicates the content of
// the real component page, so it must never be indexed on its own.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const component = getComponentBySlugOrAlias(slug);

  if (!component) {
    notFound();
  }

  const Component = component.component;

  const props = decodePreviewProps(resolvedSearchParams);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      >
        <Component {...props} />
      </Suspense>
    </div>
  );
}
