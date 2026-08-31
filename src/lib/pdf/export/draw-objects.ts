/**
 * Painting overlay objects into an exported PDF page.
 *
 * Object geometry is already in PDF user space — points, origin bottom-left —
 * which is exactly what pdf-lib's draw calls take, so nothing needs converting
 * here. That is the payoff for storing PDF space rather than screen pixels.
 */

import type { PDFDocument, PDFFont, PDFPage } from '@cantoo/pdf-lib';
import { getAsset } from '../assets';
import type { PdfObject, RGB, TextObject } from '../types';

type PdfLib = typeof import('@cantoo/pdf-lib');

export interface DrawContext {
  lib: PdfLib;
  doc: PDFDocument;
  /** Standard-14 faces, embedded once per document and reused. */
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    boldItalic: PDFFont;
  };
}

export async function createDrawContext(
  lib: PdfLib,
  doc: PDFDocument
): Promise<DrawContext> {
  const { StandardFonts } = lib;
  const [regular, bold, italic, boldItalic] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
    doc.embedFont(StandardFonts.HelveticaBoldOblique),
  ]);
  return { lib, doc, fonts: { regular, bold, italic, boldItalic } };
}

const color = (lib: PdfLib, value: RGB) => lib.rgb(value.r, value.g, value.b);

/**
 * Draws every object for one page, in z-order.
 *
 * Redactions are deliberately skipped: covering the text with a black box is
 * not redaction, since the words survive underneath and come straight back out
 * with copy-and-paste. Pages carrying one are rasterised instead, by
 * `ops/redact`, before this ever runs.
 */
export async function drawObjects(
  context: DrawContext,
  page: PDFPage,
  objects: PdfObject[]
): Promise<void> {
  for (const object of [...objects].sort((a, b) => a.z - b.z)) {
    if (object.kind === 'redaction') continue;
    await drawObject(context, page, object);
  }
}

async function drawObject(
  context: DrawContext,
  page: PDFPage,
  object: PdfObject
): Promise<void> {
  const { lib } = context;
  const { rect, opacity, rotation } = object;

  // pdf-lib rotates about the element's own origin, which for a rotated box is
  // its bottom-left corner rather than its centre.
  const rotate = rotation ? lib.degrees(rotation) : undefined;

  switch (object.kind) {
    case 'text':
      drawText(context, page, object);
      return;

    case 'image':
    case 'signature': {
      const asset = getAsset(object.assetId);
      if (!asset) return;
      const embedded =
        asset.mime === 'image/jpeg'
          ? await context.doc.embedJpg(asset.bytes)
          : await context.doc.embedPng(asset.bytes);

      // 'contain' keeps the aspect ratio, which matters most for signatures —
      // a stretched signature looks obviously forged.
      let { w, h } = rect;
      if (object.kind === 'signature' || object.fit !== 'stretch') {
        const scale = Math.min(
          rect.w / embedded.width,
          rect.h / embedded.height
        );
        w = embedded.width * scale;
        h = embedded.height * scale;
      }

      page.drawImage(embedded, {
        x: rect.x + (rect.w - w) / 2,
        y: rect.y + (rect.h - h) / 2,
        width: w,
        height: h,
        opacity,
        rotate,
      });
      return;
    }

    case 'shape':
      drawShape(context, page, object);
      return;

    case 'ink': {
      if (object.points.length < 2) return;
      const path = object.points
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        )
        .join(' ');
      // drawSvgPath works in a y-down space anchored at the given origin, so
      // the whole path is offset by the page height to land the right way up.
      page.drawSvgPath(path, {
        x: 0,
        y: page.getHeight(),
        borderColor: color(lib, object.color),
        borderWidth: object.strokeWidth,
        borderOpacity: opacity,
        scale: 1,
      });
      return;
    }

    case 'highlight':
      // Each covered line gets its own rect; a single box would paint over the
      // white space between lines and look like a block fill.
      for (const quad of object.quads.length > 0 ? object.quads : [rect]) {
        page.drawRectangle({
          x: quad.x,
          y: quad.y,
          width: quad.w,
          height: quad.h,
          color: color(lib, object.color),
          // Real multiply blending needs an ExtGState; partial opacity is the
          // close-enough approximation that keeps the text underneath legible.
          opacity: Math.min(opacity, 0.4),
        });
      }
      return;

    case 'whiteout':
      page.drawRectangle({
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        color: color(lib, object.color),
        opacity,
        rotate,
      });
      return;

    case 'note':
    case 'link':
    case 'redaction':
      // None of these are painted. Notes and links become entries in the page's
      // /Annots array — see `export/annotations` — so the viewer draws them and
      // their text and targets survive in the file. Redactions are handled by
      // rasterising the page, in `ops/redact`.
      return;

    default: {
      const never: never = object;
      return never;
    }
  }
}

function drawShape(
  context: DrawContext,
  page: PDFPage,
  object: Extract<PdfObject, { kind: 'shape' }>
) {
  const { lib } = context;
  const { rect, opacity } = object;
  const stroke = object.stroke ? color(lib, object.stroke) : undefined;
  const fill = object.fill ? color(lib, object.fill) : undefined;

  switch (object.shape) {
    case 'rect':
      page.drawRectangle({
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        borderColor: stroke,
        borderWidth: object.strokeWidth,
        color: fill,
        opacity,
        borderOpacity: opacity,
      });
      return;

    case 'ellipse':
      page.drawEllipse({
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
        xScale: rect.w / 2,
        yScale: rect.h / 2,
        borderColor: stroke,
        borderWidth: object.strokeWidth,
        color: fill,
        opacity,
        borderOpacity: opacity,
      });
      return;

    case 'line':
    case 'arrow': {
      // The line runs corner to corner of the box it was dragged out in.
      const from = { x: rect.x, y: rect.y };
      const to = { x: rect.x + rect.w, y: rect.y + rect.h };

      page.drawLine({
        start: from,
        end: to,
        thickness: object.strokeWidth,
        color: stroke,
        opacity,
      });

      if (object.arrowHead !== 'none') {
        drawArrowHead(
          context,
          page,
          from,
          to,
          object.strokeWidth,
          stroke,
          opacity
        );
        if (object.arrowHead === 'both') {
          drawArrowHead(
            context,
            page,
            to,
            from,
            object.strokeWidth,
            stroke,
            opacity
          );
        }
      }
      return;
    }
  }
}

/** A filled triangle at `to`, pointing away from `from`. */
function drawArrowHead(
  context: DrawContext,
  page: PDFPage,
  from: { x: number; y: number },
  to: { x: number; y: number },
  thickness: number,
  stroke: ReturnType<typeof color> | undefined,
  opacity: number
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.max(6, thickness * 4);
  const spread = Math.PI / 7;

  const left = {
    x: to.x - length * Math.cos(angle - spread),
    y: to.y - length * Math.sin(angle - spread),
  };
  const right = {
    x: to.x - length * Math.cos(angle + spread),
    y: to.y - length * Math.sin(angle + spread),
  };

  // Two strokes rather than a filled path: pdf-lib's drawSvgPath would need the
  // whole head re-expressed in its y-down space for no visual gain at this size.
  page.drawLine({ start: to, end: left, thickness, color: stroke, opacity });
  page.drawLine({ start: to, end: right, thickness, color: stroke, opacity });
}

/**
 * Draws a text object, wrapping to the width of its box.
 *
 * pdf-lib does not wrap, so lines are measured and broken here with the same
 * font that will render them. Standard-14 faces are WinAnsi-only: any character
 * outside that set would throw on `drawText`, so unsupported characters are
 * replaced rather than allowed to fail the whole export.
 */
function drawText(context: DrawContext, page: PDFPage, object: TextObject) {
  const { lib, fonts } = context;
  if (!object.text.trim()) return;

  const font = object.bold
    ? object.italic
      ? fonts.boldItalic
      : fonts.bold
    : object.italic
      ? fonts.italic
      : fonts.regular;

  const size = object.size;
  const lineHeight = size * object.lineHeight;
  const safe = toWinAnsi(object.text);
  const lines = wrapText(safe, font, size, object.rect.w);

  lines.forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, size);
    const x =
      object.align === 'center'
        ? object.rect.x + (object.rect.w - width) / 2
        : object.align === 'right'
          ? object.rect.x + object.rect.w - width
          : object.rect.x;

    // Text is laid out from the top of the box downwards, matching how it was
    // typed on screen; PDF's baseline sits below the top by roughly the ascent.
    const y =
      object.rect.y + object.rect.h - (index + 1) * lineHeight + size * 0.2;

    page.drawText(line, {
      x,
      y,
      size,
      font,
      color: color(lib, object.color),
      opacity: object.opacity,
      rotate: object.rotation ? lib.degrees(object.rotation) : undefined,
    });
  });
}

/**
 * Replaces characters the standard-14 fonts cannot encode.
 *
 * WinAnsi covers Latin-1 plus a handful of typographic extras. A smart quote or
 * an em dash pasted from a word processor is common and encodable; anything
 * beyond that (CJK, emoji) becomes '?' rather than throwing, so one stray
 * character cannot fail an entire export.
 */
function toWinAnsi(text: string): string {
  return text.replace(/[^\x00-\xFF–—‘’“”•…€]/g, '?');
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}
