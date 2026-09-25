'use client';

import { useCallback, useRef, useState } from 'react';
import { DRAG_THRESHOLD_PX } from '@/lib/pdf/constants';

export interface ReorderState {
  /** Index being dragged, or -1. */
  fromIndex: number;
  /** Index it would land at if released now, or -1. */
  toIndex: number;
  /** Pointer position, for the drag ghost. */
  y: number;
}

const IDLE: ReorderState = { fromIndex: -1, toIndex: -1, y: 0 };

/**
 * Drag-to-reorder for the thumbnail rail, on pointer events.
 *
 * Pointer events rather than HTML5 drag-and-drop, and rather than a library:
 * the native drag API has no touch support at all, and one `setPointerCapture`
 * gives mouse, touch and stylus the same code path. Capturing also means the
 * drag survives the pointer leaving the rail, which the equivalent
 * mouse-move-on-window approach has to reimplement.
 *
 * Drop position is computed from the midpoints of the item rects rather than
 * from which element is under the pointer, so dragging into the gap between two
 * thumbnails still resolves to a sensible index.
 */
export function useThumbnailReorder(
  count: number,
  onReorder: (from: number, to: number) => void
) {
  const [state, setState] = useState<ReorderState>(IDLE);
  const listRef = useRef<HTMLUListElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const started = useRef(false);

  /** Midpoints of every item, measured once at drag start. */
  const midpoints = useRef<number[]>([]);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    midpoints.current = [...list.children].map((child) => {
      const rect = child.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
  }, []);

  const indexForY = useCallback((y: number) => {
    const points = midpoints.current;
    let index = points.length;
    for (let i = 0; i < points.length; i += 1) {
      if (y < points[i]) {
        index = i;
        break;
      }
    }
    return index;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent, index: number) => {
      // Only a primary press starts a drag; right-click opens the menu.
      if (event.button !== 0) return;
      origin.current = { x: event.clientX, y: event.clientY };
      started.current = false;
      setState({ fromIndex: index, toIndex: index, y: event.clientY });
    },
    []
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const from = origin.current;
      if (!from || state.fromIndex < 0) return;

      // A press that hasn't travelled far enough is still a click, so selection
      // keeps working and a shaky hand doesn't reorder the document.
      if (!started.current) {
        const distance = Math.hypot(
          event.clientX - from.x,
          event.clientY - from.y
        );
        if (distance < DRAG_THRESHOLD_PX) return;
        started.current = true;
        measure();
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const target = indexForY(event.clientY);
      setState((current) => ({
        ...current,
        toIndex: target,
        y: event.clientY,
      }));
    },
    [indexForY, measure, state.fromIndex]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const { fromIndex, toIndex } = state;
      const wasDragging = started.current;
      origin.current = null;
      started.current = false;
      setState(IDLE);

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!wasDragging || fromIndex < 0 || toIndex < 0) return;

      // Removing the dragged item shifts everything after it down by one, so a
      // drop below the original position needs the index decrementing.
      const destination = toIndex > fromIndex ? toIndex - 1 : toIndex;
      if (destination !== fromIndex && destination < count) {
        onReorder(fromIndex, destination);
      }
    },
    [count, onReorder, state]
  );

  const cancel = useCallback(() => {
    origin.current = null;
    started.current = false;
    setState(IDLE);
  }, []);

  return {
    listRef,
    state,
    handlers: {
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
    },
    onPointerDown,
  };
}
