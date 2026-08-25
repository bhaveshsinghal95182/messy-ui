/**
 * Pulling text back out of a document.
 *
 * pdf.js gives positioned text items; turning those into something readable
 * means inferring the structure a PDF does not record. A PDF has no concept of
 * a paragraph, a heading or a list — only glyphs at coordinates — so anything
 * beyond a flat dump is a heuristic, and is described as one.
 */

import { getPage } from '../render';
import type { PageEntry, PdfEditorState } from '../types';

interface TextItem {
  text: string;
  /** Baseline position and glyph height, from the item's transform matrix. */
  x: number;
  y: number;
  height: number;
  width: number;
  fontName: string;
}

interface Line {
  text: string;
  y: number;
  height: number;
  fontName: string;
}

/** Reads the positioned text items for one page. */
async function readItems(entry: PageEntry): Promise<TextItem[]> {
  const page = await getPage(entry.sourceId, entry.sourceIndex);
  if (!page) return [];

  const content = await page.getTextContent();
  const items: TextItem[] = [];

  for (const item of content.items) {
    if (!('str' in item) || !item.str) continue;
    // transform is [a, b, c, d, e, f]; e/f are the position and d the scale.
    const [, , , scaleY, x, y] = item.transform as number[];
    items.push({
      text: item.str,
      x,
      y,
      height: Math.abs(scaleY),
      width: item.width ?? 0,
      fontName: item.fontName ?? '',
    });
  }

  page.cleanup();
  return items;
}

/**
 * Groups items into lines by baseline.
 *
 * Items on the same visual line rarely share an exact y — kerning, subscripts
 * and font changes all nudge it — so anything within half a glyph height is
 * treated as the same line.
 */
function toLines(items: TextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  let current: TextItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const ordered = [...current].sort((a, b) => a.x - b.x);
    const height = Math.max(...ordered.map((item) => item.height));
    lines.push({
      // Insert a space where items are separated by more than a thin gap, so
      // words split across items do not run together.
      text: ordered
        .map((item, index) => {
          if (index === 0) return item.text;
          const previous = ordered[index - 1];
          const gap = item.x - (previous.x + previous.width);
          return (gap > height * 0.2 ? ' ' : '') + item.text;
        })
        .join(''),
      y: ordered[0].y,
      height,
      fontName: ordered[0].fontName,
    });
    current = [];
  };

  for (const item of sorted) {
    if (current.length === 0) {
      current.push(item);
      continue;
    }
    const reference = current[0];
    if (Math.abs(item.y - reference.y) <= reference.height * 0.5) {
      current.push(item);
    } else {
      flush();
      current.push(item);
    }
  }
  flush();

  return lines;
}

/** Plain text for one page, lines in reading order. */
export async function extractPageText(entry: PageEntry): Promise<string> {
  return toLines(await readItems(entry))
    .map((line) => line.text)
    .join('\n');
}

/** Plain text for the whole working document, with page separators. */
export async function extractText(state: PdfEditorState): Promise<string> {
  const pages: string[] = [];
  for (const [index, entry] of state.pages.entries()) {
    const text = await extractPageText(entry);
    pages.push(`--- Page ${index + 1} ---\n\n${text}`);
  }
  return pages.join('\n\n');
}

/**
 * Markdown, inferred from type size and line spacing.
 *
 * The rules are deliberately simple, because elaborate ones fail in more
 * interesting ways: a line noticeably larger than the body text is a heading,
 * a line starting with a bullet glyph is a list item, and a monospaced font
 * means code. Anything else is a paragraph. This is a convenience, not a
 * faithful structural conversion, and a document that does not follow those
 * conventions will not convert well.
 */
export async function extractMarkdown(state: PdfEditorState): Promise<string> {
  const out: string[] = [];

  for (const [index, entry] of state.pages.entries()) {
    const lines = toLines(await readItems(entry));
    if (lines.length === 0) continue;

    // The median height is a better body-text estimate than the mean, which a
    // single large title would drag upwards.
    const heights = lines.map((line) => line.height).sort((a, b) => a - b);
    const median = heights[Math.floor(heights.length / 2)] || 1;

    if (index > 0) out.push('\n---\n');

    for (const line of lines) {
      const text = line.text.trim();
      if (!text) continue;

      const ratio = line.height / median;
      const monospace = /mono|courier/i.test(line.fontName);

      if (ratio >= 1.6) out.push(`## ${text}`);
      else if (ratio >= 1.25) out.push(`### ${text}`);
      else if (/^[•‣▪·–-]\s+/.test(text)) out.push(`- ${text.slice(2).trim()}`);
      else if (monospace) out.push(`    ${text}`);
      else out.push(text);

      out.push('');
    }
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** True when a page has no extractable text, i.e. it is probably a scan. */
export async function isProbablyScanned(entry: PageEntry): Promise<boolean> {
  const items = await readItems(entry);
  return items.every((item) => !item.text.trim());
}
