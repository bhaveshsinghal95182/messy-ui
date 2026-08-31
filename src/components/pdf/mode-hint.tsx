'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { usePdfDispatch } from './pdf-store-provider';
import { Button } from '@/components/ui/button';

interface ModeHintProps {
  mode: string;
  onOpen: () => void;
}

type Setup =
  | { kind: 'open' }
  | { kind: 'sidebar'; panel: 'thumbnails' | 'forms' }
  | { kind: 'tool'; tool: 'redaction' };

/**
 * What each dialog-less sub-route actually wants the user to do.
 *
 * These five routes used to land on the bare editor. Their SEO copy described
 * steps ("select a page in the thumbnail rail", "open the form panel") with
 * nothing on screen pointing at them, so arriving from a search for "rotate
 * PDF" gave you an editor and no idea which of fifteen buttons was the one.
 */
const HINTS: Record<string, { text: string; label: string; setup: Setup }> = {
  merge: {
    text: 'Open another PDF and its pages are added to this one. Drag thumbnails to reorder.',
    label: 'Add another PDF',
    setup: { kind: 'open' },
  },
  rotate: {
    text: 'Pick a page, then use the rotate buttons or the [ and ] keys.',
    label: 'Show pages',
    setup: { kind: 'sidebar', panel: 'thumbnails' },
  },
  'delete-pages': {
    text: 'Pick a page, then delete it from the page actions or with the Delete key.',
    label: 'Show pages',
    setup: { kind: 'sidebar', panel: 'thumbnails' },
  },
  'fill-form': {
    text: 'Fillable fields found in this document appear in the form panel.',
    label: 'Open the form panel',
    setup: { kind: 'sidebar', panel: 'forms' },
  },
  redact: {
    text: 'Drag over anything to remove. Redacted pages are rasterised on export, so the text underneath is genuinely gone — not just covered.',
    label: 'Use the redaction tool',
    setup: { kind: 'tool', tool: 'redaction' },
  },
};

/** A one-line bar telling a deep-linked visitor what to do next. */
const ModeHint = ({ mode, onOpen }: ModeHintProps) => {
  const dispatch = usePdfDispatch();
  const [dismissed, setDismissed] = useState(false);

  const hint = HINTS[mode];
  if (!hint || dismissed) return null;

  const run = () => {
    switch (hint.setup.kind) {
      case 'open':
        onOpen();
        return;
      case 'sidebar':
        dispatch({
          type: 'SET_VIEW',
          patch: { sidebar: hint.setup.panel },
        });
        return;
      case 'tool':
        dispatch({ type: 'SET_TOOL', tool: hint.setup.tool });
        return;
    }
  };

  return (
    <div className="bg-muted/60 flex shrink-0 items-center gap-3 border-b px-3 py-2 text-sm">
      <p className="text-muted-foreground min-w-0 flex-1">{hint.text}</p>
      <Button size="sm" variant="secondary" className="shrink-0" onClick={run}>
        {hint.label}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
};

export default ModeHint;
