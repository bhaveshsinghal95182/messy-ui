'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  usePdfDispatch,
  usePdfState,
} from '@/components/pdf/pdf-store-provider';
import { exportPdf, type ExportOptions } from '@/lib/pdf/export/build';
import { saveBytes, printBytes } from '@/lib/pdf/export/save';
import { chunkFilename } from '@/lib/pdf/pages/ops';
import type { PageEntry } from '@/lib/pdf/types';

/**
 * Runs the export pipeline and hands the result to the user.
 *
 * Status goes through the store so the toolbar progress bar and the aria-live
 * region both reflect it, and errors surface as a toast rather than only in the
 * console — a failed export with no feedback is the worst outcome here, since
 * the user may close the tab believing their work was saved.
 */
export function useExportPdf() {
  const getState = usePdfState();
  const dispatch = usePdfDispatch();
  const [isExporting, setIsExporting] = useState(false);

  const run = useCallback(
    async <T>(label: string, task: () => Promise<T>): Promise<T | null> => {
      setIsExporting(true);
      dispatch({
        type: 'SET_STATUS',
        patch: { busy: true, label, progress: null },
      });
      try {
        return await task();
      } catch (error) {
        console.error(error);
        toast.error(label + ' failed', {
          description:
            error instanceof Error
              ? error.message
              : 'The document could not be written.',
        });
        return null;
      } finally {
        setIsExporting(false);
        dispatch({
          type: 'SET_STATUS',
          patch: { busy: false, label: '', progress: null },
        });
      }
    },
    [dispatch]
  );

  /** Exports the whole working document and saves it. */
  const download = useCallback(
    async (options?: ExportOptions) => {
      const state = getState();
      if (state.pages.length === 0) return;

      const saved = await run('Export', async () => {
        const bytes = await exportPdf(state, options);
        return saveBytes(
          bytes,
          options?.settings?.filename ?? state.exportSettings.filename
        );
      });

      if (saved) toast.success('Saved');
    },
    [getState, run]
  );

  /** Exports several page groups as separate files, for split and extract. */
  const downloadChunks = useCallback(
    async (chunks: PageEntry[][]) => {
      const state = getState();
      if (chunks.length === 0) return;

      await run('Export', async () => {
        for (const [index, pages] of chunks.entries()) {
          const bytes = await exportPdf(state, { pages });
          const name =
            chunks.length === 1
              ? state.exportSettings.filename
              : chunkFilename(
                  state.exportSettings.filename,
                  index,
                  chunks.length
                );
          const saved = await saveBytes(bytes, name);
          // A cancelled save picker means the user changed their mind; don't
          // keep prompting for the remaining chunks.
          if (!saved) break;
        }
        return true;
      });
    },
    [getState, run]
  );

  const print = useCallback(async () => {
    const state = getState();
    if (state.pages.length === 0) return;
    await run('Print', async () => {
      const bytes = await exportPdf(state);
      await printBytes(bytes);
      return true;
    });
  }, [getState, run]);

  return { download, downloadChunks, print, isExporting };
}
