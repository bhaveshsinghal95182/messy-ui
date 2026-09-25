'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Key used when a call site only ever has one thing to copy. */
export const DEFAULT_COPY_ID = 'default';

/**
 * Copy text, then flag it as copied for a couple of seconds.
 *
 * Every copy button in the docs wants the same three things: write to the
 * clipboard, show a tick, put the tick away again. Doing that inline - as four
 * separate components used to - leaks the reset timer when the component
 * unmounts inside the window, and lets a rejected clipboard write escape as an
 * unhandled rejection. Both are handled here, once.
 *
 * `copy(text, id)` takes an id so a component with several buttons can show the
 * tick on the one that was actually pressed; `isCopied(id)` reads it back.
 */
export const useCopyToClipboard = (resetAfterMs = 2000) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Without this, unmounting mid-window leaves a timer that sets state on a
  // component that is already gone.
  useEffect(() => clearPending, [clearPending]);

  const copy = useCallback(
    async (text: string, id: string = DEFAULT_COPY_ID) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        // Permission denied, or no clipboard at all in an insecure context.
        // Nothing to show the user, but it must not take the page down.
        console.error('Failed to copy to clipboard:', error);
        return false;
      }

      clearPending();
      setCopiedId(id);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setCopiedId(null);
      }, resetAfterMs);

      return true;
    },
    [clearPending, resetAfterMs]
  );

  const isCopied = useCallback(
    (id: string = DEFAULT_COPY_ID) => copiedId === id,
    [copiedId]
  );

  return { copiedId, copy, isCopied };
};

export default useCopyToClipboard;
