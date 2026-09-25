'use client';

import { useEffect, useRef } from 'react';
import { getPage } from '@/lib/pdf/render';
import { loadPdfjs } from '@/lib/pdf/pdfjs';
import type { PageEntry } from '@/lib/pdf/types';

interface TextLayerProps {
  entry: PageEntry;
  rotation: number;
  scale: number;
  /** Drawing tools need the pointer, so the layer stops intercepting it. */
  interactive: boolean;
}

/**
 * pdf.js's text layer: transparent, correctly-positioned spans over the canvas.
 *
 * This is what makes the viewer accessible. The canvas is a bitmap and conveys
 * nothing to a screen reader or to the browser's own find-in-page; these spans
 * carry the document's real text, so selection, copy, Ctrl+F and assistive
 * technology all work on the actual words rather than on an image of them.
 *
 * It is only hidden while a drawing tool is active, when swallowing pointer
 * events would stop the user from drawing.
 */
const TextLayer = ({ entry, rotation, scale, interactive }: TextLayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderKey = `${entry.id}:${rotation}:${scale.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const run = async () => {
      const [pdfjs, page] = await Promise.all([
        loadPdfjs(),
        getPage(entry.sourceId, entry.sourceIndex),
      ]);
      if (!page || cancelled) return;

      const textContent = await page.getTextContent();
      if (cancelled) return;

      container.replaceChildren();
      const layer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container,
        viewport: page.getViewport({ scale, rotation }),
      });
      await layer.render();
      page.cleanup();
    };

    void run().catch((error) => {
      if (!cancelled) console.error('[pdf] text layer failed', error);
    });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderKey encodes every input
  }, [renderKey]);

  return (
    <div
      ref={containerRef}
      // `textLayer` is pdf.js's own class; its stylesheet positions the spans
      // and makes them transparent but selectable.
      className="textLayer absolute inset-0 overflow-hidden"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      aria-hidden={interactive ? undefined : 'true'}
    />
  );
};

export default TextLayer;
