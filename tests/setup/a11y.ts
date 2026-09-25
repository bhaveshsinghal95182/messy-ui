import { axe } from 'vitest-axe';
import type { AxeCore } from 'vitest-axe';

/**
 * axe against a rendered container, with the checks that cannot work in jsdom
 * turned off.
 *
 * jsdom has no layout engine and does not apply the Tailwind stylesheet, so
 * every element computes to the same transparent colour and zero size. Running
 * colour-contrast or any region/landmark rule here produces noise rather than
 * signal - those are covered for real in the Playwright a11y specs, which run
 * against a fully styled page in a real browser.
 */
export const checkA11y = (container: Element) =>
  axe(container, {
    // jsdom cannot host a real browsing context, so axe's attempt to reach
    // into an <iframe> throws "Respondable target must be a frame".
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  }) as Promise<AxeCore.AxeResults>;
