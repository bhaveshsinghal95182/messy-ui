'use client';

import { Minus, Plus } from 'lucide-react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '@/lib/pdf/constants';
import type { FitMode } from '@/lib/pdf/types';

/** Zoom in/out, a fit selector, and the current page indicator. */
const ZoomControls = () => {
  const dispatch = usePdfDispatch();
  const zoom = usePdf((state) => state.view.zoom);
  const fit = usePdf((state) => state.view.fit);
  const pageCount = usePdf((state) => state.pages.length);
  const currentPageId = usePdf((state) => state.view.currentPageId);
  const currentIndex = usePdf((state) =>
    state.pages.findIndex((page) => page.id === state.view.currentPageId)
  );

  // Any explicit zoom leaves fit mode, otherwise the next resize would undo it.
  const setZoom = (next: number) =>
    dispatch({
      type: 'SET_VIEW',
      patch: {
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)),
        fit: 'none',
      },
    });

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(zoom / ZOOM_STEP)}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
      >
        <Minus className="size-4" />
      </Button>

      <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
        {Math.round(zoom * 100)}%
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(zoom * ZOOM_STEP)}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Zoom in"
      >
        <Plus className="size-4" />
      </Button>

      <Select
        value={fit}
        onValueChange={(value) =>
          dispatch({ type: 'SET_VIEW', patch: { fit: value as FitMode } })
        }
      >
        <SelectTrigger size="sm" className="w-28" aria-label="Fit mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="width">Fit width</SelectItem>
          <SelectItem value="page">Fit page</SelectItem>
          <SelectItem value="none">Custom</SelectItem>
        </SelectContent>
      </Select>

      {pageCount > 0 && (
        <span
          className="text-muted-foreground ml-2 text-xs tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          Page {currentPageId && currentIndex >= 0 ? currentIndex + 1 : 1} of{' '}
          {pageCount}
        </span>
      )}
    </div>
  );
};

export default ZoomControls;
