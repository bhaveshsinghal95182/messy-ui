/**
 * Binary payloads for image and signature objects.
 *
 * Kept in a module-level map rather than in the store so that history
 * snapshots stay cheap (they hold ids, not megabytes of PNG) and the reducer
 * stays pure. Object URLs are created lazily and revoked on clear, since a
 * leaked one pins its blob in memory for the life of the document.
 */

import { newId } from './reducer';
import type { AssetId, PdfAsset } from './types';

const assets = new Map<AssetId, PdfAsset>();

export const getAsset = (id: AssetId): PdfAsset | undefined => assets.get(id);

/** A blob: URL for rendering, created on first use and cached. */
export function getAssetUrl(id: AssetId): string | null {
  const asset = assets.get(id);
  if (!asset) return null;
  if (!asset.objectUrl) {
    asset.objectUrl = URL.createObjectURL(
      new Blob([asset.bytes.slice().buffer], { type: asset.mime })
    );
  }
  return asset.objectUrl;
}

export function putAsset(
  bytes: Uint8Array,
  mime: PdfAsset['mime'],
  width: number,
  height: number
): AssetId {
  const id = newId();
  assets.set(id, { id, bytes, mime, width, height });
  return id;
}

export function clearAssets(): void {
  for (const asset of assets.values()) {
    if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
  }
  assets.clear();
}

/**
 * Normalises any image the browser can decode into PNG or JPEG bytes.
 *
 * pdf-lib embeds only those two formats, so WebP, AVIF, GIF and SVG have to go
 * through a canvas first. JPEGs are passed through untouched — re-encoding
 * would lose quality for no benefit, since pdf-lib can embed them directly.
 */
export async function importImage(file: File | Blob): Promise<AssetId> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    const size = await imageSize(file);
    return putAsset(bytes, file.type, size.width, size.height);
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read that image.');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  // PNG, not JPEG: the source may have transparency, and flattening it onto
  // white would put a visible box around a logo or a signature.
  const png = await canvasToPngBytes(canvas);
  return putAsset(png, 'image/png', canvas.width, canvas.height);
}

const imageSize = (file: Blob): Promise<{ width: number; height: number }> =>
  createImageBitmap(file).then((bitmap) => {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  });

export async function canvasToPngBytes(
  canvas: HTMLCanvasElement
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Could not encode the image.');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Trims fully transparent margins and returns PNG bytes.
 *
 * A signature drawn on a large pad is mostly empty space; without trimming,
 * the placed object's bounding box would be the whole pad and the visible ink
 * would float somewhere inside it, making it impossible to position precisely.
 */
export function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);

  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Alpha only: ink colour is irrelevant to where the ink is.
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0 || bottom < 0) return canvas; // Nothing was drawn.

  const padding = 4;
  const x = Math.max(0, left - padding);
  const y = Math.max(0, top - padding);
  const w = Math.min(width - x, right - left + 1 + padding * 2);
  const h = Math.min(height - y, bottom - top + 1 + padding * 2);

  const trimmed = document.createElement('canvas');
  trimmed.width = w;
  trimmed.height = h;
  trimmed.getContext('2d')?.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return trimmed;
}

/**
 * Makes a near-white background transparent, for a signature photographed or
 * scanned from paper.
 *
 * A flood fill from the corners rather than a global threshold, so dark paper
 * texture in the middle of a stroke is kept while the surrounding page is
 * dropped — a global threshold would punch holes through the ink itself.
 */
export function removeWhiteBackground(
  canvas: HTMLCanvasElement,
  tolerance = 60
): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;

  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  const seen = new Uint8Array(width * height);

  const isBackground = (index: number) =>
    data[index] > 255 - tolerance &&
    data[index + 1] > 255 - tolerance &&
    data[index + 2] > 255 - tolerance;

  // Iterative rather than recursive: a full-page fill would blow the stack.
  const queue: number[] = [];
  for (let x = 0; x < width; x += 1) {
    queue.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    queue.push(y * width, y * width + width - 1);
  }

  while (queue.length > 0) {
    const pixel = queue.pop()!;
    if (seen[pixel]) continue;
    seen[pixel] = 1;

    const index = pixel * 4;
    if (!isBackground(index)) continue;
    data[index + 3] = 0;

    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) queue.push(pixel - 1);
    if (x < width - 1) queue.push(pixel + 1);
    if (y > 0) queue.push(pixel - width);
    if (y < height - 1) queue.push(pixel + width);
  }

  context.putImageData(image, 0, 0);
  return canvas;
}
