'use client';

import { useEffect, useRef } from 'react';
import { usePdfDispatch } from '../pdf-store-provider';
import { toCss } from './object-renderer';
import type { PageEntryId, TextObject } from '@/lib/pdf/types';

interface TextObjectEditorProps {
  pageId: PageEntryId;
  object: TextObject;
  scale: number;
  onDone: () => void;
}

/**
 * In-place editing for a text object.
 *
 * A real `<textarea>` rather than a canvas-drawn caret: it brings the caret,
 * selection, IME, spellcheck, undo within the field, and the mobile keyboard
 * with it. Reimplementing any one of those over a canvas is a large amount of
 * work to end up somewhere worse.
 *
 * Styled to match what the export will draw, so the preview is honest about
 * where the text will land.
 */
const TextObjectEditor = ({
  pageId,
  object,
  scale,
  onDone,
}: TextObjectEditorProps) => {
  const dispatch = usePdfDispatch();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    // Put the caret at the end rather than selecting everything, so typing
    // into an existing box appends instead of replacing.
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  return (
    <textarea
      ref={ref}
      value={object.text}
      aria-label="Edit text"
      onChange={(event) =>
        dispatch({
          type: 'UPDATE_OBJECT',
          pageId,
          objectId: object.id,
          patch: { text: event.target.value },
        })
      }
      onBlur={onDone}
      onKeyDown={(event) => {
        // Escape commits and exits; Enter must stay available for line breaks.
        if (event.key === 'Escape') {
          event.preventDefault();
          onDone();
        }
        // Stop the workspace shortcuts from seeing keystrokes meant for text.
        event.stopPropagation();
      }}
      className="absolute inset-0 resize-none border-0 bg-transparent p-0 outline-none"
      style={{
        fontSize: object.size * scale,
        lineHeight: object.lineHeight,
        color: toCss(object.color),
        textAlign: object.align,
        fontWeight: object.bold ? 700 : 400,
        fontStyle: object.italic ? 'italic' : 'normal',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    />
  );
};

export default TextObjectEditor;
