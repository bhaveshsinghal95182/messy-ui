'use client';

import { useEffect, useState } from 'react';
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import { getPage } from '@/lib/pdf/render';
import type { PageEntry } from '@/lib/pdf/types';

/**
 * The pdf.js viewport for a page at the current zoom and rotation.
 *
 * The overlay needs the real `PageViewport` rather than a computed scale
 * factor: its `convertToPdfPoint` and `convertToViewportPoint` already invert
 * the full transform — scale, the page's /Rotate, any extra rotation, and the
 * y-flip between PDF and screen coordinates. Rebuilding that arithmetic by hand
 * is where coordinate bugs on rotated pages come from.
 */
export function usePageViewport(
  entry: PageEntry,
  rotation: number,
  scale: number
): PageViewport | null {
  const [viewport, setViewport] = useState<PageViewport | null>(null);

  // A primitive key: the React Compiler infers effect dependencies, and
  // depending on the entry object would re-run this on every render.
  const key = `${entry.sourceId}:${entry.sourceIndex}:${rotation}:${scale.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;

    void getPage(entry.sourceId, entry.sourceIndex)
      .then((page) => {
        if (!page || cancelled) return;
        setViewport(page.getViewport({ scale, rotation }));
        page.cleanup();
      })
      .catch((error) => {
        if (!cancelled) console.error('[pdf] viewport failed', error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key encodes every input
  }, [key]);

  return viewport;
}
