import 'vitest';

/**
 * vitest-axe ships its matchers but not the type augmentation that registers
 * them with expect - its dist/extend-expect.js is an empty file - so the
 * declaration lives here instead.
 */
declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
