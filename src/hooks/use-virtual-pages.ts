'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OVERSCAN_AFTER, OVERSCAN_BEFORE, PAGE_GAP } from '@/lib/pdf/constants';

export interface VirtualPageInput {
  id: string;
  /** Displayed height in CSS pixels at the current zoom, excluding the gap. */
  height: number;
}

export interface VirtualPage {
  id: string;
  index: number;
  /** Distance from the top of the scroll content to the top of this page. */
  offset: number;
  height: number;
  mounted: boolean;
}

/**
 * Windows a long page list so only what is near the viewport is rendered.
 *
 * No measurement is involved: page dimensions are known from the moment the
 * file is opened, so every offset can be computed directly. That avoids the
 * usual virtualisation problem where estimated heights make the scrollbar jump
 * around as real sizes arrive.
 *
 * A 500-page document mounts perhaps a dozen canvases instead of 500, which is
 * the difference between the tab working and the tab being killed.
 */
export function useVirtualPages(
  pages: VirtualPageInput[],
  scrollRef: React.RefObject<HTMLElement | null>
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const frame = useRef<number | null>(null);

  // Cumulative offsets, recomputed only when a page's size or the page order
  // changes — never on scroll.
  const { offsets, totalHeight } = useMemo(() => {
    const result: number[] = [];
    let running = 0;
    for (const page of pages) {
      result.push(running);
      running += page.height + PAGE_GAP;
    }
    return { offsets: result, totalHeight: Math.max(0, running - PAGE_GAP) };
  }, [pages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const measure = () => {
      setScrollTop(element.scrollTop);
      setViewportHeight(element.clientHeight);
    };
    measure();

    // Scroll fires far more often than the browser paints, so updates are
    // coalesced to one per frame; a fast flick otherwise queues hundreds.
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure();
      });
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener('scroll', onScroll);
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [scrollRef]);

  const virtualPages = useMemo<VirtualPage[]>(() => {
    // Before the first measurement, assume a plausible viewport so the first
    // paint is never blank.
    const height = viewportHeight || 800;
    const top = scrollTop - height * OVERSCAN_BEFORE;
    const bottom = scrollTop + height * (1 + OVERSCAN_AFTER);

    return pages.map((page, index) => {
      const offset = offsets[index];
      return {
        id: page.id,
        index,
        offset,
        height: page.height,
        mounted: offset + page.height >= top && offset <= bottom,
      };
    });
  }, [offsets, pages, scrollTop, viewportHeight]);

  /** Index of the page occupying the middle of the viewport. */
  const currentIndex = useMemo(() => {
    if (pages.length === 0) return -1;
    const middle = scrollTop + (viewportHeight || 0) / 2;
    let index = 0;
    for (let i = 0; i < offsets.length; i += 1) {
      if (offsets[i] <= middle) index = i;
      else break;
    }
    return index;
  }, [offsets, pages.length, scrollTop, viewportHeight]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const element = scrollRef.current;
      if (!element || index < 0 || index >= offsets.length) return;
      element.scrollTo({
        top: Math.max(0, offsets[index] - PAGE_GAP),
        behavior,
      });
    },
    [offsets, scrollRef]
  );

  return { virtualPages, totalHeight, currentIndex, scrollToIndex };
}
