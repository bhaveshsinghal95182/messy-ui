/**
 * Link target validation.
 *
 * We are the ones writing the file, so we are the ones responsible for what
 * ends up in a `/URI` action. A PDF link carrying `javascript:` is a real
 * attack vector in viewers that honour document JavaScript, and `file:` reaches
 * the reader's own disk — neither belongs in a document produced by a tool
 * whose whole promise is that it is safe to use.
 */

const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

/**
 * Normalises a typed link into something safe to write, or `null`.
 *
 * A bare `example.com` is treated as `https://example.com`, because that is
 * invariably what someone typing it means and the alternative is a link that
 * silently does nothing.
 */
export function normalizeLinkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return ALLOWED.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Whether a typed value would produce a usable link, for inline validation. */
export const isValidLinkUrl = (input: string): boolean =>
  normalizeLinkUrl(input) !== null;
