import { HISTORY_LIMIT } from './constants';
import type { HistorySnapshot, PdfEditorState } from './types';

/**
 * Undo/redo over the document slice of state.
 *
 * Only `{ pages, objects, metadata, forms }` is captured — view state, tool
 * selection and status are deliberately excluded, because undoing a zoom or a
 * tool change is never what anyone means by "undo".
 *
 * Snapshots are shallow copies. Since every reducer case returns new objects
 * rather than mutating, unchanged pages and objects are shared by reference
 * between snapshots, so a 50-deep history of a 500-page document costs a few
 * hundred pointers rather than 50 copies of the document.
 */

export const snapshot = (state: PdfEditorState): HistorySnapshot => ({
  pages: state.pages,
  objects: state.objects,
  metadata: state.metadata,
  forms: state.forms,
});

const restore = (
  state: PdfEditorState,
  entry: HistorySnapshot
): PdfEditorState => ({
  ...state,
  pages: entry.pages,
  objects: entry.objects,
  metadata: entry.metadata,
  forms: entry.forms,
});

/**
 * Records the pre-change state before a document-mutating action.
 *
 * During a transaction (a pointer drag) this is a no-op after the first call,
 * so a drag that fires a hundred `UPDATE_OBJECT`s collapses into one undo step
 * rather than a hundred.
 */
export const withHistory = (
  state: PdfEditorState,
  next: PdfEditorState
): PdfEditorState => {
  if (state.history.inTransaction) {
    return { ...next, dirty: true, history: state.history };
  }
  const past = [...state.history.past, snapshot(state)];
  return {
    ...next,
    dirty: true,
    history: {
      past: past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past,
      future: [],
      inTransaction: false,
    },
  };
};

export const undo = (state: PdfEditorState): PdfEditorState => {
  const previous = state.history.past.at(-1);
  if (!previous) return state;
  return {
    ...restore(state, previous),
    dirty: true,
    selection: { pageId: null, objectIds: [] },
    history: {
      past: state.history.past.slice(0, -1),
      future: [snapshot(state), ...state.history.future],
      inTransaction: false,
    },
  };
};

export const redo = (state: PdfEditorState): PdfEditorState => {
  const [next, ...rest] = state.history.future;
  if (!next) return state;
  return {
    ...restore(state, next),
    dirty: true,
    selection: { pageId: null, objectIds: [] },
    history: {
      past: [...state.history.past, snapshot(state)],
      future: rest,
      inTransaction: false,
    },
  };
};

/**
 * Opens a transaction, capturing the state a whole drag will undo back to.
 *
 * The snapshot is pushed here rather than at commit time so that a drag
 * cancelled midway (pointercancel) still leaves a coherent history.
 */
export const beginTransaction = (state: PdfEditorState): PdfEditorState => {
  if (state.history.inTransaction) return state;
  const past = [...state.history.past, snapshot(state)];
  return {
    ...state,
    history: {
      past: past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past,
      future: [],
      inTransaction: true,
    },
  };
};

export const commitTransaction = (state: PdfEditorState): PdfEditorState =>
  state.history.inTransaction
    ? { ...state, history: { ...state.history, inTransaction: false } }
    : state;
