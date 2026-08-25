/**
 * Handing finished bytes back to the user.
 *
 * `showSaveFilePicker` gives a real "Save as" dialog and writes straight to the
 * chosen location, but it only exists in Chromium and is unavailable in
 * cross-origin iframes, so an anchor download is always kept as the fallback.
 */

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

interface FileSystemWritable {
  write: (data: BlobPart) => Promise<void>;
  close: () => Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritable>;
}

type SaveFilePicker = (
  options?: SaveFilePickerOptions
) => Promise<FileSystemFileHandleLike>;

/**
 * Feature detection has to happen at call time, not module scope — reading
 * `window` while the module evaluates would break server rendering, and this
 * file is imported from client components that Next still evaluates on import.
 */
const getSaveFilePicker = (): SaveFilePicker | null => {
  if (typeof window === 'undefined') return null;
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  return typeof picker === 'function' ? picker : null;
};

export const supportsSaveFilePicker = (): boolean =>
  getSaveFilePicker() !== null;

/** True when the user dismissed a picker rather than something failing. */
const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Saves bytes as a file. Resolves `false` when the user cancelled the picker,
 * so callers can stay silent rather than reporting a non-failure.
 */
export async function saveBytes(
  bytes: Uint8Array,
  filename: string,
  mime = 'application/pdf'
): Promise<boolean> {
  // Copy into a plain ArrayBuffer: `bytes.buffer` may be a SharedArrayBuffer or
  // a view into a larger allocation, neither of which Blob accepts directly.
  const blob = new Blob([bytes.slice().buffer], { type: mime });

  const picker = getSaveFilePicker();
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'PDF document', accept: { [mime]: ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (isAbort(error)) return false;
      // Anything else (a policy block, an unwritable location) falls through to
      // the anchor path rather than losing the user's document.
      console.warn('[pdf] save picker failed, falling back to download', error);
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** Opens bytes in the browser's print dialog via a hidden iframe. */
export async function printBytes(bytes: Uint8Array): Promise<void> {
  const blob = new Blob([bytes.slice().buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;

  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };

  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Not every browser fires afterprint; this bounds the leak.
    setTimeout(cleanup, 60_000);
  });

  document.body.append(frame);
}
