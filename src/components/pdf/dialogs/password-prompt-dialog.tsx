'use client';

import { useState } from 'react';
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
import type { PendingPasswordFile } from '@/hooks/use-open-documents';

interface PasswordPromptDialogProps {
  pending: PendingPasswordFile | null;
  busy: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

interface PasswordFormProps {
  pending: PendingPasswordFile;
  busy: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

/**
 * Holds the typed password.
 *
 * Split out and keyed by file so that opening a different document remounts it
 * and the field starts empty, rather than resetting state from an effect. The
 * password is a real credential — it should not survive the one open it was
 * typed for.
 */
const PasswordForm = ({
  pending,
  busy,
  onSubmit,
  onCancel,
}: PasswordFormProps) => {
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (password) onSubmit(password);
      }}
    >
      <DialogHeader>
        <DialogTitle>Password required</DialogTitle>
        <DialogDescription>
          {pending.wasWrong
            ? 'That password was not accepted. Try again.'
            : `${pending.file.name} is encrypted. The password is used here in your browser and is never sent anywhere.`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2 py-4">
        <Label htmlFor="pdf-password">Password</Label>
        <Input
          id="pdf-password"
          type="password"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={pending.wasWrong || undefined}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!password || busy}>
          {busy ? 'Opening…' : 'Open'}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Asks for the password of an encrypted PDF. */
const PasswordPromptDialog = ({
  pending,
  busy,
  onSubmit,
  onCancel,
}: PasswordPromptDialogProps) => (
  <Dialog
    open={pending !== null}
    onOpenChange={(open) => {
      if (!open) onCancel();
    }}
  >
    <DialogContent className="sm:max-w-sm">
      {pending && (
        <PasswordForm
          // A new file (or a rejected attempt) remounts the form, clearing it.
          key={`${pending.file.name}:${pending.file.lastModified}:${pending.wasWrong}`}
          pending={pending}
          busy={busy}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
    </DialogContent>
  </Dialog>
);

export default PasswordPromptDialog;
