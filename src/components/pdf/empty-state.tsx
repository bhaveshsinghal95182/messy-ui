'use client';

import { FileUp, Images, Lock, MonitorSmartphone, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  onOpen: () => void;
  /** Builds a new PDF from picked images — the /pdf/image-to-pdf entry point. */
  onImagesToPdf: () => void;
  isDragging: boolean;
  isOpening: boolean;
}

const ASSURANCES = [
  {
    icon: Lock,
    title: 'Nothing is uploaded',
    body: 'Your file is opened by this browser tab and never sent anywhere.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    body: 'Once the page has loaded, the editor keeps working with no network.',
  },
  {
    icon: MonitorSmartphone,
    title: 'No account, no limits',
    body: 'No sign-up, no watermark, no cap on file size or page count.',
  },
];

/** The drop target shown before a document is open. */
const EmptyState = ({
  onOpen,
  onImagesToPdf,
  isDragging,
  isOpening,
}: EmptyStateProps) => {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-xl">
        <button
          type="button"
          onClick={onOpen}
          disabled={isOpening}
          className={cn(
            'focus-visible:ring-ring flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-accent/40'
          )}
        >
          <FileUp
            className={cn(
              'size-10',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div>
            <p className="text-title text-lg font-medium">
              {isOpening ? 'Opening…' : 'Drop a PDF here'}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              or click to browse — you can also paste one from the clipboard
            </p>
          </div>
          <Button asChild={false} type="button" tabIndex={-1} size="sm">
            Choose a file
          </Button>
        </button>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onImagesToPdf}
            disabled={isOpening}
          >
            <Images className="size-4" />
            Turn images into a PDF instead
          </Button>
        </div>

        <ul className="text-body mt-8 grid gap-4 sm:grid-cols-3">
          {ASSURANCES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="text-center sm:text-left">
              <Icon className="text-primary mx-auto size-4 sm:mx-0" />
              <p className="text-title mt-2 text-sm font-medium">{title}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmptyState;
