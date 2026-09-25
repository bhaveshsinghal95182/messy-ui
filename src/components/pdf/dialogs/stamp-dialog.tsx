'use client';

import { useMemo, useState } from 'react';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildStamps,
  renderTemplate,
  DEFAULT_STAMP,
  WATERMARK_PRESET,
  type StampOptions,
  type StampPosition,
} from '@/lib/pdf/ops/stamps';

interface StampDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSITIONS: { value: StampPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center', label: 'Centre' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
];

/**
 * Watermarks, page numbers and headers/footers.
 *
 * One dialog because they are the same operation with different defaults —
 * separate dialogs would triple the surface for no gain.
 */
const StampDialog = ({ open, onOpenChange }: StampDialogProps) => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();
  const pageCount = usePdf((state) => state.pages.length);
  const filename = usePdf((state) => state.exportSettings.filename);

  const [mode, setMode] = useState<'numbers' | 'watermark'>('numbers');
  const [options, setOptions] = useState<StampOptions>(DEFAULT_STAMP);

  const set = <K extends keyof StampOptions>(key: K, value: StampOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const switchMode = (next: string) => {
    const asMode = next as 'numbers' | 'watermark';
    setMode(asMode);
    setOptions(asMode === 'watermark' ? WATERMARK_PRESET : DEFAULT_STAMP);
  };

  const preview = useMemo(
    () =>
      renderTemplate(options.template, {
        page: 1,
        pages: pageCount || 1,
        filename,
      }),
    [filename, options.template, pageCount]
  );

  const apply = () => {
    const stamps = buildStamps(getState(), options);
    for (const stamp of stamps) {
      dispatch({
        type: 'ADD_OBJECT',
        pageId: stamp.pageId,
        object: stamp.object,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Page numbers and watermarks</DialogTitle>
          <DialogDescription>
            Added as editable objects, so you can move or delete any of them
            afterwards.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={switchMode}>
          <TabsList className="w-full">
            <TabsTrigger value="numbers">Numbers &amp; footers</TabsTrigger>
            <TabsTrigger value="watermark">Watermark</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="stamp-template">Text</Label>
            <Input
              id="stamp-template"
              value={options.template}
              onChange={(event) => set('template', event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: <span className="font-mono">{'{page}'}</span>,{' '}
              <span className="font-mono">{'{pages}'}</span>,{' '}
              <span className="font-mono">{'{date}'}</span>,{' '}
              <span className="font-mono">{'{filename}'}</span>. Page one will
              read “{preview}”.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stamp-position">Position</Label>
              <Select
                value={options.position}
                onValueChange={(value) =>
                  set('position', value as StampPosition)
                }
              >
                <SelectTrigger id="stamp-position" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stamp-size">Size ({options.size}pt)</Label>
              <Slider
                id="stamp-size"
                min={6}
                max={144}
                step={1}
                value={[options.size]}
                onValueChange={([value]) => set('size', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stamp-opacity">
                Opacity ({Math.round(options.opacity * 100)}%)
              </Label>
              <Slider
                id="stamp-opacity"
                min={0.05}
                max={1}
                step={0.05}
                value={[options.opacity]}
                onValueChange={([value]) => set('opacity', value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stamp-rotation">
                Rotation ({options.rotation}°)
              </Label>
              <Slider
                id="stamp-rotation"
                min={0}
                max={90}
                step={5}
                value={[options.rotation]}
                onValueChange={([value]) => set('rotation', value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pages</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={pageCount}
                aria-label="First page"
                value={options.range?.from ?? 1}
                onChange={(event) =>
                  set('range', {
                    from: Number(event.target.value) || 1,
                    to: options.range?.to ?? pageCount,
                  })
                }
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                min={1}
                max={pageCount}
                aria-label="Last page"
                value={options.range?.to ?? pageCount}
                onChange={(event) =>
                  set('range', {
                    from: options.range?.from ?? 1,
                    to: Number(event.target.value) || pageCount,
                  })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!options.template.trim()}>
            Add to {pageCount} page{pageCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StampDialog;
