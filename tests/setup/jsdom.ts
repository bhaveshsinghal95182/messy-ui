import { afterEach, beforeAll, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// vitest-axe@0.1.0 ships a 0-byte dist/extend-expect.js, so importing
// 'vitest-axe/extend-expect' registers nothing. Register the matchers here.
expect.extend(axeMatchers);

// jsdom implements almost none of the browser APIs this library leans on.
// Everything below is a deliberate, minimal stub for a real usage found in the
// codebase - see tests/setup/README.md for the mapping.

beforeAll(() => {
  // use-mobile.ts, next-themes, motion's useReducedMotion
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }

  // Base UI (tabs), motion
  if (!('ResizeObserver' in window)) {
    (window as Window & typeof globalThis).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  if (!('IntersectionObserver' in window)) {
    (window as Window & typeof globalThis).IntersectionObserver = class {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }

  // bloom-color-picker, separator, theme-toggle all measure their own box.
  // jsdom returns all zeros, which makes ratio maths divide by zero.
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      right: 200,
      bottom: 100,
      toJSON: () => ({}),
    } as DOMRect;
  };

  // progress-bar (useScroll)
  Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

  // The four copy buttons across src/components/docs
  if (!navigator.clipboard) {
    // configurable, because userEvent.setup() replaces it with its own stub.
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    });
  }

  // countdown-timer chime
  class MockAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    close() {
      return Promise.resolve();
    }
  }
  window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  (
    window as unknown as { webkitAudioContext: typeof AudioContext }
  ).webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;

  // countdown-timer wake lock - guarded by `'wakeLock' in navigator`, so it is
  // only defined in tests that opt in. Left undefined here on purpose.

  // axe-core probes a canvas for colour work; jsdom has no 2D context and
  // logs a "Not implemented" error for every call without this.
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext'];

  // Radix/Base UI Select and Slider drive pointer capture and scroll the
  // active option into view; jsdom implements none of these.
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  // countdown-timer fullscreen
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
