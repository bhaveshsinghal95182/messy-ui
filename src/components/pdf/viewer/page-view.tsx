'use client';

import PageCanvas from './page-canvas';
import TextLayer from './text-layer';
import { cn } from '@/lib/utils';
import type { PageEntry } from '@/lib/pdf/types';

interface PageViewProps {
  entry: PageEntry;
  /** 1-based position in the working document, for the page label. */
  pageNumber: number;
  rotation: number;
  scale: number;
  /** Displayed size in CSS pixels, already rotated and scaled. */
  width: number;
  height: number;
  /** Only mounted pages actually render; off-screen ones reserve space. */
  mounted: boolean;
  interactiveText: boolean;
}

/**
 * One page in the scroll list: the rendered canvas plus its text layer.
 *
 * Off-screen pages still occupy their exact final size so the scrollbar never
 * jumps as pages paint in — the size comes from `pageSizes`, read once when the
 * file was opened, so no measurement is needed.
 */
const PageView = ({
  entry,
  pageNumber,
  rotation,
  scale,
  width,
  height,
  mounted,
  interactiveText,
}: PageViewProps) => {
  return (
    <div
      data-page-id={entry.id}
      data-page-number={pageNumber}
      role="group"
      aria-label={`Page ${pageNumber}`}
      className={cn(
        'relative shrink-0 bg-white shadow-md ring-1 ring-black/10',
        !mounted && 'bg-white/60'
      )}
      style={{
        width,
        height,
        // pdf.js's text layer sizes its spans from this variable.
        ['--total-scale-factor' as string]: scale,
      }}
    >
      {mounted ? (
        <>
          <PageCanvas
            entry={entry}
            rotation={rotation}
            scale={scale}
            width={width}
            height={height}
          />
          <TextLayer
            entry={entry}
            rotation={rotation}
            scale={scale}
            interactive={interactiveText}
          />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-muted-foreground text-xs">{pageNumber}</span>
        </div>
      )}
    </div>
  );
};

export default PageView;
