'use client';

import { useCallback, useRef, useState } from 'react';
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import {
  usePdfDispatch,
  usePdfState,
} from '@/components/pdf/pdf-store-provider';
import { boundingRect, normalizeRect, screenToPdf } from '@/lib/pdf/geometry';
import { newId } from '@/lib/pdf/reducer';
import type {
  PageEntryId,
  PdfObject,
  Point,
  Rect,
  ToolId,
} from '@/lib/pdf/types';

/**
 * Creating objects by dragging on a page.
 *
 * Two shapes of gesture: most tools drag out a bounding box, while ink collects
 * the whole pointer trail. Both are committed as a single object on pointer-up,
 * so an abandoned drag leaves nothing behind and undo removes the object rather
 * than a fragment of it.
 */
export function useDrawObject(
  pageId: PageEntryId,
  viewport: PageViewport | null,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();

  const start = useRef<Point | null>(null);
  const trail = useRef<Point[]>([]);
  const [preview, setPreview] = useState<{
    rect: Rect;
    points: Point[];
  } | null>(null);

  const toPdfPoint = useCallback(
    (event: React.PointerEvent): Point | null => {
      const container = containerRef.current;
      if (!container || !viewport) return null;
      const box = container.getBoundingClientRect();
      return screenToPdf(
        viewport,
        event.clientX - box.left,
        event.clientY - box.top
      );
    },
    [containerRef, viewport]
  );

  const begin = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const point = toPdfPoint(event);
      if (!point) return;

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      start.current = point;
      trail.current = [point];
      setPreview({
        rect: { x: point.x, y: point.y, w: 0, h: 0 },
        points: [point],
      });
    },
    [toPdfPoint]
  );

  const move = useCallback(
    (event: React.PointerEvent) => {
      const origin = start.current;
      if (!origin) return;
      const point = toPdfPoint(event);
      if (!point) return;

      trail.current.push(point);
      setPreview({
        rect: {
          x: origin.x,
          y: origin.y,
          w: point.x - origin.x,
          h: point.y - origin.y,
        },
        points: [...trail.current],
      });
    },
    [toPdfPoint]
  );

  const end = useCallback(
    (event: React.PointerEvent) => {
      const origin = start.current;
      const points = trail.current;
      start.current = null;
      trail.current = [];
      setPreview(null);

      const target = event.currentTarget as HTMLElement;
      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      if (!origin) return;

      const state = getState();
      const tool = state.activeTool;
      const settings = state.toolDefaults[tool];
      const last = points.at(-1) ?? origin;

      const object = buildObject(tool, {
        origin,
        last,
        points,
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        fontSize: settings.fontSize,
        opacity: settings.opacity,
        z: (state.objects[pageId]?.length ?? 0) + 1,
      });

      if (object) {
        dispatch({ type: 'ADD_OBJECT', pageId, object });
        // Drop back to select so the new object can be positioned immediately,
        // rather than the next click drawing another one.
        dispatch({ type: 'SET_TOOL', tool: 'select' });
        dispatch({
          type: 'SET_SELECTION',
          selection: { pageId, objectIds: [object.id] },
        });
      }
    },
    [dispatch, getState, pageId]
  );

  return { begin, move, end, preview };
}

interface BuildContext {
  origin: Point;
  last: Point;
  points: Point[];
  color: { r: number; g: number; b: number };
  strokeWidth: number;
  fontSize: number;
  opacity: number;
  z: number;
}

/** Minimum size for a click-without-drag, so a stray click still makes a usable box. */
const DEFAULT_BOX = { w: 160, h: 40 };

function buildObject(tool: ToolId, ctx: BuildContext): PdfObject | null {
  const dragged = normalizeRect({
    x: ctx.origin.x,
    y: ctx.origin.y,
    w: ctx.last.x - ctx.origin.x,
    h: ctx.last.y - ctx.origin.y,
  });

  // A click rather than a drag: place a default-sized object at the click.
  const rect =
    dragged.w < 4 || dragged.h < 4
      ? {
          x: ctx.origin.x,
          y: ctx.origin.y - DEFAULT_BOX.h,
          w: DEFAULT_BOX.w,
          h: DEFAULT_BOX.h,
        }
      : dragged;

  const base = {
    id: newId(),
    rect,
    rotation: 0,
    opacity: ctx.opacity,
    locked: false,
    z: ctx.z,
    createdAt: Date.now(),
  };

  switch (tool) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        text: '',
        fontId: 'Helvetica',
        size: ctx.fontSize,
        color: ctx.color,
        align: 'left',
        lineHeight: 1.2,
        bold: false,
        italic: false,
        autoSize: false,
      };

    case 'ink': {
      if (ctx.points.length < 2) return null;
      // The bounding box comes from the stroke itself, padded by the stroke
      // width so the ends of a line are not clipped by their own box.
      const bounds =
        boundingRect(
          ctx.points.map((point) => ({ x: point.x, y: point.y, w: 0, h: 0 }))
        ) ?? rect;
      const pad = ctx.strokeWidth;
      return {
        ...base,
        kind: 'ink',
        rect: {
          x: bounds.x - pad,
          y: bounds.y - pad,
          w: bounds.w + pad * 2,
          h: bounds.h + pad * 2,
        },
        points: ctx.points,
        strokeWidth: ctx.strokeWidth,
        color: ctx.color,
      };
    }

    case 'highlight':
      return {
        ...base,
        kind: 'highlight',
        color: ctx.color,
        quads: [rect],
      };

    case 'whiteout':
      return { ...base, kind: 'whiteout', color: ctx.color };

    case 'redaction':
      return { ...base, kind: 'redaction', label: null };

    case 'note':
      return {
        ...base,
        kind: 'note',
        rect: { ...rect, w: 24, h: 24 },
        body: '',
        author: '',
        color: { r: 1, g: 0.85, b: 0.3 },
        open: false,
      };

    case 'rect':
    case 'ellipse':
    case 'line':
    case 'arrow':
      return {
        ...base,
        kind: 'shape',
        shape: tool,
        stroke: ctx.color,
        fill: null,
        strokeWidth: ctx.strokeWidth,
        dash: null,
        arrowHead: tool === 'arrow' ? 'end' : 'none',
      };

    // Images and signatures are placed from their dialogs, not drawn.
    default:
      return null;
  }
}
