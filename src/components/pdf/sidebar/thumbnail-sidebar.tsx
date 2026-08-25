'use client';

import { useCallback, useMemo } from 'react';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
import ThumbnailItem, { type PageActions } from './thumbnail-item';
import { useThumbnailReorder } from '@/hooks/use-thumbnail-reorder';
import { useExportPdf } from '@/hooks/use-export-pdf';
import { effectiveRotation } from '@/lib/pdf/document';

/**
 * The page thumbnail rail: navigation, drag-to-reorder, and per-page actions.
 *
 * Page selection here is separate from object selection, which is what lets a
 * page operation apply to the page you clicked rather than to whatever
 * annotation happened to be focused.
 */
const ThumbnailSidebar = () => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();
  const { downloadChunks } = useExportPdf();

  const pages = usePdf((state) => state.pages);
  const sources = usePdf((state) => state.sources);
  const selectedPageId = usePdf((state) => state.selection.pageId);

  const handleSelect = useCallback(
    (pageId: string) => {
      dispatch({ type: 'SET_SELECTION', selection: { pageId, objectIds: [] } });

      // Bring the page into view in the main list. Querying the DOM keeps the
      // two panes decoupled rather than threading a ref between them.
      document
        .querySelector<HTMLElement>(`[data-page-id="${CSS.escape(pageId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (getState().view.currentPageId !== pageId) {
        dispatch({ type: 'SET_VIEW', patch: { currentPageId: pageId } });
      }
    },
    [dispatch, getState]
  );

  const handleReorder = useCallback(
    (from: number, to: number) => dispatch({ type: 'MOVE_PAGE', from, to }),
    [dispatch]
  );

  const {
    listRef,
    state: dragState,
    handlers,
    onPointerDown,
  } = useThumbnailReorder(pages.length, handleReorder);

  const actions = useMemo<PageActions>(
    () => ({
      rotate: (pageId, delta) =>
        dispatch({ type: 'ROTATE_PAGES', pageIds: [pageId], delta }),
      duplicate: (pageId) =>
        dispatch({ type: 'DUPLICATE_PAGES', pageIds: [pageId] }),
      remove: (pageId) => dispatch({ type: 'DELETE_PAGES', pageIds: [pageId] }),
      extract: (pageId) => {
        const page = getState().pages.find((entry) => entry.id === pageId);
        if (page) void downloadChunks([[page]]);
      },
    }),
    [dispatch, downloadChunks, getState]
  );

  if (pages.length === 0) return null;

  return (
    <nav
      aria-label="Page thumbnails"
      className="bg-card h-full overflow-y-auto border-r"
    >
      <ul ref={listRef} className="space-y-1 p-2" {...handlers}>
        {pages.map((entry, index) => (
          <li key={entry.id}>
            <ThumbnailItem
              entry={entry}
              pageNumber={index + 1}
              rotation={effectiveRotation(
                entry,
                sources[entry.sourceId]?.pageSizes[entry.sourceIndex]
              )}
              selected={selectedPageId === entry.id}
              dragging={dragState.fromIndex === index}
              dropBefore={
                dragState.fromIndex >= 0 &&
                dragState.toIndex === index &&
                dragState.fromIndex !== index
              }
              onSelect={handleSelect}
              onPointerDown={(event) => onPointerDown(event, index)}
              actions={actions}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ThumbnailSidebar;
