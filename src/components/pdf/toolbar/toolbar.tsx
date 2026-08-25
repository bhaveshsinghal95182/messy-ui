'use client';

import { Download, FolderOpen, PanelLeft, Redo2, Undo2 } from 'lucide-react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import ZoomControls from './zoom-controls';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarProps {
  onOpen: () => void;
  onDownload: () => void;
}

/**
 * The main toolbar.
 *
 * Marked `role="toolbar"` so assistive technology announces it as one control
 * group rather than a run of loose buttons.
 */
const Toolbar = ({ onOpen, onDownload }: ToolbarProps) => {
  const dispatch = usePdfDispatch();
  const hasDocument = usePdf((state) => state.pages.length > 0);
  const sidebar = usePdf((state) => state.view.sidebar);
  const canUndo = usePdf((state) => state.history.past.length > 0);
  const canRedo = usePdf((state) => state.history.future.length > 0);

  return (
    <div
      role="toolbar"
      aria-label="PDF tools"
      aria-controls="pdf-page-list"
      className="bg-card flex h-12 shrink-0 items-center gap-1 border-b px-2"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle thumbnails"
            aria-pressed={sidebar === 'thumbnails'}
            disabled={!hasDocument}
            onClick={() =>
              dispatch({
                type: 'SET_VIEW',
                patch: {
                  sidebar: sidebar === 'thumbnails' ? 'none' : 'thumbnails',
                },
              })
            }
          >
            <PanelLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Thumbnails</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <FolderOpen className="size-4" />
            <span className="hidden sm:inline">Open</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open a PDF (drag, paste or click)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
          >
            <Undo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
          >
            <Redo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <ZoomControls />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button size="sm" onClick={onDownload} disabled={!hasDocument}>
        <Download className="size-4" />
        <span className="hidden sm:inline">Download</span>
      </Button>
    </div>
  );
};

export default Toolbar;
