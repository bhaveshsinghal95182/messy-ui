'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { PdfStoreProvider, usePdf, usePdfState } from './pdf-store-provider';
import Toolbar from './toolbar/toolbar';
import PageList from './viewer/page-list';
import ThumbnailSidebar from './sidebar/thumbnail-sidebar';
import EmptyState from './empty-state';
import PasswordPromptDialog from './dialogs/password-prompt-dialog';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useFileDrop } from '@/hooks/use-file-drop';
import { useOpenDocuments } from '@/hooks/use-open-documents';
import { closeAllSources } from '@/lib/pdf/document';
import { clearThumbnails } from '@/lib/pdf/render';
import { saveBytes } from '@/lib/pdf/export/save';
import { cn } from '@/lib/utils';

export interface PdfWorkspaceProps {
  /**
   * Which tool the deep-linked sub-route wants. `/pdf/merge` opens the same
   * workspace as `/pdf` with the merge flow to hand.
   */
  mode?: string;
}

const WorkspaceInner = ({ mode = 'edit' }: PdfWorkspaceProps) => {
  const getState = usePdfState();
  const hasDocument = usePdf((state) => state.pages.length > 0);
  const sidebar = usePdf((state) => state.view.sidebar);

  const {
    openFiles,
    isOpening,
    pendingPassword,
    submitPassword,
    cancelPassword,
  } = useOpenDocuments();

  const { isDragging, openPicker } = useFileDrop({ onFiles: openFiles });

  // Workers and blob URLs outlive React on their own, so releasing them is the
  // component's job — a document left open would otherwise keep its pdf.js
  // worker and every cached thumbnail alive for the rest of the session.
  useEffect(
    () => () => {
      void closeAllSources();
      clearThumbnails();
    },
    []
  );

  /**
   * Phase 0 hands back the bytes exactly as they were opened. Once the export
   * pipeline lands this routes through `exportPdf` instead.
   */
  const handleDownload = useCallback(async () => {
    const state = getState();
    const firstPage = state.pages[0];
    const source = firstPage ? state.sources[firstPage.sourceId] : undefined;
    if (!source) return;

    try {
      await saveBytes(source.bytes, state.exportSettings.filename);
    } catch (error) {
      console.error(error);
      toast.error('Could not save the file');
    }
  }, [getState]);

  const showThumbnails = hasDocument && sidebar === 'thumbnails';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        // The sub-routes (/pdf/merge, /pdf/sign, …) all render this same
        // workspace; the mode says which flow they arrived for, and later
        // phases open the matching dialog once a file is loaded.
        data-pdf-mode={mode}
        className="bg-background flex h-[100dvh] flex-col"
      >
        <Toolbar onOpen={openPicker} onDownload={handleDownload} />

        <div className="flex min-h-0 flex-1">
          {showThumbnails && (
            <div className="hidden w-40 shrink-0 md:block">
              <ThumbnailSidebar />
            </div>
          )}

          <main id="pdf-page-list" className="min-w-0 flex-1">
            {hasDocument ? (
              <PageList />
            ) : (
              <EmptyState
                onOpen={openPicker}
                isDragging={isDragging}
                isOpening={isOpening}
              />
            )}
          </main>
        </div>

        {/* A full-window drop affordance, so a drag anywhere reads as valid. */}
        <div
          aria-hidden="true"
          className={cn(
            'border-primary bg-primary/5 pointer-events-none fixed inset-0 z-50 border-4 transition-opacity',
            isDragging && hasDocument ? 'opacity-100' : 'opacity-0'
          )}
        />

        <PasswordPromptDialog
          pending={pendingPassword}
          busy={isOpening}
          onSubmit={submitPassword}
          onCancel={cancelPassword}
        />

        {/* Mounted here rather than in the root layout so the rest of the site
            is unaffected by this route's toasts. */}
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
};

/**
 * The PDF workspace.
 *
 * Default-exported so `next/dynamic` can load it with `ssr: false` — pdf.js is
 * ESM-only and touches browser globals at module scope, so it must never be
 * evaluated on the server.
 */
const PdfWorkspace = ({ mode }: PdfWorkspaceProps) => (
  <PdfStoreProvider>
    <WorkspaceInner mode={mode} />
  </PdfStoreProvider>
);

export default PdfWorkspace;
