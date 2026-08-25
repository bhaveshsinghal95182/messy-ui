'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';
import type { PdfWorkspaceProps } from '@/components/pdf/workspace';

/**
 * Client boundary for the PDF workspace.
 *
 * This is the only place in the app that uses `ssr: false`, and it has to be a
 * client component to do so — App Router throws when a Server Component calls
 * `dynamic` with `ssr: false`. Keeping the boundary here lets `page.tsx` stay a
 * server component, so its metadata, JSON-LD and SEO copy are still rendered
 * into the initial HTML while the editor itself loads only in the browser.
 */
const PdfWorkspace = dynamic(() => import('@/components/pdf/workspace'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[100dvh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-6" />
        <p className="text-muted-foreground text-sm">Loading the editor…</p>
      </div>
    </div>
  ),
});

const PdfWorkspaceLoader = (props: PdfWorkspaceProps) => (
  <PdfWorkspace {...props} />
);

export default PdfWorkspaceLoader;
