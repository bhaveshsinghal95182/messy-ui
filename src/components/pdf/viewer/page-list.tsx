'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import PageView from './page-view';
import { useVirtualPages } from '@/hooks/use-virtual-pages';
import { effectiveRotation } from '@/lib/pdf/document';
import { rotatedPageSize } from '@/lib/pdf/geometry';
import { MAX_ZOOM, MIN_ZOOM, PAGE_GAP } from '@/lib/pdf/constants';

/** Horizontal breathing room either side of the page in fit-width mode. */
const HORIZONTAL_PADDING = 48;

/**
 * The scrolling document view.
 *
 * Layout is absolute rather than flow: the container is given the exact total
 * height of every page, and each page is positioned at its computed offset.
 * That keeps the scrollbar honest while only a handful of pages are mounted.
 */
const PageList = () => {
  const dispatch = usePdfDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);

  const pages = usePdf((state) => state.pages);
  const sources = usePdf((state) => state.sources);
  const zoom = usePdf((state) => state.view.zoom);
  const fit = usePdf((state) => state.view.fit);

  /** Each page's unscaled displayed size, i.e. with rotation applied. */
  const naturalSizes = useMemo(
    () =>
      pages.map((entry) => {
        const size = sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
        const width = entry.crop?.w ?? size?.width ?? 612;
        const height = entry.crop?.h ?? size?.height ?? 792;
        return rotatedPageSize(width, height, effectiveRotation(entry, size));
      }),
    [pages, sources]
  );

  /**
   * In fit modes the zoom stored in state is derived from the container rather
   * than chosen by the user, so resizing the window keeps the fit.
   */
  const applyFit = useCallback(() => {
    const element = scrollRef.current;
    if (!element || fit === 'none' || naturalSizes.length === 0) return;

    const widest = Math.max(...naturalSizes.map((size) => size.width));
    const tallest = Math.max(...naturalSizes.map((size) => size.height));
    const available = element.clientWidth - HORIZONTAL_PADDING;
    const next =
      fit === 'width'
        ? available / widest
        : Math.min(
            available / widest,
            (element.clientHeight - PAGE_GAP * 2) / tallest
          );

    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (Math.abs(clamped - zoom) > 0.001) {
      dispatch({ type: 'SET_VIEW', patch: { zoom: clamped } });
    }
  }, [dispatch, fit, naturalSizes, zoom]);

  useEffect(() => {
    applyFit();
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(applyFit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [applyFit]);

  const scaled = useMemo(
    () =>
      pages.map((entry, index) => ({
        id: entry.id,
        height: naturalSizes[index].height * zoom,
      })),
    [naturalSizes, pages, zoom]
  );

  const { virtualPages, totalHeight, currentIndex } = useVirtualPages(
    scaled,
    scrollRef
  );

  // Keep the toolbar's page indicator in step with the scroll position.
  const currentPageId = pages[currentIndex]?.id ?? null;
  const storedPageId = usePdf((state) => state.view.currentPageId);
  useEffect(() => {
    if (currentPageId && currentPageId !== storedPageId) {
      dispatch({ type: 'SET_VIEW', patch: { currentPageId } });
    }
  }, [currentPageId, dispatch, storedPageId]);

  /**
   * Ctrl/Cmd + wheel zooms instead of scrolling, matching every other document
   * viewer. `passive: false` is required because the default must be prevented.
   */
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY / 300);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      dispatch({ type: 'SET_VIEW', patch: { zoom: next, fit: 'none' } });
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [dispatch, zoom]);

  return (
    <div
      ref={scrollRef}
      className="bg-muted/40 relative h-full overflow-auto"
      // The canvas is decorative; the text layer inside carries the content, so
      // the scroll region itself is what a keyboard user lands on.
      tabIndex={0}
      role="region"
      aria-label="Document pages"
    >
      <div
        className="relative mx-auto"
        style={{ height: totalHeight, width: 'fit-content', minWidth: '100%' }}
      >
        {virtualPages.map((virtual) => {
          const entry = pages[virtual.index];
          const size = sources[entry.sourceId]?.pageSizes[entry.sourceIndex];
          const natural = naturalSizes[virtual.index];
          return (
            <div
              key={virtual.id}
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: virtual.offset }}
            >
              <PageView
                entry={entry}
                pageNumber={virtual.index + 1}
                rotation={effectiveRotation(entry, size)}
                scale={zoom}
                width={natural.width * zoom}
                height={natural.height * zoom}
                mounted={virtual.mounted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageList;
