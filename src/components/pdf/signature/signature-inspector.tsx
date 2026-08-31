'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react';
import { usePdfState } from '../pdf-store-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { verifySignatures, type SignatureReport } from '@/lib/pdf/sign/verify';

interface SignatureInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

/**
 * Reports on the cryptographic signatures already in the open document.
 *
 * Deliberately not a green tick. Integrity and coverage are things we can
 * actually check offline; trust is not, because chaining a certificate to
 * Adobe's AATL or the EU trusted lists needs network calls this tool does not
 * make. Saying "verified" without that distinction would be the dishonest part.
 */
const SignatureInspector = ({
  open,
  onOpenChange,
}: SignatureInspectorProps) => {
  const getState = usePdfState();
  const [reports, setReports] = useState<SignatureReport[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      const found: SignatureReport[] = [];
      for (const source of Object.values(getState().sources)) {
        found.push(...(await verifySignatures(source.bytes)));
      }
      if (!cancelled) setReports(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [getState, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Signatures</DialogTitle>
          <DialogDescription>
            Checked entirely in this browser. Nothing is sent anywhere.
          </DialogDescription>
        </DialogHeader>

        {reports === null && (
          <p className="text-muted-foreground text-sm">Checking…</p>
        )}

        {reports?.length === 0 && (
          <div className="text-muted-foreground py-6 text-center text-sm">
            <CircleAlert className="mx-auto mb-2 size-5" aria-hidden="true" />
            <p>This document is not signed.</p>
          </div>
        )}

        {reports?.map((report) => (
          <div key={report.index} className="space-y-3 rounded-md border p-3">
            <div className="flex items-start gap-2">
              {report.integrityValid ? (
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <ShieldX
                  className="text-destructive mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {report.signerName || 'Unnamed signer'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {report.integrityValid
                    ? 'Integrity verified — the document has not changed since signing.'
                    : (report.error ?? 'This signature could not be verified.')}
                </p>
              </div>
            </div>

            {report.integrityValid && (
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Trust chain not checked. Confirming the signer is who they
                  claim to be needs a certificate authority lookup over the
                  network, which this tool never does.
                </span>
              </p>
            )}

            {!report.coversWholeDocument && (
              <p className="text-destructive flex items-start gap-1.5 text-xs">
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  The signature does not cover the whole file. Content was added
                  after it was signed.
                </span>
              </p>
            )}

            <Separator />

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {report.issuer && (
                <>
                  <dt className="text-muted-foreground">Issuer</dt>
                  <dd className="min-w-0 break-words">{report.issuer}</dd>
                </>
              )}
              {report.serialNumber && (
                <>
                  <dt className="text-muted-foreground">Serial</dt>
                  <dd className="min-w-0 font-mono break-all">
                    {report.serialNumber}
                  </dd>
                </>
              )}
              {report.signedAt && (
                <>
                  <dt className="text-muted-foreground">Signed</dt>
                  <dd>
                    {formatDate(report.signedAt)}{' '}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      claimed
                    </Badge>
                  </dd>
                </>
              )}
              {report.reason && (
                <>
                  <dt className="text-muted-foreground">Reason</dt>
                  <dd className="min-w-0 break-words">{report.reason}</dd>
                </>
              )}
              {report.location && (
                <>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="min-w-0 break-words">{report.location}</dd>
                </>
              )}
            </dl>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default SignatureInspector;
