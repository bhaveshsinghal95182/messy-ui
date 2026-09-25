/**
 * A real `Buffer` for the signing libraries.
 *
 * `@signpdf/signer-p12` is written for Node and its `sign()` begins with
 * `if (!(pdfBuffer instanceof Buffer)) throw`, then calls
 * `pdfBuffer.toString('binary')`. `@signpdf/utils`'s `findByteRange` does the
 * same. Neither works with a plain `Uint8Array`.
 *
 * Assigning `globalThis.Buffer` alone is not enough: the check is an
 * `instanceof` against whatever class those modules closed over, so every
 * argument has to be built with *this* class. That is why `ensureBuffer()`
 * returns it rather than just installing it — callers must use the return
 * value, not `globalThis.Buffer`.
 */

import { Buffer } from 'buffer';

type BufferClass = typeof Buffer;

/**
 * Installs `Buffer` globally and hands back the class to build arguments with.
 *
 * Must be called *before* importing the signing libraries, since they capture
 * the global at module-evaluation time.
 */
export function ensureBuffer(): BufferClass {
  const globals = globalThis as typeof globalThis & { Buffer?: BufferClass };
  globals.Buffer ??= Buffer;
  return Buffer;
}

/** Converts bytes into a Buffer of the same class the signing libraries see. */
export const toBuffer = (bytes: Uint8Array): Buffer =>
  ensureBuffer().from(bytes);

/** Back to a plain Uint8Array, for the rest of the app and for saving. */
export const fromBuffer = (buffer: Buffer): Uint8Array =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice();

/**
 * Bytes to a binary string, where every character code equals its byte.
 *
 * node-forge works in binary strings, and the obvious `TextDecoder('latin1')`
 * is *not* the right tool: the WHATWG label "latin1" resolves to windows-1252,
 * which remaps 0x80-0x9F to other code points — byte 0x80 comes back as U+20AC.
 * DER is full of those bytes, so decoding a certificate that way corrupts it
 * and the parse fails with a misleading "not a PKCS#12 file".
 *
 * Chunked because `String.fromCharCode(...bytes)` blows the argument limit on
 * anything larger than a few tens of kilobytes.
 */
export function bytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return result;
}

/** The inverse: a binary string back to the bytes it stands for. */
export function binaryStringToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}
