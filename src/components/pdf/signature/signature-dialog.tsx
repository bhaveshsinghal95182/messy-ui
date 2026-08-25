'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DrawPad from './draw-pad';
import TypeSignature from './type-signature';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  canvasToPngBytes,
  removeWhiteBackground,
  trimTransparent,
} from '@/lib/pdf/assets';
import {
  deleteSignature,
  listSignatures,
  saveSignature,
  type StoredSignature,
} from '@/lib/pdf/signature-store';
import { newId } from '@/lib/pdf/reducer';
import { cn } from '@/lib/utils';

export interface SignaturePayload {
  bytes: Uint8Array;
  width: number;
  height: number;
  variant: 'signature' | 'initials';
  sourceKind: 'draw' | 'type' | 'upload';
}

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlace: (signature: SignaturePayload) => void;
}

/** Blob URL for a stored signature, for the library thumbnails. */
const toUrl = (signature: StoredSignature) =>
  URL.createObjectURL(
    new Blob([signature.bytes.slice().buffer], { type: 'image/png' })
  );

/**
 * Creating and placing a visual signature.
 *
 * Four routes in, one result: transparent PNG bytes plus their pixel size. The
 * transparency matters — a signature on an opaque white rectangle sits in a
 * visible box on the page, which is the giveaway that separates a bad
 * e-signature tool from a usable one.
 */
const SignatureDialog = ({
  open,
  onOpenChange,
  onPlace,
}: SignatureDialogProps) => {
  const [tab, setTab] = useState('draw');
  const [variant, setVariant] = useState<'signature' | 'initials'>('signature');
  const [remember, setRemember] = useState(true);
  const [library, setLibrary] = useState<StoredSignature[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // The pending canvas from whichever tab is active. Held in a ref because it
  // is a mutable DOM node, not render state.
  const pending = useRef<HTMLCanvasElement | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const handleCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    pending.current = canvas;
    setHasPending(canvas !== null);
  }, []);

  /**
   * Bumped to force a re-read of the library — after saving or deleting one.
   * Cheaper and less error-prone than keeping a second copy of the list in
   * sync by hand.
   */
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Loads the saved signatures whenever the dialog opens.
   *
   * IndexedDB is an external store, so reading it from an effect is the right
   * shape. The blob URLs are minted here and revoked in the cleanup, which
   * also covers the dialog closing — a leaked object URL pins its blob in
   * memory for the rest of the session.
   */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let minted: string[] = [];

    void (async () => {
      const stored = await listSignatures();
      if (cancelled) return;
      minted = stored.map(toUrl);
      setLibrary(stored);
      setUrls(
        Object.fromEntries(
          stored.map((signature, index) => [signature.id, minted[index]])
        )
      );
    })();

    return () => {
      cancelled = true;
      for (const url of minted) URL.revokeObjectURL(url);
    };
  }, [open, reloadKey]);

  const place = useCallback(
    async (
      canvas: HTMLCanvasElement,
      sourceKind: SignaturePayload['sourceKind']
    ) => {
      // Trim first: a signature drawn in the corner of a large pad would
      // otherwise arrive as a mostly-empty box that is impossible to position.
      const trimmed = trimTransparent(canvas);
      const bytes = await canvasToPngBytes(trimmed);

      const payload: SignaturePayload = {
        bytes,
        width: trimmed.width,
        height: trimmed.height,
        variant,
        sourceKind,
      };

      if (remember) {
        await saveSignature({
          id: newId(),
          bytes,
          width: trimmed.width,
          height: trimmed.height,
          variant,
          sourceKind,
          createdAt: Date.now(),
        });
      }

      onPlace(payload);
      onOpenChange(false);
    },
    [onOpenChange, onPlace, remember, variant]
  );

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      void (async () => {
        try {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
          bitmap.close();

          // A photographed or scanned signature comes on white paper; the fill
          // drops the page so only the ink lands on the PDF.
          await place(removeWhiteBackground(canvas), 'upload');
        } catch (error) {
          console.error(error);
          toast.error('Could not read that image');
        }
      })();
    });
    input.click();
  }, [place]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a signature</DialogTitle>
          <DialogDescription>
            Drawn, typed or uploaded. It stays on this device — saved signatures
            are kept in this browser and are never sent anywhere.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="saved">
              Saved{library.length > 0 && ` (${library.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="pt-4">
            <DrawPad onChange={handleCanvas} />
          </TabsContent>

          <TabsContent value="type" className="pt-4">
            <TypeSignature onChange={handleCanvas} />
          </TabsContent>

          <TabsContent value="saved" className="pt-4">
            {library.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nothing saved yet. Signatures you create here will appear in
                this tab.
              </p>
            ) : (
              <ul className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {library.map((signature) => (
                  <li key={signature.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        onPlace({
                          bytes: signature.bytes,
                          width: signature.width,
                          height: signature.height,
                          variant: signature.variant,
                          sourceKind: signature.sourceKind,
                        });
                        onOpenChange(false);
                      }}
                      className="hover:border-primary grid h-24 w-full place-items-center rounded-md border bg-white p-2"
                    >
                      {urls[signature.id] && (
                        // eslint-disable-next-line @next/next/no-img-element -- a blob: URL held in memory
                        <img
                          src={urls[signature.id]}
                          alt={`Saved ${signature.variant}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete saved signature"
                      className="absolute top-1 right-1"
                      onClick={async () => {
                        await deleteSignature(signature.id);
                        setReloadKey((key) => key + 1);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {tab !== 'saved' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="signature-initials"
                checked={variant === 'initials'}
                onCheckedChange={(checked) =>
                  setVariant(checked ? 'initials' : 'signature')
                }
              />
              <Label htmlFor="signature-initials" className="text-sm">
                Initials
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="signature-remember"
                checked={remember}
                onCheckedChange={setRemember}
              />
              <Label htmlFor="signature-remember" className="text-sm">
                Save for next time
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className={cn(tab === 'saved' && 'sm:justify-between')}>
          <Button variant="ghost" onClick={handleUpload}>
            <Upload className="size-4" />
            Upload an image
          </Button>
          {tab !== 'saved' && (
            <Button
              disabled={!hasPending}
              onClick={() => {
                if (pending.current) {
                  void place(pending.current, tab === 'draw' ? 'draw' : 'type');
                }
              }}
            >
              Place signature
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;
