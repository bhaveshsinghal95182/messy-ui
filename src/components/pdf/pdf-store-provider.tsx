'use client';

import { createContext, useContext, useState } from 'react';
import { createInitialState } from '@/lib/pdf/constants';
import { createPdfStore, usePdfStore, type PdfStore } from '@/lib/pdf/store';
import type { PdfAction, PdfEditorState } from '@/lib/pdf/types';

/**
 * Provides the editor store.
 *
 * The store instance is created once via lazy `useState` and never replaced, so
 * the context value is referentially stable for the lifetime of the workspace.
 * That matters: a context whose value changes re-renders every consumer, which
 * is exactly what using an external store is meant to avoid.
 */

const PdfStoreContext = createContext<PdfStore | null>(null);

export function PdfStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createPdfStore(createInitialState()));
  return (
    <PdfStoreContext.Provider value={store}>
      {children}
    </PdfStoreContext.Provider>
  );
}

const useStore = (): PdfStore => {
  const store = useContext(PdfStoreContext);
  if (!store) {
    throw new Error('PDF components must be rendered inside PdfStoreProvider');
  }
  return store;
};

/**
 * Subscribes to a slice of editor state.
 *
 * Keep selectors narrow — a component that selects `state.pages` re-renders on
 * every page change, whereas one selecting `state.pages.length` re-renders only
 * when the count changes.
 */
export function usePdf<T>(selector: (state: PdfEditorState) => T): T {
  return usePdfStore(useStore(), selector);
}

/** Stable dispatch, safe to use in effects and event handlers without deps. */
export function usePdfDispatch(): (action: PdfAction) => void {
  return useStore().dispatch;
}

/**
 * Escape hatch for reading state outside of render — inside a pointer handler
 * or an async export, where subscribing would be wrong.
 */
export function usePdfState(): () => PdfEditorState {
  return useStore().getState;
}
