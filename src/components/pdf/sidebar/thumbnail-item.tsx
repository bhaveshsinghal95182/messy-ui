'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  RotateCcw,
  RotateCw,
  Trash2,
  Download as DownloadIcon,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { getThumbnail } from '@/lib/pdf/render';
import { cn } from '@/lib/utils';
import type { PageEntry } from '@/lib/pdf/types';

export interface PageActions {
  rotate: (pageId: string, delta: number) => void;
  duplicate: (pageId: string) => void;
  remove: (pageId: string) => void;
  extract: (pageId: string) => void;
}

interface ThumbnailItemProps {
  entry: PageEntry;
  pageNumber: number;
  rotation: number;
  selected: boolean;
  /** True while this item is the one being dragged. */
  dragging: boolean;
  /** True when a drop would insert immediately above this item. */
  dropBefore: boolean;
  onSelect: (pageId: string) => void;
  onPointerDown: (event: React.PointerEvent) => void;
  actions: PageActions;
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
  dragging,
  dropBefore,
  onSelect,
  onPointerDown,
  actions,
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={containerRef}
          type="button"
          onClick={() => onSelect(entry.id)}
          onPointerDown={onPointerDown}
          aria-label={`Page ${pageNumber}`}
          aria-pressed={selected}
          className={cn(
            'group focus-visible:ring-ring relative flex w-full touch-none flex-col items-center gap-1 rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none',
            selected ? 'bg-accent' : 'hover:bg-accent/50',
            dragging && 'opacity-40'
          )}
        >
          {/* Drop indicator, shown between items rather than on them. */}
          {dropBefore && (
            <span
              aria-hidden="true"
              className="bg-primary absolute inset-x-2 -top-0.5 h-0.5 rounded-full"
            />
          )}

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
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onSelect={() => actions.rotate(entry.id, -90)}>
          <RotateCcw className="size-4" />
          Rotate left
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.rotate(entry.id, 90)}>
          <RotateCw className="size-4" />
          Rotate right
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => actions.duplicate(entry.id)}>
          <Copy className="size-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.extract(entry.id)}>
          <DownloadIcon className="size-4" />
          Save this page as PDF
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => actions.remove(entry.id)}
        >
          <Trash2 className="size-4" />
          Delete page
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ThumbnailItem;
