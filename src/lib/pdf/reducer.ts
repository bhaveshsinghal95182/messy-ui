import { createInitialState } from './constants';
import {
  beginTransaction,
  commitTransaction,
  redo,
  undo,
  withHistory,
} from './history';
import { toQuadrant } from './geometry';
import type {
  PageEntry,
  PageEntryId,
  PdfAction,
  PdfEditorState,
  PdfObject,
} from './types';

/**
 * The editor's reducer.
 *
 * Every case returns new objects rather than mutating. That is not merely
 * idiomatic here — the React Compiler is enabled for this project, so a mutated
 * object keeps its identity, the compiler correctly concludes nothing changed,
 * and the UI silently fails to re-render. Mutating `object.rect.x` in place is
 * the single most likely source of a "why isn't it moving" bug in this feature.
 *
 * Cases that change the document go through `withHistory`; cases that only
 * change view, tool or status state do not.
 */
export function pdfReducer(
  state: PdfEditorState,
  action: PdfAction
): PdfEditorState {
  switch (action.type) {
    /* ------------------------------ Sources ------------------------------ */

    case 'ADD_SOURCE': {
      const next: PdfEditorState = {
        ...state,
        sources: { ...state.sources, [action.source.id]: action.source },
        pages: [...state.pages, ...action.entries],
        view: {
          ...state.view,
          currentPageId:
            state.view.currentPageId ?? action.entries[0]?.id ?? null,
        },
        // The first file opened names the export and seeds its metadata.
        exportSettings:
          state.pages.length === 0
            ? {
                ...state.exportSettings,
                filename: suggestFilename(action.source.name),
              }
            : state.exportSettings,
      };
      return withHistory(state, next);
    }

    case 'REMOVE_SOURCE': {
      const { [action.sourceId]: removed, ...sources } = state.sources;
      if (!removed) return state;
      const pages = state.pages.filter(
        (page) => page.sourceId !== action.sourceId
      );
      return withHistory(state, {
        ...state,
        sources,
        pages,
        objects: pruneObjects(state.objects, pages),
        selection: { pageId: null, objectIds: [] },
      });
    }

    /* ------------------------------- Pages ------------------------------- */

    case 'SET_PAGES':
      return withHistory(state, {
        ...state,
        pages: action.pages,
        objects: pruneObjects(state.objects, action.pages),
      });

    case 'MOVE_PAGE': {
      const { from, to } = action;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.pages.length ||
        to >= state.pages.length
      ) {
        return state;
      }
      const pages = [...state.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return withHistory(state, { ...state, pages });
    }

    case 'DELETE_PAGES': {
      const removing = new Set(action.pageIds);
      const pages = state.pages.filter((page) => !removing.has(page.id));
      if (pages.length === state.pages.length) return state;
      return withHistory(state, {
        ...state,
        pages,
        objects: pruneObjects(state.objects, pages),
        selection: { pageId: null, objectIds: [] },
        view: {
          ...state.view,
          currentPageId: pages.some((p) => p.id === state.view.currentPageId)
            ? state.view.currentPageId
            : (pages[0]?.id ?? null),
        },
      });
    }

    case 'DUPLICATE_PAGES': {
      const duplicating = new Set(action.pageIds);
      const objects = { ...state.objects };
      const pages: PageEntry[] = [];
      for (const page of state.pages) {
        pages.push(page);
        if (!duplicating.has(page.id)) continue;
        const copy: PageEntry = { ...page, id: newId() };
        pages.push(copy);
        // A duplicated page carries its annotations, each needing a fresh id.
        const existing = state.objects[page.id];
        if (existing?.length) {
          objects[copy.id] = existing.map((object) => ({
            ...object,
            id: newId(),
          }));
        }
      }
      if (pages.length === state.pages.length) return state;
      return withHistory(state, { ...state, pages, objects });
    }

    case 'ROTATE_PAGES': {
      const rotating = new Set(action.pageIds);
      if (rotating.size === 0) return state;
      return withHistory(state, {
        ...state,
        pages: state.pages.map((page) =>
          rotating.has(page.id)
            ? { ...page, rotation: toQuadrant(page.rotation + action.delta) }
            : page
        ),
      });
    }

    case 'SET_CROP':
      return withHistory(state, {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, crop: action.crop } : page
        ),
      });

    /* ------------------------------ Objects ------------------------------ */

    case 'ADD_OBJECT': {
      const existing = state.objects[action.pageId] ?? [];
      return withHistory(state, {
        ...state,
        objects: {
          ...state.objects,
          [action.pageId]: [...existing, action.object],
        },
        selection: { pageId: action.pageId, objectIds: [action.object.id] },
      });
    }

    case 'UPDATE_OBJECT':
      return applyPatches(state, action.pageId, [
        { objectId: action.objectId, patch: action.patch },
      ]);

    case 'UPDATE_OBJECTS':
      return applyPatches(state, action.pageId, action.patches);

    case 'DELETE_OBJECTS': {
      const existing = state.objects[action.pageId];
      if (!existing?.length) return state;
      const removing = new Set(action.objectIds);
      const remaining = existing.filter((object) => !removing.has(object.id));
      if (remaining.length === existing.length) return state;
      return withHistory(state, {
        ...state,
        objects: { ...state.objects, [action.pageId]: remaining },
        selection: { pageId: action.pageId, objectIds: [] },
      });
    }

    case 'REORDER_OBJECT': {
      const existing = state.objects[action.pageId];
      if (!existing?.length) return state;
      const target = existing.find((object) => object.id === action.objectId);
      if (!target) return state;

      const zs = existing.map((object) => object.z);
      const min = Math.min(...zs);
      const max = Math.max(...zs);
      const z =
        action.to === 'front'
          ? max + 1
          : action.to === 'back'
            ? min - 1
            : action.to === 'forward'
              ? target.z + 1.5
              : target.z - 1.5;

      // Re-densify so repeated nudges can't drift z into floating-point noise.
      const reordered = [...existing]
        .map((object) =>
          object.id === action.objectId ? { ...object, z } : object
        )
        .sort((a, b) => a.z - b.z)
        .map((object, index) => ({ ...object, z: index }));

      return withHistory(state, {
        ...state,
        objects: { ...state.objects, [action.pageId]: reordered },
      });
    }

    /* ---------------------- Selection, tools, view ----------------------- */

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'SET_TOOL':
      return {
        ...state,
        activeTool: action.tool,
        // Switching away from select abandons the selection, so the properties
        // panel reflects the new tool rather than a stale object.
        selection:
          action.tool === 'select'
            ? state.selection
            : { pageId: null, objectIds: [] },
      };

    case 'SET_TOOL_DEFAULTS':
      return {
        ...state,
        toolDefaults: {
          ...state.toolDefaults,
          [action.tool]: {
            ...state.toolDefaults[action.tool],
            ...action.patch,
          },
        },
      };

    case 'SET_VIEW':
      return { ...state, view: { ...state.view, ...action.patch } };

    /* ------------------------ Document properties ------------------------ */

    case 'SET_METADATA':
      return withHistory(state, {
        ...state,
        metadata: { ...state.metadata, ...action.patch },
      });

    case 'SET_FORM_VALUE':
      return withHistory(state, {
        ...state,
        forms: { ...state.forms, [action.field]: action.value },
      });

    case 'SET_EXPORT_SETTINGS':
      return {
        ...state,
        exportSettings: { ...state.exportSettings, ...action.patch },
      };

    case 'SET_STATUS':
      return { ...state, status: { ...state.status, ...action.patch } };

    /* ------------------------------ History ------------------------------ */

    case 'BEGIN_TRANSACTION':
      return beginTransaction(state);

    case 'COMMIT_TRANSACTION':
      return commitTransaction(state);

    case 'UNDO':
      return undo(state);

    case 'REDO':
      return redo(state);

    case 'RESET':
      return createInitialState();

    default: {
      // Exhaustiveness: adding an action without a case fails the build here.
      const never: never = action;
      return never;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                   */
/* -------------------------------------------------------------------------- */

/** `crypto.randomUUID` needs a secure context; the fallback keeps dev on http. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Drops object lists whose page no longer exists, so state can't leak. */
const pruneObjects = (
  objects: Record<PageEntryId, PdfObject[]>,
  pages: PageEntry[]
): Record<PageEntryId, PdfObject[]> => {
  const live = new Set(pages.map((page) => page.id));
  const next: Record<PageEntryId, PdfObject[]> = {};
  for (const [pageId, list] of Object.entries(objects)) {
    if (live.has(pageId)) next[pageId] = list;
  }
  return next;
};

const applyPatches = (
  state: PdfEditorState,
  pageId: PageEntryId,
  patches: { objectId: string; patch: Partial<PdfObject> }[]
): PdfEditorState => {
  const existing = state.objects[pageId];
  if (!existing?.length || patches.length === 0) return state;

  const byId = new Map(patches.map((entry) => [entry.objectId, entry.patch]));
  let changed = false;
  const updated = existing.map((object) => {
    const patch = byId.get(object.id);
    if (!patch || object.locked) return object;
    changed = true;
    // The cast is needed because Partial<PdfObject> is a union of partials;
    // callers only ever patch fields belonging to the object's own variant.
    return { ...object, ...patch } as PdfObject;
  });

  if (!changed) return state;
  return withHistory(state, {
    ...state,
    objects: { ...state.objects, [pageId]: updated },
  });
};

/** "report.pdf" stays as-is; "report" gains the extension. */
const suggestFilename = (name: string): string =>
  name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
