/**
 * Cryptographic signing, in the browser.
 *
 * The two-pass structure is forced by what a PDF signature has to cover: the
 * whole file *except* the bytes holding the signature itself. So the document
 * is first written with a fixed-size hole and a /ByteRange placeholder, then
 * the signature is computed over the two spans either side of that hole and
 * spliced in. Nothing about the file's length changes between the passes,
 * which is why the reserved space has to be fixed up front.
 */

import { ensureBuffer, fromBuffer, toBuffer } from './buffer-shim';
import {
  addSignaturePlaceholder,
  DEFAULT_SIGNATURE_LENGTH,
} from './placeholder';
import { loadPdfLib } from '../export/build';
import type { Rect } from '../types';

export interface SignOptions {
  /** The document to sign, as already-exported bytes. */
  bytes: Uint8Array;
  /** PKCS#12 certificate bytes. Never stored anywhere. */
  certificate: Uint8Array;
  passphrase: string;
  /** 0-based page for the signature widget. */
  pageIndex?: number;
  /** Widget rectangle in PDF points. Omit for an invisible signature. */
  rect?: Rect;
  reason?: string;
  name?: string;
  location?: string;
  contactInfo?: string;
}

export class SigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigningError';
  }
}

/**
 * Signs a PDF and returns the signed bytes.
 *
 * Two details here are the difference between a signature Acrobat accepts and
 * one it flags:
 *
 * 1. The document is loaded `forIncrementalUpdate` and saved with
 *    `saveIncremental`, so the original bytes are preserved verbatim and the
 *    signature is appended. Rewriting the file wholesale would invalidate any
 *    signature already on it.
 * 2. Object streams are disabled for this revision. With them on, the
 *    /Contents string can end up inside a compressed object stream, where
 *    there is no contiguous run of bytes to splice the signature into.
 */
export async function signPdf(options: SignOptions): Promise<Uint8Array> {
  const {
    bytes,
    certificate,
    passphrase,
    pageIndex = 0,
    rect,
    reason,
    name,
    location,
    contactInfo,
  } = options;

  // Must happen before the signing libraries are imported: they capture the
  // global Buffer when their module body runs.
  const Buffer = ensureBuffer();

  const lib = await loadPdfLib();
  const { PDFDocument } = lib;

  const doc = await PDFDocument.load(bytes, {
    forIncrementalUpdate: true,
    ignoreEncryption: true,
  });

  const pages = doc.getPages();
  const page = pages[Math.min(Math.max(pageIndex, 0), pages.length - 1)];
  if (!page) throw new SigningError('The document has no pages to sign.');

  addSignaturePlaceholder({
    lib,
    doc,
    page,
    reason,
    name,
    location,
    contactInfo,
    rect: rect ? { x: rect.x, y: rect.y, w: rect.w, h: rect.h } : undefined,
    signatureLength: DEFAULT_SIGNATURE_LENGTH,
  });

  const withPlaceholder = await doc.save({ useObjectStreams: false });

  // Both @signpdf packages are CJS with no exports map, so the interop shape
  // varies by bundler. Resolve defensively rather than assuming.
  const signpdfModule = (await import('@signpdf/signpdf')) as unknown as {
    default?: { sign: (pdf: Buffer, signer: unknown) => Promise<Buffer> };
    sign?: (pdf: Buffer, signer: unknown) => Promise<Buffer>;
  };
  const signer = (await import('@signpdf/signer-p12')) as unknown as {
    P12Signer?: new (cert: Buffer, options: { passphrase: string }) => unknown;
    default?: {
      P12Signer: new (cert: Buffer, options: { passphrase: string }) => unknown;
    };
  };

  const signpdf = signpdfModule.default ?? signpdfModule;
  const P12Signer = signer.P12Signer ?? signer.default?.P12Signer;

  if (!signpdf?.sign || !P12Signer) {
    throw new SigningError('The signing library failed to load.');
  }

  try {
    const signed = await signpdf.sign(
      // Built with the same Buffer class the library will `instanceof` against.
      toBuffer(withPlaceholder),
      new P12Signer(toBuffer(certificate), { passphrase })
    );
    return fromBuffer(signed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/mac|password|passphrase/i.test(message)) {
      throw new SigningError('That passphrase did not unlock the certificate.');
    }
    throw new SigningError(`Signing failed: ${message}`);
  }
}
