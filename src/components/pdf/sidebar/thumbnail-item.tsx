'use client';

import { useEffect, useRef, useState } from 'react';
import { getThumbnail } from '@/lib/pdf/render';
import { cn } from '@/lib/utils';
import type { PageEntry } from '@/lib/pdf/types';

interface ThumbnailItemProps {
  entry: PageEntry;
  pageNumber: number;
  rotation: number;
  selected: boolean;
  onSelect: (pageId: string, additive: boolean) => void;
}

/**
 * One page thumbnail.
 *
 * Rendering is deferred until the item is near the viewport — a 500-page
 * document would otherwise queue 500 renders the moment the sidebar opens, all
 * competing with the page the user is actually looking at.
 */
const ThumbnailItem = ({
  entry,
  pageNumber,
  rotation,
  selected,
  onSelect,
}: ThumbnailItemProps) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) setVisible(true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void getThumbnail(entry, rotation).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [entry, rotation, visible]);

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={(event) => onSelect(entry.id, event.shiftKey || event.metaKey)}
      aria-label={`Page ${pageNumber}`}
      aria-pressed={selected}
      className={cn(
        'group focus-visible:ring-ring flex w-full flex-col items-center gap-1 rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none',
        selected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <div
        className={cn(
          'grid w-full place-items-center overflow-hidden rounded-sm bg-white ring-1',
          selected ? 'ring-primary ring-2' : 'ring-border'
        )}
        style={{ minHeight: 80 }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL from a canvas, not a remote asset
          <img
            src={src}
            alt=""
            className="block h-auto w-full"
            draggable={false}
          />
        ) : (
          <div className="bg-muted h-24 w-full animate-pulse" />
        )}
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {pageNumber}
      </span>
    </button>
  );
};

export default ThumbnailItem;
