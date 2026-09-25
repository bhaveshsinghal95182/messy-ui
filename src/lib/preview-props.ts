/**
 * The props channel for iframe-sandboxed previews.
 *
 * ComponentPreview serialises the playground's props into the query string of
 * /preview/[slug], and that page decodes them back. The two halves live here
 * together so they cannot drift apart, and so the round trip can be tested.
 *
 * Values are JSON-encoded rather than stringified, which is what makes the
 * round trip lossless: without it the string "true" comes back as a boolean,
 * and "007" comes back as the number 7. A value that is not valid JSON is
 * passed through as a plain string, so a hand-typed URL like
 * `?position=top` still works.
 */

/** Serialises props into a query string. `undefined` values are omitted. */
export function encodePreviewProps(props: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    params.set(key, JSON.stringify(value));
  }

  return params.toString();
}

/** Rebuilds props from Next's resolved searchParams. */
export function decodePreviewProps(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    // A repeated key arrives as an array; the first value wins.
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined) continue;

    try {
      props[key] = JSON.parse(value);
    } catch {
      // Not JSON - a hand-typed value like `?position=top`.
      props[key] = value;
    }
  }

  return props;
}
