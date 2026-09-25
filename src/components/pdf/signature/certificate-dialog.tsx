'use client';

import { useCallback, useState } from 'react';
import { ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { usePdfState } from '../pdf-store-provider';
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
import { exportPdf } from '@/lib/pdf/export/build';
import { saveBytes } from '@/lib/pdf/export/save';
import {
  readCertificate,
  CertificateError,
  type CertificateInfo,
} from '@/lib/pdf/sign/p12';
import { signPdf } from '@/lib/pdf/sign/sign';

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cryptographic signing with a user-supplied PKCS#12 certificate.
 *
 * The certificate bytes and passphrase live in this component's state and
 * nowhere else — not in the editor store, not in IndexedDB, not in
 * localStorage. Closing the dialog drops them. A private key is a materially
 * different thing from a picture of a signature, and is not something to
 * persist on the user's behalf.
 */
const CertificateDialog = ({ open, onOpenChange }: CertificateDialogProps) => {
  const getState = usePdfState();

  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null
  );
  const [passphrase, setPassphrase] = useState('');
  const [info, setInfo] = useState<CertificateInfo | null>(null);
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  /** Wipes every trace of the credential. Called on close and after signing. */
  const reset = useCallback(() => {
    setFile(null);
    setPassphrase('');
    setInfo(null);
    setReason('');
    setLocation('');
  }, []);

  const close = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [onOpenChange, reset]);

  const chooseFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.p12,.pfx,application/x-pkcs12';
    input.addEventListener('change', () => {
      const chosen = input.files?.[0];
      if (!chosen) return;
      void chosen.arrayBuffer().then((buffer) => {
        setFile({ name: chosen.name, bytes: new Uint8Array(buffer) });
        setInfo(null);
      });
    });
    input.click();
  }, []);

  /** Reads the certificate so the user can confirm it before signing with it. */
  const inspect = useCallback(async () => {
    if (!file || !passphrase) return;
    setBusy(true);
    try {
      setInfo(await readCertificate(file.bytes, passphrase));
    } catch (error) {
      setInfo(null);
      toast.error(
        error instanceof CertificateError
          ? error.message
          : 'Could not read that certificate.'
      );
    } finally {
      setBusy(false);
    }
  }, [file, passphrase]);

  const sign = useCallback(async () => {
    if (!file || !passphrase) return;
    setBusy(true);
    try {
      const state = getState();
      // Sign the exported document, so annotations and page edits are inside
      // what the signature covers.
      const exported = await exportPdf(state);
      const signed = await signPdf({
        bytes: exported,
        certificate: file.bytes,
        passphrase,
        reason: reason || undefined,
        location: location || undefined,
        name: info?.subject,
      });

      const filename = state.exportSettings.filename.replace(
        /\.pdf$/i,
        '-signed.pdf'
      );
      const saved = await saveBytes(signed, filename);
      if (saved) {
        toast.success('Signed and saved', {
          description: 'The certificate and passphrase were not stored.',
        });
        close();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'The document could not be signed.'
      );
    } finally {
      setBusy(false);
    }
  }, [close, file, getState, info, location, passphrase, reason]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign with a certificate</DialogTitle>
          <DialogDescription>
            A cryptographic signature proves the document has not changed since
            you signed it. Your certificate and passphrase are used here in the
            browser and are never stored or transmitted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Certificate (.p12 or .pfx)</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={chooseFile}
            >
              <Upload className="size-4" />
              {file ? file.name : 'Choose a certificate file'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cert-passphrase">Passphrase</Label>
            <Input
              id="cert-passphrase"
              type="password"
              autoComplete="off"
              value={passphrase}
              onChange={(event) => {
                setPassphrase(event.target.value);
                setInfo(null);
              }}
              onBlur={() => void inspect()}
            />
          </div>

          {info && (
            <div className="bg-muted/50 space-y-1 rounded-md border p-3 text-xs">
              <p className="text-title flex items-center gap-1.5 font-medium">
                <ShieldCheck className="text-primary size-3.5" />
                {info.subject}
              </p>
              <p className="text-muted-foreground">
                Issued by {info.issuer || 'unknown'} · serial{' '}
                {info.serialNumber}
              </p>
              <p className="text-muted-foreground">
                Valid {info.validFrom.toLocaleDateString()} to{' '}
                {info.validTo.toLocaleDateString()}
              </p>
              {info.expired && (
                <p className="text-destructive flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5" />
                  This certificate is outside its validity period.
                </p>
              )}
              {info.selfSigned && (
                <p className="text-muted-foreground">
                  Self-signed, so readers will report the signature as valid but
                  the signer as unverified.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sign-reason">Reason (optional)</Label>
              <Input
                id="sign-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="I approve this document"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-location">Location (optional)</Label>
              <Input
                id="sign-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="London"
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            The signature covers the whole document as exported, including any
            annotations you have added. It is applied as an incremental update,
            so a signature already on the file stays valid.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => void sign()}
            disabled={!file || !passphrase || busy}
          >
            {busy ? 'Signing…' : 'Sign and download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateDialog;
