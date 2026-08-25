'use client';

import { useMemo, useState } from 'react';
import { usePdf } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatIndices,
  parseRangeSpec,
  rangesToIndices,
  splitEvery,
} from '@/lib/pdf/pages/ops';
import type { PageEntry } from '@/lib/pdf/types';

interface SplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSplit: (chunks: PageEntry[][]) => void;
}

/**
 * Splitting and extracting.
 *
 * Both tabs preview exactly what will be produced before anything is written,
 * because "split" is the operation people most often get wrong on the first
 * attempt and an unexpected pile of files is tedious to undo.
 */
const SplitDialog = ({ open, onOpenChange, onSplit }: SplitDialogProps) => {
  const pages = usePdf((state) => state.pages);
  const [mode, setMode] = useState('ranges');
  const [spec, setSpec] = useState('');
  const [size, setSize] = useState('1');

  const extracted = useMemo(() => {
    const ranges = parseRangeSpec(spec, pages.length);
    return rangesToIndices(ranges);
  }, [pages.length, spec]);

  const everyChunks = useMemo(() => {
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed < 1) return [];
    return splitEvery(pages, Math.floor(parsed));
  }, [pages, size]);

  const submit = () => {
    if (mode === 'ranges') {
      if (extracted.length === 0) return;
      onSplit([extracted.map((index) => pages[index])]);
    } else {
      if (everyChunks.length === 0) return;
      onSplit(everyChunks);
    }
    onOpenChange(false);
  };

  const canSubmit =
    mode === 'ranges' ? extracted.length > 0 : everyChunks.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split or extract pages</DialogTitle>
          <DialogDescription>
            This document has {pages.length} page
            {pages.length === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="ranges">Extract pages</TabsTrigger>
            <TabsTrigger value="every">Split every N</TabsTrigger>
          </TabsList>

          <TabsContent value="ranges" className="space-y-2 pt-4">
            <Label htmlFor="split-ranges">Pages to keep</Label>
            <Input
              id="split-ranges"
              value={spec}
              onChange={(event) => setSpec(event.target.value)}
              placeholder="e.g. 1-3, 7, 9-"
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {extracted.length > 0
                ? `Will save ${extracted.length} page${extracted.length === 1 ? '' : 's'}: ${formatIndices(extracted)}`
                : 'Enter page numbers, ranges, or open-ended ranges like 9-'}
            </p>
          </TabsContent>

          <TabsContent value="every" className="space-y-2 pt-4">
            <Label htmlFor="split-size">Pages per file</Label>
            <Input
              id="split-size"
              type="number"
              min={1}
              max={Math.max(1, pages.length)}
              value={size}
              onChange={(event) => setSize(event.target.value)}
            />
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {everyChunks.length > 1
                ? `Will save ${everyChunks.length} separate files.`
                : 'Choose a size smaller than the document to split it.'}
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SplitDialog;
