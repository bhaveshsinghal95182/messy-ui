'use client';

import { useCallback } from 'react';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
import ThumbnailItem from './thumbnail-item';
import { effectiveRotation } from '@/lib/pdf/document';

/**
 * The page thumbnail rail.
 *
 * Selection here is page-level and independent of object selection, which is
 * what makes bulk page operations (rotate, delete, extract) possible in later
 * phases. Shift/Cmd-click extends the selection.
 */
const ThumbnailSidebar = () => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();

  const pages = usePdf((state) => state.pages);
  const sources = usePdf((state) => state.sources);
  const selectedPageId = usePdf((state) => state.selection.pageId);

  const handleSelect = useCallback(
    (pageId: string) => {
      dispatch({
        type: 'SET_SELECTION',
        selection: { pageId, objectIds: [] },
      });

      // Bring the page into view in the main list. Reading the DOM directly
      // rather than threading a ref through avoids coupling the two panes.
      const target = document.querySelector<HTMLElement>(
        `[data-page-id="${CSS.escape(pageId)}"]`
      );
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Keep the indicator honest even if the scroll is interrupted.
      if (getState().view.currentPageId !== pageId) {
        dispatch({ type: 'SET_VIEW', patch: { currentPageId: pageId } });
      }
    },
    [dispatch, getState]
  );

  if (pages.length === 0) return null;

  return (
    <nav
      aria-label="Page thumbnails"
      className="bg-card h-full overflow-y-auto border-r"
    >
      <ul className="space-y-1 p-2">
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
              onSelect={handleSelect}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ThumbnailSidebar;
