/**
 * Category slug helpers.
 *
 * Kept free of any component-config imports so client components can link to a
 * category without pulling the whole registry into the browser bundle.
 */

/** "Form Controls" -> "form-controls" */
export function toCategorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Canonical path for a category landing page. */
export function categoryPath(category: string): string {
  return `/components/category/${toCategorySlug(category)}`;
}
