import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

type Listener = () => void;

/** Installs a matchMedia stub whose change events we can fire by hand. */
const stubMatchMedia = () => {
  const listeners = new Set<Listener>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: Listener) => listeners.add(cb),
      removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );

  return {
    listeners,
    resizeTo(width: number) {
      window.innerWidth = width;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
};

const setWidth = (width: number) => {
  window.innerWidth = width;
};

describe('useIsMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports true below the 768px breakpoint', () => {
    stubMatchMedia();
    setWidth(375);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('reports false at and above the breakpoint', () => {
    stubMatchMedia();
    setWidth(768);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('subscribes to the matching media query', () => {
    stubMatchMedia();
    setWidth(1024);

    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const media = stubMatchMedia();
    setWidth(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    media.resizeTo(375);
    expect(result.current).toBe(true);

    media.resizeTo(1024);
    expect(result.current).toBe(false);
  });

  it('always returns a boolean, never the undefined initial state', () => {
    stubMatchMedia();
    setWidth(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
  });

  it('unsubscribes on unmount', () => {
    const media = stubMatchMedia();
    setWidth(375);

    const { unmount } = renderHook(() => useIsMobile());
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
