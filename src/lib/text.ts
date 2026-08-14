/**
 * Strips the rich-text link syntax used in component descriptions
 * (`[label](url)` and `[[target|label]]`) down to readable plain text.
 *
 * Card summaries and meta descriptions can't render those links - a card is
 * already wrapped in a Link, and meta tags are text-only - so the raw markup
 * would otherwise leak into the UI and into search results.
 */
const RICH_LINK_PATTERN =
  /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)/g;

export function plainText(value: string): string {
  return value
    .replace(RICH_LINK_PATTERN, (_match, wikiTarget, wikiLabel, mdLabel) =>
      (mdLabel ?? wikiLabel ?? wikiTarget ?? '').trim()
    )
    .replace(/\s+/g, ' ')
    .trim();
}
