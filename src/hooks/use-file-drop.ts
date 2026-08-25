'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Accepting PDFs from all three routes a user might reasonably try: the file
 * picker, a drag from the desktop, and a paste.
 *
 * Drag events are counted rather than toggled — `dragenter`/`dragleave` fire
 * for every child element the pointer crosses, so a boolean flag flickers off
 * the moment the cursor moves over anything inside the drop zone.
 */

const isPdf = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const isImage = (file: File) => file.type.startsWith('image/');

export interface UseFileDropOptions {
  onFiles: (files: File[]) => void;
  /** Also accept images, for the images-to-PDF and stamp flows. */
  acceptImages?: boolean;
  disabled?: boolean;
}

export function useFileDrop({
  onFiles,
  acceptImages = false,
  disabled = false,
}: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  // Held in a ref so the window listeners below never need re-binding when the
  // caller passes a fresh closure. Written in an effect rather than during
  // render, because a ref write during render is not safe under concurrent
  // rendering — the render may be discarded, leaving the ref pointing at a
  // closure that was never committed.
  const handler = useRef(onFiles);
  useEffect(() => {
    handler.current = onFiles;
  }, [onFiles]);

  const accept = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return;
      const accepted = Array.from(files).filter(
        (file) => isPdf(file) || (acceptImages && isImage(file))
      );
      if (accepted.length > 0) handler.current(accepted);
    },
    [acceptImages]
  );

  useEffect(() => {
    if (disabled) return;

    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      depth.current += 1;
      setIsDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      // Without this the browser navigates to the dropped file.
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragging(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer) return;
      event.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      accept(event.dataTransfer.files);
    };

    const onPaste = (event: ClipboardEvent) => {
      // Don't hijack a paste the user meant for a text field.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA'].includes(target.tagName))
      ) {
        return;
      }
      accept(event.clipboardData?.files ?? null);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, [accept, disabled]);

  /** Opens the OS file picker via a detached input, so no markup is needed. */
  const openPicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = acceptImages ? 'application/pdf,image/*' : 'application/pdf';
    input.addEventListener('change', () => accept(input.files));
    input.click();
  }, [accept, acceptImages]);

  return { isDragging, openPicker };
}
