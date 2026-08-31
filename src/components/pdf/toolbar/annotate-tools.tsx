'use client';

import {
  ArrowUpRight,
  Circle,
  EyeOff,
  Highlighter,
  Image as ImageIcon,
  Link2,
  Minus,
  MousePointer2,
  Pen,
  Square,
  SquareSlash,
  StickyNote,
  Type,
} from 'lucide-react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ToolId } from '@/lib/pdf/types';

const TOOLS: { id: ToolId; label: string; icon: typeof Type; key: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, key: 'V' },
  { id: 'text', label: 'Text box', icon: Type, key: 'T' },
  { id: 'ink', label: 'Draw', icon: Pen, key: 'D' },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, key: 'H' },
  { id: 'rect', label: 'Rectangle', icon: Square, key: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, key: 'E' },
  { id: 'line', label: 'Line', icon: Minus, key: 'L' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, key: 'A' },
  { id: 'whiteout', label: 'Whiteout', icon: SquareSlash, key: 'W' },
  { id: 'note', label: 'Note', icon: StickyNote, key: 'N' },
  { id: 'link', label: 'Link', icon: Link2, key: 'K' },
  // Distinct from whiteout: this one genuinely destroys the content beneath.
  { id: 'redaction', label: 'Redact', icon: EyeOff, key: 'X' },
];

/** Tool selection. Marked with aria-pressed so the active tool is announced. */
const AnnotateTools = ({ onAddImage }: { onAddImage: () => void }) => {
  const dispatch = usePdfDispatch();
  const activeTool = usePdf((state) => state.activeTool);
  const hasDocument = usePdf((state) => state.pages.length > 0);

  return (
    <>
      {TOOLS.map(({ id, label, icon: Icon, key }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === id ? 'secondary' : 'ghost'}
              size="icon"
              aria-label={label}
              aria-pressed={activeTool === id}
              disabled={!hasDocument}
              onClick={() => dispatch({ type: 'SET_TOOL', tool: id })}
            >
              <Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {label} <span className="text-muted-foreground">({key})</span>
          </TooltipContent>
        </Tooltip>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add image"
            disabled={!hasDocument}
            onClick={onAddImage}
          >
            <ImageIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add an image</TooltipContent>
      </Tooltip>
    </>
  );
};

export default AnnotateTools;
