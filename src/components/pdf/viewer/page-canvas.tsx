'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { getPage, renderPageToCanvas, settleRender } from '@/lib/pdf/render';
import { cn } from '@/lib/utils';
import type { PageEntry } from '@/lib/pdf/types';

interface PageCanvasProps {
  entry: PageEntry;
  /** Page /Rotate plus any rotation the user added. */
  rotation: number;
  /** Zoom multiplier; 1 renders at 72 DPI. */
  scale: number;
  /** CSS width of the rendered page, used to reserve space before paint. */
  width: number;
  height: number;
}

/**
 * Renders one page into a canvas.
 *
 * The pdf.js `RenderTask` is held in a ref and cancelled on cleanup. Without
 * that, a fast scroll or a zoom drag leaves several renders racing for the same
 * canvas: they finish out of order, the last one to land wins, and the page
 * shows content from the wrong scale. Cancellation rejects with
 * `RenderingCancelledException`, which `settleRender` treats as a normal
 * outcome rather than an error.
 */
const PageCanvas = ({
  entry,
  rotation,
  scale,
  width,
  height,
}: PageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<RenderTask | null>(null);
  const [painted, setPainted] = useState(false);

  // A primitive key rather than an object: the React Compiler infers effect
  // dependencies, and depending on a freshly-built object would re-run this on
  // every render.
  const renderKey = `${entry.id}:${entry.sourceIndex}:${rotation}:${scale.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;
    let page: PDFPageProxy | null = null;

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      page = await getPage(entry.sourceId, entry.sourceIndex);
      if (!page || cancelled) return;

      const started = renderPageToCanvas(page, canvas, scale, rotation);
      if (!started) return;

      taskRef.current = started.task;
      const finished = await settleRender(started.task);
      if (finished && !cancelled) setPainted(true);
    };

    void run().catch((error) => {
      if (!cancelled) console.error('[pdf] page render failed', error);
    });

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      taskRef.current = null;
      // Frees the page's operator list and font data. Without this a long
      // document holds every page it has ever shown in worker memory.
      page?.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderKey encodes every input
  }, [renderKey]);

  return (
    <canvas
      ref={canvasRef}
      // The PDF is the document's own artwork: it stays white in dark mode,
      // because inverting it would misrepresent what the file actually says.
      className={cn(
        'block bg-white transition-opacity duration-150',
        painted ? 'opacity-100' : 'opacity-0'
      )}
      style={{ width, height }}
      // The page's text lives in the text layer sibling, which is what screen
      // readers and find-in-page should see instead of this bitmap.
      aria-hidden="true"
    />
  );
};

export default PageCanvas;
