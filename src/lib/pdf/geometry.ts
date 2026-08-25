/**
 * The only module permitted to convert between screen and PDF coordinates.
 *
 * PDF user space has its origin at the bottom-left with y increasing upwards;
 * the DOM has its origin at the top-left with y increasing downwards. On top of
 * that, a page carries its own /Rotate and the user can add more, and the whole
 * thing is scaled by the current zoom.
 *
 * Rather than spread that arithmetic around, everything funnels through the
 * `PageViewport` pdf.js already builds: `getViewport({ scale, rotation })` folds
 * scale, the page rotation and the y-flip into one matrix, and its two
 * converters invert it correctly. Store PDF space, convert at the edges, and
 * every zoom level and rotation works for free — including on export, where
 * pdf-lib's draw calls take exactly these bottom-left points.
 *
 * pdf.js v6 dropped `convertToViewportRectangle`, so rects are built from two
 * converted corners here.
 */

import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import type { Point, Quadrant, Rect } from './types';
import { MARGIN_GUIDE_PT, SNAP_THRESHOLD_PX } from './constants';

/** A rectangle in CSS pixels, relative to the page container's top-left. */
export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/* -------------------------------------------------------------------------- */
/*                                 Conversion                                  */
/* -------------------------------------------------------------------------- */

/**
 * Screen pixels (relative to the page container) to PDF user space.
 *
 * Callers must pass `event.clientX - containerRect.left`, never `offsetX`:
 * `offsetX` is relative to the *event target*, so it silently reports the wrong
 * origin the moment the pointer is over a child element such as an object or a
 * text-layer span.
 */
export const screenToPdf = (
  viewport: PageViewport,
  x: number,
  y: number
): Point => {
  const [px, py] = viewport.convertToPdfPoint(x, y) as [number, number];
  return { x: px, y: py };
};

/** PDF user space to screen pixels relative to the page container. */
export const pdfToScreen = (
  viewport: PageViewport,
  x: number,
  y: number
): Point => {
  const [sx, sy] = viewport.convertToViewportPoint(x, y) as [number, number];
  return { x: sx, y: sy };
};

/**
 * A PDF-space rect as a CSS-positionable box.
 *
 * Both corners are converted and then normalised, because under a 90° or 270°
 * rotation the transform swaps which corner ends up top-left.
 */
export const pdfRectToScreen = (
  viewport: PageViewport,
  rect: Rect
): ScreenRect => {
  const a = pdfToScreen(viewport, rect.x, rect.y);
  const b = pdfToScreen(viewport, rect.x + rect.w, rect.y + rect.h);
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
};

/** A screen-space box (e.g. a marquee) as a PDF-space rect. */
export const screenRectToPdf = (
  viewport: PageViewport,
  box: ScreenRect
): Rect => {
  const a = screenToPdf(viewport, box.left, box.top);
  const b = screenToPdf(viewport, box.left + box.width, box.top + box.height);
  return normalizeRect({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y });
};

/**
 * Length conversions. Only the scale matters — rotation never changes a
 * distance — so these avoid the round trip through two point conversions.
 */
export const pxToPt = (viewport: PageViewport, px: number) =>
  px / viewport.scale;

export const ptToPx = (viewport: PageViewport, pt: number) =>
  pt * viewport.scale;

/* -------------------------------------------------------------------------- */
/*                                  Rect math                                  */
/* -------------------------------------------------------------------------- */

/** Rewrites a rect with negative width/height as an equivalent positive one. */
export const normalizeRect = (rect: Rect): Rect => ({
  x: rect.w < 0 ? rect.x + rect.w : rect.x,
  y: rect.h < 0 ? rect.y + rect.h : rect.y,
  w: Math.abs(rect.w),
  h: Math.abs(rect.h),
});

export const rectCenter = (rect: Rect): Point => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.w &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.h;

/** Smallest rect containing all inputs, or null when given none. */
export const boundingRect = (rects: Rect[]): Rect | null => {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

/** Keeps a rect from escaping the page entirely, leaving a grab-able sliver. */
export const clampRectToPage = (
  rect: Rect,
  pageWidth: number,
  pageHeight: number,
  margin = 8
): Rect => ({
  ...rect,
  x: Math.min(Math.max(rect.x, -rect.w + margin), pageWidth - margin),
  y: Math.min(Math.max(rect.y, -rect.h + margin), pageHeight - margin),
});

/** Rotates a point about a centre. Degrees, counter-clockwise (PDF's sense). */
export const rotatePoint = (
  point: Point,
  center: Point,
  degrees: number
): Point => {
  if (degrees === 0) return point;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

/** Normalises any rotation to the nearest legal /Rotate quadrant. */
export const toQuadrant = (degrees: number): Quadrant => {
  const normalized = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return normalized as Quadrant;
};

/**
 * Page dimensions as displayed, i.e. with width and height swapped for a
 * quarter turn.
 */
export const rotatedPageSize = (
  width: number,
  height: number,
  rotation: number
) =>
  toQuadrant(rotation) % 180 === 0
    ? { width, height }
    : { width: height, height: width };

/* -------------------------------------------------------------------------- */
/*                                  Snapping                                   */
/* -------------------------------------------------------------------------- */

export interface SnapGuide {
  axis: 'x' | 'y';
  /** Position in PDF user space. */
  at: number;
}

export interface SnapResult {
  rect: Rect;
  guides: SnapGuide[];
}

/**
 * Snaps a dragged rect to page edges, page centre lines, margin guides and the
 * edges and centres of its neighbours.
 *
 * The threshold is defined in screen pixels and converted to points at the
 * current scale, so snapping feels the same whether you are at 25% or 400%.
 */
export const snapRect = (
  rect: Rect,
  pageWidth: number,
  pageHeight: number,
  neighbours: Rect[],
  scale: number
): SnapResult => {
  const threshold = SNAP_THRESHOLD_PX / scale;
  const guides: SnapGuide[] = [];

  const xTargets = [
    0,
    pageWidth / 2,
    pageWidth,
    MARGIN_GUIDE_PT,
    pageWidth - MARGIN_GUIDE_PT,
    ...neighbours.flatMap((n) => [n.x, n.x + n.w / 2, n.x + n.w]),
  ];
  const yTargets = [
    0,
    pageHeight / 2,
    pageHeight,
    MARGIN_GUIDE_PT,
    pageHeight - MARGIN_GUIDE_PT,
    ...neighbours.flatMap((n) => [n.y, n.y + n.h / 2, n.y + n.h]),
  ];

  // Leading edge, centre and trailing edge can each snap; the closest wins.
  const snapAxis = (
    start: number,
    length: number,
    targets: number[]
  ): { start: number; guide: number | null } => {
    let best: { delta: number; guide: number } | null = null;
    for (const edge of [start, start + length / 2, start + length]) {
      for (const target of targets) {
        const delta = target - edge;
        if (Math.abs(delta) <= threshold) {
          if (!best || Math.abs(delta) < Math.abs(best.delta)) {
            best = { delta, guide: target };
          }
        }
      }
    }
    return best
      ? { start: start + best.delta, guide: best.guide }
      : { start, guide: null };
  };

  const x = snapAxis(rect.x, rect.w, xTargets);
  const y = snapAxis(rect.y, rect.h, yTargets);

  if (x.guide !== null) guides.push({ axis: 'x', at: x.guide });
  if (y.guide !== null) guides.push({ axis: 'y', at: y.guide });

  return { rect: { ...rect, x: x.start, y: y.start }, guides };
};
