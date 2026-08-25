'use client';

import { usePdf, usePdfDispatch } from '../pdf-store-provider';
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
import { Textarea } from '@/components/ui/textarea';
import type { PdfMetadata } from '@/lib/pdf/types';

interface MetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELDS: {
  key: keyof PdfMetadata;
  label: string;
  hint?: string;
  multiline?: boolean;
}[] = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject', multiline: true },
  {
    key: 'keywords',
    label: 'Keywords',
    hint: 'Separate with commas.',
  },
  { key: 'creator', label: 'Creator', hint: 'The application that made it.' },
];

/**
 * The document's own description of itself.
 *
 * Worth surfacing because these fields travel with a file and people rarely
 * realise what is in them: a document exported from a work laptop routinely
 * carries a full name and the software licence holder. The security panel's
 * "remove metadata" option clears the lot in one go.
 */
const MetadataDialog = ({ open, onOpenChange }: MetadataDialogProps) => {
  const dispatch = usePdfDispatch();
  const metadata = usePdf((state) => state.metadata);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document properties</DialogTitle>
          <DialogDescription>
            Written into the file when you download. Leave a field empty to
            leave it out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {FIELDS.map(({ key, label, hint, multiline }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`metadata-${key}`}>{label}</Label>
              {multiline ? (
                <Textarea
                  id={`metadata-${key}`}
                  rows={2}
                  value={metadata[key]}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_METADATA',
                      patch: { [key]: event.target.value },
                    })
                  }
                />
              ) : (
                <Input
                  id={`metadata-${key}`}
                  value={metadata[key]}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_METADATA',
                      patch: { [key]: event.target.value },
                    })
                  }
                />
              )}
              {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetadataDialog;
