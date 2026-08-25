'use client';

import { useEffect } from 'react';
import {
  usePdfDispatch,
  usePdfState,
} from '@/components/pdf/pdf-store-provider';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '@/lib/pdf/constants';

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
          dispatch({
            type: 'SET_SELECTION',
            selection: { pageId: null, objectIds: [] },
          });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, getState, onDownload, onOpen, onPrint]);
}
