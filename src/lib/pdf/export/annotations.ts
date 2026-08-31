/**
 * Real PDF annotation dictionaries for objects that are not merely drawn.
 *
 * A sticky note painted as a coloured rectangle looks right and carries none of
 * its text: the words exist only in the editor and vanish the moment the file
 * is saved. An annotation dictionary is the difference between a picture of a
 * note and a note.
 */

import type {
  PDFDocument,
  PDFHexString,
  PDFPage,
  PDFRef,
} from '@cantoo/pdf-lib';
import { normalizeLinkUrl } from '../link';
import type { LinkObject, NoteObject, PdfObject, RGB } from '../types';

type PdfLib = typeof import('@cantoo/pdf-lib');

/**
 * The value types an annotation dictionary needs. pdf-lib's own `LiteralObject`
 * is not exported from the package root, and `Record<string, unknown>` will not
 * satisfy `context.obj`, so the shape is spelled out here.
 */
type AnnotDict = Record<
  string,
  number | string | boolean | number[] | PDFHexString
>;

/** Resolves a working-document page id to the ref of the exported page. */
export type PageRefResolver = (pageId: string) => PDFRef | undefined;

/** `/Rect` is [llx lly urx ury]; object rects are already bottom-left anchored. */
const rectArray = ({ x, y, w, h }: PdfObject['rect']) => [x, y, x + w, y + h];

const colorArray = ({ r, g, b }: RGB) => [r, g, b];

/**
 * Attaches a `/Text` (sticky note) annotation.
 *
 * `PDFHexString.fromText` rather than a plain string: pdf-lib's `context.obj`
 * turns a JavaScript string into a `/Name`, not a text string, and a note whose
 * body is "Needs review" would silently become the name `/Needs`. The hex form
 * also encodes as UTF-16BE, so a note written in any script survives.
 */
export function addNoteAnnotation(
  lib: PdfLib,
  doc: PDFDocument,
  page: PDFPage,
  object: NoteObject
): void {
  const dict: AnnotDict = {
    Type: 'Annot',
    Subtype: 'Text',
    Rect: rectArray(object.rect),
    Contents: lib.PDFHexString.fromText(object.body),
    // A comment balloon is the icon every viewer renders the same way.
    Name: 'Comment',
    C: colorArray(object.color),
    // Bit 3 (value 4) is Print: without it the note is on screen but never
    // on paper, which is rarely what someone annotating a document wants.
    F: 4,
    Open: object.open,
    CA: object.opacity,
  };

  if (object.author.trim()) {
    dict.T = lib.PDFHexString.fromText(object.author);
  }

  page.node.addAnnot(doc.context.register(doc.context.obj(dict)));
}

/**
 * Attaches a `/Link` annotation.
 *
 * Skipped entirely when the target is empty or fails validation, so a link the
 * user started and never finished leaves no dead annotation behind — and a
 * `javascript:` URI never reaches the file. `/Border [0 0 0]` suppresses the
 * ugly default rectangle every viewer would otherwise draw.
 */
export function addLinkAnnotation(
  lib: PdfLib,
  doc: PDFDocument,
  page: PDFPage,
  object: LinkObject,
  resolvePageRef: PageRefResolver
): void {
  const common = {
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rectArray(object.rect),
    // Without this every viewer draws its own black box around the link.
    Border: [0, 0, 0],
    F: 4,
  };

  if (object.target.type === 'url') {
    const url = normalizeLinkUrl(object.target.url);
    if (!url) return;
    page.node.addAnnot(
      doc.context.register(
        doc.context.obj({
          ...common,
          A: { S: 'URI', URI: lib.PDFString.of(url) },
        })
      )
    );
    return;
  }

  const ref = resolvePageRef(object.target.pageId);
  if (!ref) return;

  // /XYZ with nulls means "this page, keep the reader's current zoom and
  // scroll position", which is the least surprising thing a jump can do.
  page.node.addAnnot(
    doc.context.register(
      doc.context.obj({
        ...common,
        Dest: [ref, 'XYZ', null, null, null],
      })
    )
  );
}

/**
 * Adds every annotation a page's objects call for.
 *
 * Kept separate from `drawObjects` because these are not painted: they are
 * entries in the page's `/Annots` array, and a viewer draws them itself.
 */
export function addAnnotations(
  lib: PdfLib,
  doc: PDFDocument,
  page: PDFPage,
  objects: PdfObject[],
  resolvePageRef: PageRefResolver
): void {
  for (const object of objects) {
    if (object.kind === 'note') addNoteAnnotation(lib, doc, page, object);
    if (object.kind === 'link') {
      addLinkAnnotation(lib, doc, page, object, resolvePageRef);
    }
  }
}
