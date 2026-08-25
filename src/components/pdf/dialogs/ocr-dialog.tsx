'use client';

import { useCallback, useRef, useState } from 'react';
import { ScanText } from 'lucide-react';
import { toast } from 'sonner';
import { usePdf, usePdfState } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { exportPdf } from '@/lib/pdf/export/build';
import { saveBytes } from '@/lib/pdf/export/save';
import { recognizePages, type OcrPageResult } from '@/lib/pdf/ocr/ocr';

interface OcrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Making a scan searchable.
 *
 * The result is written back as an invisible text layer over the original
 * image, so the page looks exactly as it did but its words can be selected,
 * searched and copied.
 */
const OcrDialog = ({ open, onOpenChange }: OcrDialogProps) => {
  const getState = usePdfState();
  const pageCount = usePdf((state) => state.pages.length);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<OcrPageResult[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setResults(null);
    setProgress(0);
    abort.current = new AbortController();

    try {
      const found = await recognizePages(getState(), {
        signal: abort.current.signal,
        onProgress: (done, total, label) => {
          setProgress(total > 0 ? done / total : 0);
          setStatus(label);
        },
      });
      setResults(found);

      const words = found.reduce(
        (total, result) => total + result.words.length,
        0
      );
      setStatus(
        words > 0
          ? `Found ${words.toLocaleString()} words across ${found.length} page${found.length === 1 ? '' : 's'}.`
          : 'No text was recognised. The pages may be blank, very low resolution, or in a language other than English.'
      );
    } catch (error) {
      console.error(error);
      toast.error('OCR failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }, [getState]);

  const save = useCallback(async () => {
    if (!results) return;
    setBusy(true);
    try {
      const state = getState();
      const bytes = await exportPdf(state, { ocr: results });
      await saveBytes(
        bytes,
        state.exportSettings.filename.replace(/\.pdf$/i, '-searchable.pdf')
      );
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Could not save the searchable PDF');
    } finally {
      setBusy(false);
    }
  }, [getState, onOpenChange, results]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abort.current?.abort();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make a scan searchable</DialogTitle>
          <DialogDescription>
            Reads the text off the page image and writes it back invisibly
            underneath, so the document looks unchanged but can be searched and
            copied. The recognition runs on your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {busy && (
            <div className="space-y-2">
              <Progress value={progress * 100} />
              <p
                className="text-muted-foreground text-xs"
                aria-live="polite"
                aria-atomic="true"
              >
                {status}
              </p>
            </div>
          )}

          {!busy && status && (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {status}
            </p>
          )}

          {!busy && !status && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {pageCount} page{pageCount === 1 ? '' : 's'} will be read at 300
              DPI. The English language model is about 3 MB and is loaded from
              this site, not a third party; your browser caches it after the
              first run.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {results && results.some((result) => result.words.length > 0) ? (
            <Button onClick={() => void save()} disabled={busy}>
              Save searchable PDF
            </Button>
          ) : (
            <Button
              onClick={() => void run()}
              disabled={busy || pageCount === 0}
            >
              <ScanText className="size-4" />
              {busy ? 'Reading…' : 'Start'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OcrDialog;
