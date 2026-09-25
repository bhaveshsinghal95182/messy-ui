'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportPdf } from '@/lib/pdf/export/build';
import { saveBytes } from '@/lib/pdf/export/save';
import {
  compress,
  pagesToImages,
  COMPRESSION_TIERS,
  type CompressionTier,
} from '@/lib/pdf/optimize/compress';
import { extractMarkdown, extractText } from '@/lib/pdf/text/extract';
import { cn } from '@/lib/utils';

interface ConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatBytes = (bytes: number) =>
  bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1000)} KB`;

/**
 * Compression, image export and text extraction.
 *
 * Grouped because they are all "turn this document into something else", and
 * because each one needs the same warning about what it costs.
 */
const ConvertDialog = ({ open, onOpenChange }: ConvertDialogProps) => {
  const getState = usePdfState();
  const pageCount = usePdf((state) => state.pages.length);

  const [tier, setTier] = useState<CompressionTier>('restructure');
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(true);
    setResult(null);
    try {
      await task();
    } catch (error) {
      console.error(error);
      toast.error(`${label} failed`, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const runCompress = () =>
    run('Compression', async () => {
      const state = getState();
      const outcome = await compress(state, tier, {
        dpi,
        quality,
        exportPdf: (current) => exportPdf(current),
      });

      setResult(
        outcome.savedPercent > 0
          ? `${formatBytes(outcome.before)} → ${formatBytes(outcome.after)}, ${outcome.savedPercent}% smaller.`
          : `${formatBytes(outcome.before)} → ${formatBytes(outcome.after)}. This file was already well compressed, so there was nothing to gain.`
      );

      await saveBytes(
        outcome.bytes,
        state.exportSettings.filename.replace(/\.pdf$/i, '-compressed.pdf')
      );
    });

  const runImages = (format: 'image/png' | 'image/jpeg') =>
    run('Image export', async () => {
      const images = await pagesToImages(getState(), format, dpi, quality);
      for (const image of images) {
        const saved = await saveBytes(image.bytes, image.name, format);
        if (!saved) break;
      }
      setResult(
        `Saved ${images.length} image${images.length === 1 ? '' : 's'}.`
      );
    });

  const runText = (markdown: boolean) =>
    run('Text extraction', async () => {
      const state = getState();
      const text = markdown
        ? await extractMarkdown(state)
        : await extractText(state);

      if (!text.trim()) {
        toast.warning('No text found', {
          description:
            'This document has no extractable text, which usually means it is a scan. OCR would be needed to read it.',
        });
        return;
      }

      await saveBytes(
        new TextEncoder().encode(text),
        state.exportSettings.filename.replace(
          /\.pdf$/i,
          markdown ? '.md' : '.txt'
        ),
        markdown ? 'text/markdown' : 'text/plain'
      );
      setResult(`Extracted ${text.length.toLocaleString()} characters.`);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compress and convert</DialogTitle>
          <DialogDescription>
            {pageCount} page{pageCount === 1 ? '' : 's'}. Everything here runs
            on your device.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="compress">
          <TabsList className="w-full">
            <TabsTrigger value="compress">Compress</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value="compress" className="space-y-4 pt-4">
            {COMPRESSION_TIERS.map((option) => (
              <button
                key={option.tier}
                type="button"
                onClick={() => setTier(option.tier)}
                aria-pressed={tier === option.tier}
                className={cn(
                  'w-full rounded-md border p-3 text-left',
                  tier === option.tier
                    ? 'border-primary ring-primary ring-1'
                    : 'hover:bg-accent/40'
                )}
              >
                <p className="text-title text-sm font-medium">{option.label}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {option.description}
                </p>
                {option.tradeoff && (
                  <p className="text-destructive mt-1 text-xs leading-relaxed">
                    {option.tradeoff}
                  </p>
                )}
              </button>
            ))}

            <p className="text-muted-foreground text-xs leading-relaxed">
              A PDF made by a word processor is already compressed and will
              barely shrink. Scans are mostly image data and shrink a great
              deal. Anything promising a fixed percentage regardless of content
              is guessing.
            </p>

            <Button
              className="w-full"
              disabled={busy || pageCount === 0}
              onClick={() => void runCompress()}
            >
              {busy ? 'Working…' : 'Compress and download'}
            </Button>
          </TabsContent>

          <TabsContent value="images" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="convert-dpi">Resolution ({dpi} DPI)</Label>
              <Slider
                id="convert-dpi"
                min={72}
                max={400}
                step={25}
                value={[dpi]}
                onValueChange={([value]) => setDpi(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="convert-quality">
                JPEG quality ({Math.round(quality * 100)}%)
              </Label>
              <Slider
                id="convert-quality"
                min={0.3}
                max={1}
                step={0.05}
                value={[quality]}
                onValueChange={([value]) => setQuality(value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={busy || pageCount === 0}
                onClick={() => void runImages('image/png')}
              >
                Save as PNG
              </Button>
              <Button
                variant="outline"
                disabled={busy || pageCount === 0}
                onClick={() => void runImages('image/jpeg')}
              >
                Save as JPEG
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              One file per page, saved one after another.
            </p>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || pageCount === 0}
              onClick={() => void runText(false)}
            >
              Extract plain text (.txt)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || pageCount === 0}
              onClick={() => void runText(true)}
            >
              Extract as Markdown (.md)
            </Button>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Markdown structure is inferred from type size and spacing, since a
              PDF records glyphs at coordinates and not headings or lists. It
              works well on conventionally laid-out documents and less well on
              anything unusual.
            </p>
          </TabsContent>
        </Tabs>

        {result && (
          <p
            className="text-muted-foreground border-t pt-3 text-xs"
            aria-live="polite"
          >
            {result}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertDialog;
