'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  PdfStoreProvider,
  usePdf,
  usePdfDispatch,
  usePdfState,
} from './pdf-store-provider';
import Toolbar from './toolbar/toolbar';
import PageList from './viewer/page-list';
import ThumbnailSidebar from './sidebar/thumbnail-sidebar';
import FormPanel from './panels/form-panel';
import PropertiesPanel from './panels/properties-panel';
import ModeHint from './mode-hint';
import EmptyState from './empty-state';
import PasswordPromptDialog from './dialogs/password-prompt-dialog';
import SplitDialog from './dialogs/split-dialog';
import SignatureDialog, {
  type SignaturePayload,
} from './signature/signature-dialog';
import SecurityDialog from './dialogs/security-dialog';
import StampDialog from './dialogs/stamp-dialog';
import ConvertDialog from './dialogs/convert-dialog';
import OcrDialog from './dialogs/ocr-dialog';
import MetadataDialog from './dialogs/metadata-dialog';
import CertificateDialog from './signature/certificate-dialog';
import SignatureInspector from './signature/signature-inspector';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useFileDrop } from '@/hooks/use-file-drop';
import { useOpenDocuments } from '@/hooks/use-open-documents';
import { useExportPdf } from '@/hooks/use-export-pdf';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { closeAllSources } from '@/lib/pdf/document';
import { clearThumbnails } from '@/lib/pdf/render';
import { createBlankPage } from '@/lib/pdf/pages/ops';
import { clearAssets, getAsset, importImage, putAsset } from '@/lib/pdf/assets';
import { newId } from '@/lib/pdf/reducer';
import { loadToolDefaults } from '@/lib/pdf/tool-defaults-storage';
import type { ToolId } from '@/lib/pdf/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface PdfWorkspaceProps {
  /**
   * Which tool the deep-linked sub-route wants. `/pdf/merge` opens the same
   * workspace as `/pdf` with the matching flow to hand.
   */
  mode?: string;
}

/** Sub-routes that should open a dialog as soon as a document is loaded. */
const MODE_DIALOG: Record<
  string,
  'split' | 'sign' | 'security' | 'stamp' | 'convert' | 'ocr'
> = {
  split: 'split',
  'extract-pages': 'split',
  sign: 'sign',
  protect: 'security',
  unlock: 'security',
  watermark: 'stamp',
  'page-numbers': 'stamp',
  compress: 'convert',
  'pdf-to-image': 'convert',
  'extract-text': 'convert',
  ocr: 'ocr',
};

const WorkspaceInner = ({ mode = 'edit' }: PdfWorkspaceProps) => {
  const getState = usePdfState();
  const dispatch = usePdfDispatch();
  const hasDocument = usePdf((state) => state.pages.length > 0);
  const sidebar = usePdf((state) => state.view.sidebar);
  const inspector = usePdf((state) => state.view.inspector);
  const isMobile = useIsMobile();

  /**
   * `null` means the user has not opened or dismissed the split dialog yet, so
   * the sub-route's own preference still applies. Deriving the open state this
   * way — rather than setting it from an effect when a document loads — keeps
   * the auto-open out of the render cycle.
   */
  const [splitOverride, setSplitOverride] = useState<boolean | null>(null);
  const [signatureOverride, setSignatureOverride] = useState<boolean | null>(
    null
  );
  const [securityOverride, setSecurityOverride] = useState<boolean | null>(
    null
  );
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [signaturesOpen, setSignaturesOpen] = useState(false);
  const [stampOverride, setStampOverride] = useState<boolean | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [convertOverride, setConvertOverride] = useState<boolean | null>(null);
  const [ocrOverride, setOcrOverride] = useState<boolean | null>(null);

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
   * Stamps today's date as a text object.
   *
   * The companion to a signature: forms almost always want a date beside the
   * signature line, and typing it by hand is the fiddliest part of signing a
   * document in a browser.
   */
  const placeDate = useCallback(() => {
    const state = getState();
    const pageId = state.view.currentPageId ?? state.pages[0]?.id;
    const page = state.pages.find((entry) => entry.id === pageId);
    if (!page) return;

    const size = state.sources[page.sourceId]?.pageSizes[page.sourceIndex];
    const pageWidth = size?.width ?? 612;
    const pageHeight = size?.height ?? 792;

    dispatch({
      type: 'ADD_OBJECT',
      pageId: page.id,
      object: {
        id: newId(),
        kind: 'text',
        // Unambiguous across locales, unlike 03/04/2026.
        text: format(new Date(), 'd MMMM yyyy'),
        fontId: 'Helvetica',
        size: 12,
        color: { r: 0, g: 0, b: 0 },
        align: 'left',
        lineHeight: 1.2,
        bold: false,
        italic: false,
        autoSize: false,
        rect: { x: pageWidth * 0.6, y: pageHeight * 0.15, w: 140, h: 18 },
        rotation: 0,
        opacity: 1,
        locked: false,
        z: (state.objects[page.id]?.length ?? 0) + 1,
        createdAt: Date.now(),
      },
    });
    dispatch({ type: 'SET_TOOL', tool: 'select' });
  }, [dispatch, getState]);

  /**
   * Places a finished signature on the current page.
   *
   * Sized to a third of the page width, which is roughly how large a signature
   * sits on a printed form, and kept to its own aspect ratio — a stretched
   * signature is immediately obvious.
   */
  const placeSignature = useCallback(
    (signature: SignaturePayload) => {
      const state = getState();
      const pageId = state.view.currentPageId ?? state.pages[0]?.id;
      const page = state.pages.find((entry) => entry.id === pageId);
      if (!page) return;

      const assetId = putAsset(
        signature.bytes,
        'image/png',
        signature.width,
        signature.height
      );

      const size = state.sources[page.sourceId]?.pageSizes[page.sourceIndex];
      const pageWidth = size?.width ?? 612;
      const pageHeight = size?.height ?? 792;

      const width = pageWidth / (signature.variant === 'initials' ? 8 : 3);
      const height = (signature.height / signature.width) * width;

      dispatch({
        type: 'ADD_OBJECT',
        pageId: page.id,
        object: {
          id: newId(),
          kind: 'signature',
          assetId,
          variant: signature.variant,
          sourceKind: signature.sourceKind,
          rect: {
            x: (pageWidth - width) / 2,
            // Placed low on the page, where a signature line usually is.
            y: pageHeight * 0.15,
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
    },
    [dispatch, getState]
  );

  /**
   * Places an image on the current page.
   *
   * Sized to fit within half the page width while keeping its aspect ratio, so
   * a photo straight off a phone camera doesn't land many times larger than the
   * page it is being placed on.
   */
  /**
   * Builds a new PDF from picked images, then opens it like any other file.
   *
   * Routing the result back through `openFiles` rather than into the store
   * directly means the new document gets a source, thumbnails and an export
   * path for free — it behaves exactly as if the user had opened it from disk.
   */
  const imagesToPdf = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;

      void (async () => {
        try {
          const { imagesToPdf: build } =
            await import('@/lib/pdf/optimize/compress');
          const bytes = await build(files);
          await openFiles([
            new File([bytes as BlobPart], 'images.pdf', {
              type: 'application/pdf',
            }),
          ]);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Those images could not be converted.'
          );
        }
      })();
    });
    input.click();
  }, [openFiles]);

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

  // Restore the drawing defaults from the last session. Done here rather than
  // in the initial state because reading localStorage during render would
  // differ between the server and the client and break hydration.
  useEffect(() => {
    const stored = loadToolDefaults();
    if (!stored) return;
    for (const [tool, patch] of Object.entries(stored)) {
      if (patch) {
        dispatch({ type: 'SET_TOOL_DEFAULTS', tool: tool as ToolId, patch });
      }
    }
  }, [dispatch]);

  // A sub-route like /pdf/split opens its dialog once there is something to
  // act on, so the deep link lands somewhere useful rather than on a dialog
  // with no document behind it.
  const splitOpen =
    splitOverride ?? (hasDocument && MODE_DIALOG[mode] === 'split');

  const showThumbnails = hasDocument && sidebar === 'thumbnails';
  const showForms = hasDocument && sidebar === 'forms';
  const showInspector = hasDocument && inspector;

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
          onSign={() => setSignatureOverride(true)}
          onAddDate={placeDate}
          onSecurity={() => setSecurityOverride(true)}
          onCertificateSign={() => setCertificateOpen(true)}
          onVerifySignatures={() => setSignaturesOpen(true)}
          onStamp={() => setStampOverride(true)}
          onMetadata={() => setMetadataOpen(true)}
          onConvert={() => setConvertOverride(true)}
          onOcr={() => setOcrOverride(true)}
          busy={isExporting}
        />

        {hasDocument && <ModeHint mode={mode} onOpen={openPicker} />}

        <div className="flex min-h-0 flex-1">
          {!isMobile && showThumbnails && (
            <div className="w-40 shrink-0">
              <ThumbnailSidebar />
            </div>
          )}

          {!isMobile && showForms && (
            <aside
              aria-label="Form fields"
              className="bg-card w-72 shrink-0 overflow-y-auto border-r"
            >
              <FormPanel />
            </aside>
          )}

          <main id="pdf-page-list" className="min-w-0 flex-1">
            {hasDocument ? (
              <PageList />
            ) : (
              <EmptyState
                onOpen={openPicker}
                onImagesToPdf={imagesToPdf}
                isDragging={isDragging}
                isOpening={isOpening}
              />
            )}
          </main>

          {!isMobile && showInspector && (
            <aside
              aria-label="Properties"
              className="bg-card w-64 shrink-0 overflow-y-auto border-l"
            >
              <PropertiesPanel />
            </aside>
          )}
        </div>

        {/*
          The same three panels, as overlays.

          Below 768px there is no room for a side rail, and the previous
          `hidden md:block` meant the thumbnail and form buttons in the toolbar
          still toggled state while nothing appeared — two controls that
          visibly did nothing on a phone. These are the same components, so
          page reordering, form filling and property editing all work on touch.
        */}
        {isMobile && (
          <>
            <Sheet
              open={showThumbnails}
              onOpenChange={(open) =>
                !open &&
                dispatch({ type: 'SET_VIEW', patch: { sidebar: 'none' } })
              }
            >
              <SheetContent side="left" className="w-56 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Pages</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <ThumbnailSidebar />
                </div>
              </SheetContent>
            </Sheet>

            <Drawer
              open={showForms}
              onOpenChange={(open) =>
                !open &&
                dispatch({ type: 'SET_VIEW', patch: { sidebar: 'none' } })
              }
            >
              <DrawerContent>
                <DrawerHeader className="pb-0">
                  <DrawerTitle>Form fields</DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[70dvh] overflow-y-auto">
                  <FormPanel />
                </div>
              </DrawerContent>
            </Drawer>

            <Drawer
              open={showInspector}
              onOpenChange={(open) =>
                dispatch({ type: 'SET_VIEW', patch: { inspector: open } })
              }
            >
              <DrawerContent>
                <DrawerHeader className="pb-0">
                  <DrawerTitle>Properties</DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[70dvh] overflow-y-auto">
                  <PropertiesPanel />
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}

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

        <OcrDialog
          open={ocrOverride ?? (hasDocument && MODE_DIALOG[mode] === 'ocr')}
          onOpenChange={setOcrOverride}
        />

        <ConvertDialog
          open={
            convertOverride ?? (hasDocument && MODE_DIALOG[mode] === 'convert')
          }
          onOpenChange={setConvertOverride}
        />

        <StampDialog
          open={stampOverride ?? (hasDocument && MODE_DIALOG[mode] === 'stamp')}
          onOpenChange={setStampOverride}
        />

        <MetadataDialog open={metadataOpen} onOpenChange={setMetadataOpen} />

        <CertificateDialog
          open={certificateOpen}
          onOpenChange={setCertificateOpen}
        />

        <SignatureInspector
          open={signaturesOpen}
          onOpenChange={setSignaturesOpen}
        />

        <SecurityDialog
          open={
            securityOverride ??
            (hasDocument && MODE_DIALOG[mode] === 'security')
          }
          onOpenChange={setSecurityOverride}
        />

        <SignatureDialog
          open={
            signatureOverride ?? (hasDocument && MODE_DIALOG[mode] === 'sign')
          }
          onOpenChange={setSignatureOverride}
          onPlace={placeSignature}
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
