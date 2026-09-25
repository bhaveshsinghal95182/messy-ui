import { useCallback, useRef, useSyncExternalStore } from 'react';
import { createInitialState } from './constants';
import { pdfReducer } from './reducer';
import type { PdfAction, PdfEditorState } from './types';

/**
 * A minimal external store for the editor.
 *
 * Context + `useReducer` is the wrong shape for this workload: a document with
 * hundreds of pages and dozens of objects per page would re-render every
 * consumer on every pointer-move during a drag. An external store lets each
 * component subscribe to just the slice it renders, so dragging one object
 * re-renders that object and nothing else.
 *
 * Zustand would do the same job, but this codebase deliberately carries no
 * global state library, and the whole mechanism is a few dozen lines.
 */

type Listener = () => void;

export interface PdfStore {
  getState: () => PdfEditorState;
  dispatch: (action: PdfAction) => void;
  subscribe: (listener: Listener) => () => void;
}

export const createPdfStore = (
  initial: PdfEditorState = createInitialState()
): PdfStore => {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    dispatch: (action) => {
      const next = pdfReducer(state, action);
      // Reducers return the same reference when an action is a no-op, which
      // keeps a rejected drag or a redundant selection from waking every
      // subscriber.
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * Subscribes to a slice of the store.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a referentially
 * stable value for unchanged state, or React loops forever. Selectors that
 * derive a new array or object each call (`pages.map(...)`) would do exactly
 * that, so the last result is cached and reused whenever the underlying state
 * object is identical.
 *
 * Selecting primitives, or slices that the immutable reducer already keeps
 * stable, remains the cheapest option and is what callers should prefer.
 */
export function usePdfStore<T>(
  store: PdfStore,
  selector: (state: PdfEditorState) => T
): T {
  const cache = useRef<{ state: PdfEditorState; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = store.getState();
    if (cache.current && cache.current.state === state) {
      return cache.current.value;
    }
    const value = selector(state);
    cache.current = { state, value };
    return value;
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
