/**
 * Conversions between the editor's `RGB` (0-1 per channel, matching pdf-lib's
 * `rgb()` helper) and the `#rrggbb` strings the DOM speaks.
 *
 * Kept apart from `geometry.ts` deliberately: that module is the single place
 * allowed to convert coordinates, and diluting it with unrelated conversions
 * would weaken a rule worth keeping sharp.
 */

import type { RGB } from './types';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const channelToHex = (value: number) =>
  Math.round(clamp(value) * 255)
    .toString(16)
    .padStart(2, '0');

export const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;

/**
 * Parses `#rgb` or `#rrggbb`, with or without the hash.
 *
 * Returns `null` rather than a fallback colour for anything else, so a
 * half-typed value in a text input leaves the object alone instead of
 * repeatedly resetting it to black while the user types.
 */
export function hexToRgb(input: string): RGB | null {
  const hex = input.trim().replace(/^#/, '');

  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => character + character)
          .join('')
      : hex;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

  return {
    r: parseInt(expanded.slice(0, 2), 16) / 255,
    g: parseInt(expanded.slice(2, 4), 16) / 255,
    b: parseInt(expanded.slice(4, 6), 16) / 255,
  };
}

/** True when two colours are equal to within 8-bit precision. */
export const sameColor = (a: RGB | null, b: RGB | null): boolean =>
  a === b || (a !== null && b !== null && rgbToHex(a) === rgbToHex(b));

/**
 * The swatch row.
 *
 * Chosen so every entry stays legible against both white paper and a dark
 * viewer chrome, and so no two are distinguishable by hue alone — each carries
 * a name, because colour on its own is not an accessible way to encode meaning.
 */
export const SWATCHES: { name: string; value: RGB }[] = [
  { name: 'Black', value: { r: 0, g: 0, b: 0 } },
  { name: 'Grey', value: { r: 0.45, g: 0.45, b: 0.48 } },
  { name: 'White', value: { r: 1, g: 1, b: 1 } },
  { name: 'Red', value: { r: 0.86, g: 0.15, b: 0.15 } },
  { name: 'Orange', value: { r: 0.92, g: 0.53, b: 0.08 } },
  { name: 'Yellow', value: { r: 1, g: 0.9, b: 0.2 } },
  { name: 'Green', value: { r: 0.13, g: 0.6, b: 0.29 } },
  { name: 'Blue', value: { r: 0.15, g: 0.39, b: 0.92 } },
  { name: 'Purple', value: { r: 0.53, g: 0.25, b: 0.86 } },
];
