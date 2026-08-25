'use client';

import { useRef } from 'react';
import PageCanvas from './page-canvas';
import TextLayer from './text-layer';
import ObjectLayer from './object-layer';
import { usePdf } from '../pdf-store-provider';
import { usePageViewport } from '@/hooks/use-page-viewport';
import { useDrawObject } from '@/hooks/use-draw-object';
import { pdfRectToScreen } from '@/lib/pdf/geometry';
import { toCss } from '../objects/object-renderer';
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
}

/**
 * One page in the scroll list: the rendered canvas, its text layer, and the
 * interactive overlay carrying annotations.
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
}: PageViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTool = usePdf((state) => state.activeTool);
  const viewport = usePageViewport(entry, rotation, scale);

  const isSelectMode = activeTool === 'select';
  const drawing = useDrawObject(entry.id, viewport, containerRef);

  // In select mode the text layer owns the pointer so text stays selectable
  // and find-in-page keeps working; a drawing tool takes it over instead.
  const drawHandlers = isSelectMode
    ? undefined
    : {
        onPointerDown: drawing.begin,
        onPointerMove: drawing.move,
        onPointerUp: drawing.end,
        onPointerCancel: drawing.end,
      };

  const previewBox =
    drawing.preview && viewport
      ? pdfRectToScreen(viewport, drawing.preview.rect)
      : null;

  return (
    <div
      ref={containerRef}
      data-page-id={entry.id}
      data-page-number={pageNumber}
      role="group"
      aria-label={`Page ${pageNumber}`}
      className={cn(
        'relative shrink-0 bg-white shadow-md ring-1 ring-black/10',
        !mounted && 'bg-white/60',
        !isSelectMode && 'cursor-crosshair touch-none'
      )}
      style={{
        width,
        height,
        // pdf.js's text layer sizes its spans from this variable.
        ['--total-scale-factor' as string]: scale,
      }}
      {...drawHandlers}
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
            interactive={isSelectMode}
          />
          <ObjectLayer
            pageId={entry.id}
            viewport={viewport}
            scale={scale}
            interactive={isSelectMode}
          />

          {/* Live preview of the shape being dragged out. */}
          {previewBox && (
            <div
              aria-hidden="true"
              className="border-primary bg-primary/10 pointer-events-none absolute border"
              style={{
                left: previewBox.left,
                top: previewBox.top,
                width: previewBox.width,
                height: previewBox.height,
              }}
            />
          )}

          {/* Ink needs its trail previewed, not a bounding box. */}
          {drawing.preview && activeTool === 'ink' && viewport && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              width={width}
              height={height}
            >
              <InkPreview
                points={drawing.preview.points}
                viewport={viewport}
                scale={scale}
              />
            </svg>
          )}
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-muted-foreground text-xs">{pageNumber}</span>
        </div>
      )}
    </div>
  );
};

/** The freehand trail as it is drawn, before it becomes an object. */
const InkPreview = ({
  points,
  viewport,
  scale,
}: {
  points: { x: number; y: number }[];
  viewport: NonNullable<ReturnType<typeof usePageViewport>>;
  scale: number;
}) => {
  const path = points
    .map((point, index) => {
      const [x, y] = viewport.convertToViewportPoint(point.x, point.y) as [
        number,
        number,
      ];
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <path
      d={path}
      fill="none"
      stroke={toCss({ r: 0, g: 0, b: 0 })}
      strokeWidth={2 * scale}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

export default PageView;
