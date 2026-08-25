/**
 * Adds a signature placeholder to a document.
 *
 * Ported from @signpdf/placeholder-pdf-lib (MIT, https://github.com/vbuch/node-signpdf).
 * That package is not used directly because it peer-depends on `pdf-lib`,
 * which would pull a second copy of the library into the bundle alongside
 * `@cantoo/pdf-lib` — two sets of PDFName/PDFDict classes whose `instanceof`
 * checks would not agree. It is ~120 lines, so vendoring is cheaper than the
 * duplication.
 *
 * The placeholder is what makes detached signing possible: it reserves a
 * fixed-size hole in the file for the eventual signature, and a /ByteRange
 * array that signpdf later rewrites to point at the two spans either side of
 * that hole. The signature is then computed over the file *minus* the hole it
 * lives in, which is the only way a signature can cover the document that
 * contains it.
 */

import type { PDFDocument, PDFPage, PDFRef } from '@cantoo/pdf-lib';

type PdfLib = typeof import('@cantoo/pdf-lib');

/**
 * The exact token @signpdf/utils' `findByteRange` looks for: a literal `0`
 * followed by three `/**********` names. Anything else and it will not find
 * the placeholder to rewrite.
 */
const BYTE_RANGE_PLACEHOLDER = '/**********';

/** Reserved space, in bytes, for the DER signature. Doubled as hex. */
export const DEFAULT_SIGNATURE_LENGTH = 16384;

export interface PlaceholderOptions {
  lib: PdfLib;
  doc: PDFDocument;
  page: PDFPage;
  reason?: string;
  name?: string;
  location?: string;
  contactInfo?: string;
  /** Widget rectangle in PDF points; zero-size makes the field invisible. */
  rect?: { x: number; y: number; w: number; h: number };
  signatureLength?: number;
}

/**
 * Formats a PDF date string, e.g. D:20260825120000+00'00'.
 *
 * Always UTC: the local offset of the machine doing the signing is not
 * something worth leaking into the document.
 */
function pdfDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}+00'00'`
  );
}

/**
 * Creates the signature dictionary, its widget annotation, and the AcroForm
 * entries that tie them together. Returns the widget's ref.
 */
export function addSignaturePlaceholder({
  lib,
  doc,
  page,
  reason = 'Signed with messy-ui',
  name,
  location,
  contactInfo,
  rect = { x: 0, y: 0, w: 0, h: 0 },
  signatureLength = DEFAULT_SIGNATURE_LENGTH,
}: PlaceholderOptions): PDFRef {
  const { PDFArray, PDFDict, PDFHexString, PDFName, PDFNumber, PDFString } =
    lib;
  const context = doc.context;

  /* ----------------------------- /Sig dict ------------------------------ */

  const byteRange = PDFArray.withContext(context);
  byteRange.push(PDFNumber.of(0));
  byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER.slice(1)));
  byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER.slice(1)));
  byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER.slice(1)));

  const signature = context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: byteRange,
    // Reserved space for the DER blob, written as hex so it occupies exactly
    // twice the byte count. signpdf splices the real signature in here.
    Contents: PDFHexString.of('0'.repeat(signatureLength * 2)),
    Reason: PDFString.of(reason),
    M: PDFString.of(pdfDate(new Date())),
    ...(name ? { Name: PDFString.of(name) } : {}),
    ...(location ? { Location: PDFString.of(location) } : {}),
    ...(contactInfo ? { ContactInfo: PDFString.of(contactInfo) } : {}),
  });
  const signatureRef = context.register(signature);

  /* --------------------------- Widget annot ----------------------------- */

  const widgetRect = PDFArray.withContext(context);
  for (const value of [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h]) {
    widgetRect.push(PDFNumber.of(value));
  }

  const widget = context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    // A signature form field, whose value is the /Sig dict above.
    FT: 'Sig',
    Rect: widgetRect,
    V: signatureRef,
    T: PDFString.of(`Signature${Date.now()}`),
    // Flag 4 = Print: the field appears on paper as well as on screen.
    F: PDFNumber.of(4),
    P: page.ref,
  });
  const widgetRef = context.register(widget);

  /* ------------------------- Page + AcroForm ---------------------------- */

  page.node.addAnnot(widgetRef);

  // lookupMaybe, not lookup: pdf-lib's typed `lookup` asserts and throws
  // "Expected instance of PDFDict, but got instance of undefined" when the key
  // is simply absent, which is the normal case for a document with no form.
  const acroForm = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  if (acroForm) {
    const fields = acroForm.lookupMaybe(PDFName.of('Fields'), PDFArray);
    if (fields) {
      fields.push(widgetRef);
    } else {
      const created = PDFArray.withContext(context);
      created.push(widgetRef);
      acroForm.set(PDFName.of('Fields'), created);
    }
    // SigFlags 3 = SignaturesExist | AppendOnly. AppendOnly tells readers the
    // document must only ever be modified by appending, which is what keeps an
    // existing signature verifiable.
    acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
  } else {
    const fields = PDFArray.withContext(context);
    fields.push(widgetRef);
    doc.catalog.set(
      PDFName.of('AcroForm'),
      context.obj({ Fields: fields, SigFlags: PDFNumber.of(3) })
    );
  }

  return widgetRef;
}
