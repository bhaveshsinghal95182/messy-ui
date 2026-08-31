'use client';

import { useEffect } from 'react';
import {
  usePdfDispatch,
  usePdfState,
} from '@/components/pdf/pdf-store-provider';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  NUDGE_LARGE_PT,
  NUDGE_PT,
  ZOOM_STEP,
} from '@/lib/pdf/constants';
import type { ToolId } from '@/lib/pdf/types';

/** Single-letter tool switches, mirroring the labels in the toolbar tooltips. */
const TOOL_KEYS: Record<string, ToolId> = {
  v: 'select',
  t: 'text',
  d: 'ink',
  h: 'highlight',
  r: 'rect',
  e: 'ellipse',
  l: 'line',
  a: 'arrow',
  w: 'whiteout',
  n: 'note',
  k: 'link',
  x: 'redaction',
};

interface ShortcutHandlers {
  onOpen: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

/** True when the user is typing, so shortcuts must not steal the keystroke. */
const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
};

/**
 * Global keyboard shortcuts for the editor.
 *
 * Bound to the window rather than a focused element so they work wherever the
 * user is in the workspace, which means every handler has to check first that
 * the keystroke was not meant for a text field.
 */
export function useKeyboardShortcuts({
  onOpen,
  onDownload,
  onPrint,
}: ShortcutHandlers) {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;

      if (meta) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
            return;
          case 'y':
            // Windows convention for redo.
            event.preventDefault();
            dispatch({ type: 'REDO' });
            return;
          case 's':
            event.preventDefault();
            onDownload();
            return;
          case 'o':
            event.preventDefault();
            onOpen();
            return;
          case 'p':
            event.preventDefault();
            onPrint();
            return;
          default:
            break;
        }
      }

      const setZoom = (next: number) =>
        dispatch({
          type: 'SET_VIEW',
          patch: {
            zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)),
            fit: 'none',
          },
        });

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          setZoom(getState().view.zoom * ZOOM_STEP);
          break;
        case '-':
          event.preventDefault();
          setZoom(getState().view.zoom / ZOOM_STEP);
          break;
        case '0':
          event.preventDefault();
          dispatch({ type: 'SET_VIEW', patch: { fit: 'width' } });
          break;
        case '[':
        case ']': {
          const { selection } = getState();
          if (!selection.pageId) break;
          event.preventDefault();
          dispatch({
            type: 'ROTATE_PAGES',
            pageIds: [selection.pageId],
            delta: event.key === '[' ? -90 : 90,
          });
          break;
        }
        case 'Escape':
          // Escape both drops the selection and returns to the select tool, so
          // one key always gets you out of whatever mode you are in.
          dispatch({
            type: 'SET_SELECTION',
            selection: { pageId: null, objectIds: [] },
          });
          dispatch({ type: 'SET_TOOL', tool: 'select' });
          break;

        case 'Delete':
        case 'Backspace': {
          const { selection } = getState();
          if (!selection.pageId || selection.objectIds.length === 0) break;
          event.preventDefault();
          dispatch({
            type: 'DELETE_OBJECTS',
            pageId: selection.pageId,
            objectIds: selection.objectIds,
          });
          break;
        }

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          const state = getState();
          const { selection } = state;
          if (!selection.pageId || selection.objectIds.length === 0) break;
          event.preventDefault();

          const step = event.shiftKey ? NUDGE_LARGE_PT : NUDGE_PT;
          // PDF space is y-up, so ArrowUp increases y.
          const dx =
            event.key === 'ArrowLeft'
              ? -step
              : event.key === 'ArrowRight'
                ? step
                : 0;
          const dy =
            event.key === 'ArrowDown'
              ? -step
              : event.key === 'ArrowUp'
                ? step
                : 0;

          const objects = state.objects[selection.pageId] ?? [];
          dispatch({
            type: 'UPDATE_OBJECTS',
            pageId: selection.pageId,
            patches: selection.objectIds.flatMap((objectId) => {
              const object = objects.find((item) => item.id === objectId);
              if (!object) return [];
              return [
                {
                  objectId,
                  patch: {
                    rect: {
                      ...object.rect,
                      x: object.rect.x + dx,
                      y: object.rect.y + dy,
                    },
                  },
                },
              ];
            }),
          });
          break;
        }

        default: {
          // Single-letter tool switches, the convention in every design tool.
          const tool = TOOL_KEYS[event.key.toLowerCase()];
          if (tool && !event.altKey) {
            event.preventDefault();
            dispatch({ type: 'SET_TOOL', tool });
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, getState, onDownload, onOpen, onPrint]);
}
