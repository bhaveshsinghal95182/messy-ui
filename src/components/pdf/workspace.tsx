'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PdfStoreProvider,
  usePdf,
  usePdfDispatch,
  usePdfState,
} from './pdf-store-provider';
import Toolbar from './toolbar/toolbar';
import PageList from './viewer/page-list';
import ThumbnailSidebar from './sidebar/thumbnail-sidebar';
import EmptyState from './empty-state';
import PasswordPromptDialog from './dialogs/password-prompt-dialog';
import SplitDialog from './dialogs/split-dialog';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useFileDrop } from '@/hooks/use-file-drop';
import { useOpenDocuments } from '@/hooks/use-open-documents';
import { useExportPdf } from '@/hooks/use-export-pdf';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { closeAllSources } from '@/lib/pdf/document';
import { clearThumbnails } from '@/lib/pdf/render';
import { createBlankPage } from '@/lib/pdf/pages/ops';
import { clearAssets, getAsset, importImage } from '@/lib/pdf/assets';
import { newId } from '@/lib/pdf/reducer';
import { cn } from '@/lib/utils';

export interface PdfWorkspaceProps {
  /**
   * Which tool the deep-linked sub-route wants. `/pdf/merge` opens the same
   * workspace as `/pdf` with the matching flow to hand.
   */
  mode?: string;
}

/** Sub-routes that should open a dialog as soon as a document is loaded. */
const MODE_DIALOG: Record<string, 'split'> = {
  split: 'split',
  'extract-pages': 'split',
};

const WorkspaceInner = ({ mode = 'edit' }: PdfWorkspaceProps) => {
  const getState = usePdfState();
  const dispatch = usePdfDispatch();
  const hasDocument = usePdf((state) => state.pages.length > 0);
  const sidebar = usePdf((state) => state.view.sidebar);

  /**
   * `null` means the user has not opened or dismissed the split dialog yet, so
   * the sub-route's own preference still applies. Deriving the open state this
   * way — rather than setting it from an effect when a document loads — keeps
   * the auto-open out of the render cycle.
   */
  const [splitOverride, setSplitOverride] = useState<boolean | null>(null);

  const {
    openFiles,
    isOpening,
    pendingPassword,
    submitPassword,
    cancelPassword,
  } = useOpenDocuments();

  const { isDragging, openPicker } = useFileDrop({ onFiles: openFiles });
  const { download, downloadChunks, print, isExporting } = useExportPdf();

  const handleDownload = useCallback(() => void download(), [download]);
  const handlePrint = useCallback(() => void print(), [print]);

  useKeyboardShortcuts({
    onOpen: openPicker,
    onDownload: handleDownload,
    onPrint: handlePrint,
  });

  /**
   * Places an image on the current page.
   *
   * Sized to fit within half the page width while keeping its aspect ratio, so
   * a photo straight off a phone camera doesn't land many times larger than the
   * page it is being placed on.
   */
  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      void (async () => {
        try {
          const state = getState();
          const pageId = state.view.currentPageId ?? state.pages[0]?.id;
          const page = state.pages.find((entry) => entry.id === pageId);
          if (!page) return;

          const assetId = await importImage(file);
          const asset = getAsset(assetId);
          if (!asset) return;

          const size =
            state.sources[page.sourceId]?.pageSizes[page.sourceIndex];
          const pageWidth = size?.width ?? 612;
          const pageHeight = size?.height ?? 792;

          const width = Math.min(pageWidth / 2, asset.width);
          const height = (asset.height / asset.width) * width;

          dispatch({
            type: 'ADD_OBJECT',
            pageId: page.id,
            object: {
              id: newId(),
              kind: 'image',
              assetId,
              fit: 'contain',
              rect: {
                x: (pageWidth - width) / 2,
                y: (pageHeight - height) / 2,
                w: width,
                h: height,
              },
              rotation: 0,
              opacity: 1,
              locked: false,
              z: (state.objects[page.id]?.length ?? 0) + 1,
              createdAt: Date.now(),
            },
          });
          dispatch({ type: 'SET_TOOL', tool: 'select' });
        } catch (error) {
          console.error(error);
          toast.error('Could not add that image');
        }
      })();
    });
    input.click();
  }, [dispatch, getState]);

  /**
   * Inserts a blank page after the selected one, matching the size of its
   * neighbour so it doesn't stand out in a document of a non-Letter size.
   */
  const insertBlank = useCallback(() => {
    const state = getState();
    const index = state.pages.findIndex(
      (page) => page.id === state.selection.pageId
    );
    const reference = state.pages[index >= 0 ? index : state.pages.length - 1];
    const size = reference
      ? state.sources[reference.sourceId]?.pageSizes[reference.sourceIndex]
      : undefined;

    const blank = createBlankPage(size?.width ?? 612, size?.height ?? 792);
    const at = index >= 0 ? index + 1 : state.pages.length;
    const pages = [...state.pages];
    pages.splice(at, 0, blank);
    dispatch({ type: 'SET_PAGES', pages });
  }, [dispatch, getState]);

  // Workers and blob URLs outlive React on their own, so releasing them is the
  // component's job — a document left open would otherwise keep its pdf.js
  // worker and every cached thumbnail alive for the rest of the session.
  useEffect(
    () => () => {
      void closeAllSources();
      clearThumbnails();
      clearAssets();
    },
    []
  );

  // A sub-route like /pdf/split opens its dialog once there is something to
  // act on, so the deep link lands somewhere useful rather than on a dialog
  // with no document behind it.
  const splitOpen =
    splitOverride ?? (hasDocument && MODE_DIALOG[mode] === 'split');

  const showThumbnails = hasDocument && sidebar === 'thumbnails';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-pdf-mode={mode}
        className="bg-background flex h-[100dvh] flex-col"
      >
        <Toolbar
          onOpen={openPicker}
          onDownload={handleDownload}
          onPrint={handlePrint}
          onSplit={() => setSplitOverride(true)}
          onInsertBlank={insertBlank}
          onAddImage={addImage}
          busy={isExporting}
        />

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

        <SplitDialog
          open={splitOpen}
          onOpenChange={setSplitOverride}
          onSplit={(chunks) => void downloadChunks(chunks)}
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
