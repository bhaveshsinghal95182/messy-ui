'use client';

import { useCallback, useRef, useState } from 'react';
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import {
  usePdfDispatch,
  usePdfState,
} from '@/components/pdf/pdf-store-provider';
import {
  normalizeRect,
  screenToPdf,
  snapRect,
  type SnapGuide,
} from '@/lib/pdf/geometry';
import { DRAG_THRESHOLD_PX } from '@/lib/pdf/constants';
import type { PageEntryId, Rect } from '@/lib/pdf/types';

/** Which handle was grabbed, or 'move' for the body, or 'rotate'. */
export type TransformHandle =
  | 'move'
  | 'rotate'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

interface DragSession {
  objectId: string;
  handle: TransformHandle;
  startRect: Rect;
  startRotation: number;
  startPoint: { x: number; y: number };
  moved: boolean;
}

/**
 * Dragging, resizing and rotating objects on a page.
 *
 * Pointer events throughout, so mouse, touch and stylus take one code path,
 * and `setPointerCapture` keeps the gesture alive when the pointer leaves the
 * page — which happens constantly when dragging something near an edge.
 *
 * Every calculation happens in PDF user space rather than screen pixels: the
 * pointer is converted once on the way in, so a drag behaves identically at any
 * zoom level and on a rotated page without any special cases.
 *
 * The whole gesture is one undo step. `BEGIN_TRANSACTION` on pointer-down means
 * the hundred `UPDATE_OBJECT`s a drag emits collapse into a single entry, so
 * undo reverses the drag rather than one frame of it.
 */
export function useObjectTransform(
  pageId: PageEntryId,
  viewport: PageViewport | null,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();
  const session = useRef<DragSession | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  /** Pointer position in PDF space, from the page container's own box. */
  const toPdfPoint = useCallback(
    (event: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container || !viewport) return null;
      const box = container.getBoundingClientRect();
      // clientX minus the container origin — never offsetX, which is relative
      // to whatever child element the pointer happens to be over.
      return screenToPdf(
        viewport,
        event.clientX - box.left,
        event.clientY - box.top
      );
    },
    [containerRef, viewport]
  );

  const begin = useCallback(
    (event: React.PointerEvent, objectId: string, handle: TransformHandle) => {
      if (event.button !== 0) return;
      const point = toPdfPoint(event);
      if (!point) return;

      const state = getState();
      const object = state.objects[pageId]?.find(
        (item) => item.id === objectId
      );
      if (!object || object.locked) return;

      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

      session.current = {
        objectId,
        handle,
        startRect: object.rect,
        startRotation: object.rotation,
        startPoint: point,
        moved: false,
      };

      // Selecting on pointer-down rather than click makes drag-to-move work on
      // an unselected object in one gesture.
      if (!state.selection.objectIds.includes(objectId)) {
        dispatch({
          type: 'SET_SELECTION',
          selection: { pageId, objectIds: [objectId] },
        });
      }
    },
    [dispatch, getState, pageId, toPdfPoint]
  );

  const move = useCallback(
    (event: React.PointerEvent) => {
      const active = session.current;
      if (!active || !viewport) return;

      const point = toPdfPoint(event);
      if (!point) return;

      const dx = point.x - active.startPoint.x;
      const dy = point.y - active.startPoint.y;

      // A press that has not travelled is still a click; without this a slight
      // tremor while selecting would nudge the object and dirty the document.
      if (!active.moved) {
        const distance = Math.hypot(dx, dy) * viewport.scale;
        if (distance < DRAG_THRESHOLD_PX) return;
        active.moved = true;
        dispatch({ type: 'BEGIN_TRANSACTION' });
      }

      const state = getState();
      const page = state.pages.find((entry) => entry.id === pageId);
      const source = page ? state.sources[page.sourceId] : undefined;
      const size = source?.pageSizes[page!.sourceIndex];
      const pageWidth = size?.width ?? 612;
      const pageHeight = size?.height ?? 792;

      if (active.handle === 'rotate') {
        const centre = {
          x: active.startRect.x + active.startRect.w / 2,
          y: active.startRect.y + active.startRect.h / 2,
        };
        const angle =
          (Math.atan2(point.y - centre.y, point.x - centre.x) * 180) / Math.PI;
        // Shift constrains to 15° steps, the usual convention for "keep it tidy".
        const rotation = event.shiftKey ? Math.round(angle / 15) * 15 : angle;
        dispatch({
          type: 'UPDATE_OBJECT',
          pageId,
          objectId: active.objectId,
          patch: { rotation: Math.round(rotation) },
        });
        return;
      }

      let next = resizeRect(active.startRect, active.handle, dx, dy, {
        preserveAspect: event.shiftKey,
        fromCentre: event.altKey,
      });

      // Ctrl/Cmd suppresses snapping, for when you need an exact position that
      // happens to sit near a guide.
      if (!event.ctrlKey && !event.metaKey) {
        const neighbours = (state.objects[pageId] ?? [])
          .filter((item) => item.id !== active.objectId)
          .map((item) => item.rect);
        const snapped = snapRect(
          next,
          pageWidth,
          pageHeight,
          neighbours,
          viewport.scale
        );
        next = snapped.rect;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }

      dispatch({
        type: 'UPDATE_OBJECT',
        pageId,
        objectId: active.objectId,
        patch: { rect: normalizeRect(next) },
      });
    },
    [dispatch, getState, pageId, toPdfPoint, viewport]
  );

  const end = useCallback(
    (event: React.PointerEvent) => {
      const active = session.current;
      session.current = null;
      setGuides([]);

      const target = event.currentTarget as HTMLElement;
      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      if (active?.moved) dispatch({ type: 'COMMIT_TRANSACTION' });
    },
    [dispatch]
  );

  return { begin, move, end, guides };
}

/**
 * Applies a resize to a rect.
 *
 * Written against the four edges rather than x/y/w/h so that dragging a west
 * handle past the east one produces a valid inverted rect, which `normalizeRect`
 * then flips — matching how every drawing tool behaves.
 */
function resizeRect(
  start: Rect,
  handle: TransformHandle,
  dx: number,
  dy: number,
  options: { preserveAspect: boolean; fromCentre: boolean }
): Rect {
  if (handle === 'move') {
    return { ...start, x: start.x + dx, y: start.y + dy };
  }

  let { x, y, w, h } = start;
  let left = x;
  let bottom = y;
  let right = x + w;
  let top = y + h;

  // PDF space is y-up, so a 'n' handle moves the *top* edge with +dy.
  if (handle.includes('n')) top += dy;
  if (handle.includes('s')) bottom += dy;
  if (handle.includes('e')) right += dx;
  if (handle.includes('w')) left += dx;

  if (options.fromCentre) {
    if (handle.includes('n')) bottom -= dy;
    if (handle.includes('s')) top -= dy;
    if (handle.includes('e')) left -= dx;
    if (handle.includes('w')) right += -dx;
  }

  x = left;
  y = bottom;
  w = right - left;
  h = top - bottom;

  if (options.preserveAspect && start.w !== 0 && start.h !== 0) {
    const ratio = start.h / start.w;
    const width = Math.abs(w);
    const height = width * ratio;
    // Grow from whichever corner is anchored, so the fixed edge stays put.
    if (handle.includes('s')) y = top - Math.sign(h || 1) * height;
    h = Math.sign(h || 1) * height;
  }

  return { x, y, w, h };
}
