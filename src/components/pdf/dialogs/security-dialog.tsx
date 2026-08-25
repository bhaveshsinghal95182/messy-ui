'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Switch } from '@/components/ui/switch';
import {
  createEncryptionSettings,
  PASSWORD_EXPLANATION,
} from '@/lib/pdf/security/encrypt';
import type { EncryptionSettings } from '@/lib/pdf/types';

interface SecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The permission flags, in the order they make sense to read. */
const PERMISSION_FIELDS: {
  key: keyof Omit<EncryptionSettings['permissions'], 'printing'>;
  label: string;
}[] = [
  { key: 'modifying', label: 'Change the document' },
  { key: 'copying', label: 'Copy text and images' },
  { key: 'annotating', label: 'Add comments and annotations' },
  { key: 'fillingForms', label: 'Fill in form fields' },
  { key: 'contentAccessibility', label: 'Extract content for accessibility' },
  { key: 'documentAssembly', label: 'Insert, rotate or delete pages' },
];

/**
 * Passwords and permissions for the exported file.
 *
 * Settings are staged into `exportSettings` and applied at export time rather
 * than to the open document, so the file on disk is never touched and the user
 * can change their mind before saving.
 */
const SecurityDialog = ({ open, onOpenChange }: SecurityDialogProps) => {
  const dispatch = usePdfDispatch();
  const stored = usePdf((state) => state.exportSettings.encryption);
  const stripMetadata = usePdf((state) => state.exportSettings.stripMetadata);

  const [draft, setDraft] = useState<EncryptionSettings>(
    stored ?? createEncryptionSettings()
  );
  const [enabled, setEnabled] = useState(stored !== null);

  const apply = () => {
    dispatch({
      type: 'SET_EXPORT_SETTINGS',
      patch: {
        // Turning the switch off is how a password is removed: the document is
        // decrypted on open, so simply not re-encrypting it drops the password.
        encryption: enabled ? draft : null,
      },
    });
    onOpenChange(false);
  };

  const setPermission = (
    key: keyof EncryptionSettings['permissions'],
    value: boolean | 'highResolution' | 'lowResolution'
  ) =>
    setDraft((current) => ({
      ...current,
      permissions: { ...current.permissions, [key]: value },
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password and permissions</DialogTitle>
          <DialogDescription>
            Applied when you download. The original file on your disk is never
            modified, and nothing is sent anywhere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-center gap-2">
            <Switch
              id="encrypt-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="encrypt-enabled">Protect with a password</Label>
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="user-password">
                  Password to open the document
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={draft.userPassword}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      userPassword: event.target.value,
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {PASSWORD_EXPLANATION.user}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-password">
                  Owner password (optional)
                </Label>
                <Input
                  id="owner-password"
                  type="password"
                  autoComplete="new-password"
                  value={draft.ownerPassword}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ownerPassword: event.target.value,
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {PASSWORD_EXPLANATION.owner}
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">
                  Allow readers to
                </legend>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="perm-printing"
                    checked={draft.permissions.printing !== false}
                    onCheckedChange={(checked) =>
                      setPermission(
                        'printing',
                        checked ? 'highResolution' : false
                      )
                    }
                  />
                  <Label htmlFor="perm-printing" className="font-normal">
                    Print the document
                  </Label>
                </div>

                {PERMISSION_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${key}`}
                      checked={draft.permissions[key]}
                      onCheckedChange={(checked) =>
                        setPermission(key, checked === true)
                      }
                    />
                    <Label htmlFor={`perm-${key}`} className="font-normal">
                      {label}
                    </Label>
                  </div>
                ))}

                <p className="callout callout-warning text-muted-foreground rounded-md p-3 text-xs leading-relaxed">
                  <Info className="callout-icon mr-1 inline size-3.5" />
                  Permissions are a convention that PDF readers choose to
                  honour. They are not enforced by encryption, so a tool that
                  ignores them can. Only the open password is cryptographic.
                </p>
              </fieldset>
            </>
          )}

          <div className="flex items-start gap-2 border-t pt-4">
            <Checkbox
              id="strip-metadata"
              checked={stripMetadata}
              onCheckedChange={(checked) =>
                dispatch({
                  type: 'SET_EXPORT_SETTINGS',
                  patch: { stripMetadata: checked === true },
                })
              }
            />
            <div>
              <Label htmlFor="strip-metadata" className="font-normal">
                Remove metadata and scripts
              </Label>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Clears the author, title, producer and timestamps, and strips
                document-level JavaScript, open actions and embedded
                attachments.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={apply}
            disabled={enabled && !draft.userPassword && !draft.ownerPassword}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityDialog;
