/**
 * Verifying a signature already in a PDF.
 *
 * This checks two things and is careful not to imply a third:
 *
 * 1. **Integrity** — recompute the digest over the signed byte ranges and
 *    check it against the PKCS#7 blob. If a byte changed, this fails.
 * 2. **Coverage** — whether the /ByteRange actually spans the whole file bar
 *    the signature. A signature covering only part of a document is the
 *    classic incremental-update attack: valid crypto over content that has had
 *    pages appended after the fact.
 *
 * It cannot check **trust**. Deciding whether the signer's certificate chains
 * to an authority anyone recognises means fetching Adobe's AATL or the EU
 * trusted lists, plus CRL or OCSP responses — all network calls, which this
 * tool deliberately does not make. The result says so rather than showing a
 * green tick that would mean less than the user assumes.
 */

import type * as Forge from 'node-forge';
import { bytesToBinaryString } from './buffer-shim';
import { loadForge } from './p12';

/**
 * The pieces of a PKCS#7 message forge exposes for manual verification.
 *
 * The attributes are forge `Asn1` nodes; they are re-encoded as-is, so the
 * type is borrowed from forge rather than restated.
 */
interface RawCapture {
  signature: string;
  authenticatedAttributes?: Forge.asn1.Asn1[];
}

export interface SignatureReport {
  /** Index of this signature, in document order. */
  index: number;
  signerName: string;
  issuer: string;
  serialNumber: string;
  reason: string;
  location: string;
  /** Claimed signing time from the /M entry, which the signer chose. */
  signedAt: Date | null;
  /** The digest over the signed ranges matches the signature. */
  integrityValid: boolean;
  /** The signature covers the entire file except its own /Contents. */
  coversWholeDocument: boolean;
  /** Present when the signature could not be parsed at all. */
  error?: string;
}

/** Reads a PDF literal string, e.g. `/Reason (Approved)`. */
const readString = (source: string, key: string): string => {
  const match = new RegExp(`/${key}\\s*\\(([^)]*)\\)`).exec(source);
  return match ? match[1] : '';
};

/** Parses a PDF date string, e.g. D:20260825120000+00'00'. */
function readDate(source: string): Date | null {
  const match = /\/M\s*\(D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(
    source
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
}

/**
 * Finds every signature in a document and reports on it.
 *
 * Works over the raw bytes rather than a parsed object tree, because the
 * /ByteRange offsets are file offsets — they only mean anything against the
 * exact bytes on disk, and re-serialising the document would move them.
 */
export async function verifySignatures(
  bytes: Uint8Array
): Promise<SignatureReport[]> {
  const forge = await loadForge();
  const raw = bytesToBinaryString(bytes);
  const reports: SignatureReport[] = [];

  const byteRangePattern =
    /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = byteRangePattern.exec(raw)) !== null) {
    const ranges = [+match[1], +match[2], +match[3], +match[4]];
    // The dictionary text around this ByteRange, for /Reason, /M and friends.
    const dictionary = raw.slice(
      Math.max(0, match.index - 600),
      match.index + 600
    );

    const report: SignatureReport = {
      index: index++,
      signerName: readString(dictionary, 'Name'),
      issuer: '',
      serialNumber: '',
      reason: readString(dictionary, 'Reason'),
      location: readString(dictionary, 'Location'),
      signedAt: readDate(dictionary),
      integrityValid: false,
      coversWholeDocument: false,
    };

    try {
      // /Contents holds the DER signature, hex-encoded, between the two ranges.
      const contentsStart = ranges[0] + ranges[1];
      const contentsEnd = ranges[2];
      const hex = raw
        .slice(contentsStart, contentsEnd)
        .replace(/[<>\s]/g, '')
        // Trailing zeros pad the reserved space and are not part of the DER.
        .replace(/(00)+$/, '');

      const der = forge.util.createBuffer(forge.util.hexToBytes(hex));
      const message = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der));

      const certificate = (
        message as unknown as { certificates?: Forge.pki.Certificate[] }
      ).certificates?.[0];
      if (certificate) {
        const cn = certificate.subject.getField('CN');
        const issuerCn = certificate.issuer.getField('CN');
        report.signerName =
          report.signerName || (cn?.value as string) || 'Unknown signer';
        report.issuer = (issuerCn?.value as string) ?? '';
        report.serialNumber = certificate.serialNumber;
      }

      // The signed content: everything except the /Contents hole.
      const signedBytes = new Uint8Array(ranges[1] + ranges[3]);
      signedBytes.set(bytes.subarray(ranges[0], ranges[0] + ranges[1]), 0);
      signedBytes.set(
        bytes.subarray(ranges[2], ranges[2] + ranges[3]),
        ranges[1]
      );

      // node-forge's pkcs7 `verify()` is a stub that throws "not yet
      // implemented", so the check is done by hand — which is no bad thing,
      // since it makes explicit what is actually being proven:
      //
      //   1. the messageDigest attribute equals the digest of the signed bytes
      //   2. the RSA signature over the authenticated attributes is valid
      //      under the embedded certificate's public key
      //
      // Both must hold. Checking only the second would let an attacker keep a
      // valid signature while swapping the content it claims to cover.
      const capture = (message as unknown as { rawCapture: RawCapture })
        .rawCapture;

      const contentDigest = forge.md.sha256
        .create()
        .update(bytesToBinaryString(signedBytes))
        .digest()
        .getBytes();

      let attributeDigest: string | null = null;
      for (const attribute of capture.authenticatedAttributes ?? []) {
        const oid = forge.asn1.derToOid(
          (attribute.value as Forge.asn1.Asn1[])[0].value as string
        );
        if (oid === forge.pki.oids.messageDigest) {
          const values = (attribute.value as Forge.asn1.Asn1[])[1];
          attributeDigest = (values.value as Forge.asn1.Asn1[])[0]
            .value as string;
        }
      }

      const digestMatches =
        attributeDigest !== null && attributeDigest === contentDigest;

      // The signature is computed over the attributes re-encoded as a
      // universal SET, not over the [0] IMPLICIT tag they carry in the message.
      const attributeSet = forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SET,
        true,
        capture.authenticatedAttributes ?? []
      );
      const attributeDer = forge.asn1.toDer(attributeSet).getBytes();
      const attributeHash = forge.md.sha256
        .create()
        .update(attributeDer)
        .digest()
        .getBytes();

      const publicKey = certificate?.publicKey as
        | { verify: (digest: string, signature: string) => boolean }
        | undefined;

      const signatureValid = Boolean(
        publicKey?.verify(attributeHash, capture.signature)
      );

      report.integrityValid = digestMatches && signatureValid;
      if (!digestMatches && signatureValid) {
        report.error =
          'The signature is intact but the document has been altered since it was signed.';
      }

      // The last range should reach the end of the file. Anything after it is
      // content appended after signing, which the signature does not cover.
      const signedThrough = ranges[2] + ranges[3];
      report.coversWholeDocument = signedThrough >= bytes.length - 2;
    } catch (error) {
      report.error =
        error instanceof Error
          ? error.message
          : 'Could not read the signature.';
    }

    reports.push(report);
  }

  return reports;
}

/** Whether the document carries any signature at all. */
export const hasSignature = (bytes: Uint8Array): boolean =>
  bytesToBinaryString(bytes).includes('/SubFilter /adbe.pkcs7');
