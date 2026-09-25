import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_COPY_ID, useCopyToClipboard } from './use-copy-to-clipboard';

const writeText = () => vi.mocked(navigator.clipboard.writeText);

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    writeText().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with nothing copied', () => {
    const { result } = renderHook(() => useCopyToClipboard());

    expect(result.current.copiedId).toBeNull();
    expect(result.current.isCopied()).toBe(false);
  });

  it('writes the text and flags the default id', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('pnpm dlx shadcn@latest add tabs');
    });

    expect(writeText()).toHaveBeenCalledWith('pnpm dlx shadcn@latest add tabs');
    expect(result.current.copiedId).toBe(DEFAULT_COPY_ID);
    expect(result.current.isCopied()).toBe(true);
  });

  it('tracks which of several buttons was pressed', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('npm i', 'npm');
    });

    expect(result.current.isCopied('npm')).toBe(true);
    expect(result.current.isCopied('pnpm')).toBe(false);

    await act(async () => {
      await result.current.copy('pnpm i', 'pnpm');
    });

    // The tick moves rather than appearing on both.
    expect(result.current.isCopied('npm')).toBe(false);
    expect(result.current.isCopied('pnpm')).toBe(true);
  });

  it('clears the flag after the reset window', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('text');
    });

    act(() => void vi.advanceTimersByTime(1999));
    expect(result.current.isCopied()).toBe(true);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.isCopied()).toBe(false);
  });

  it('restarts the window on a second copy rather than inheriting the first', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('first', 'a');
    });
    act(() => void vi.advanceTimersByTime(1900));

    await act(async () => {
      await result.current.copy('second', 'b');
    });

    // The first copy's timer would have fired here and wiped the flag.
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current.isCopied('b')).toBe(true);

    act(() => void vi.advanceTimersByTime(1800));
    expect(result.current.isCopied('b')).toBe(false);
  });

  it('honours a custom reset window', async () => {
    const { result } = renderHook(() => useCopyToClipboard(500));

    await act(async () => {
      await result.current.copy('text');
    });

    act(() => void vi.advanceTimersByTime(500));
    expect(result.current.isCopied()).toBe(false);
  });

  it('reports failure instead of throwing when the clipboard is denied', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    writeText().mockRejectedValueOnce(new Error('denied'));

    const { result } = renderHook(() => useCopyToClipboard());

    let copied: boolean | undefined;
    await act(async () => {
      copied = await result.current.copy('text');
    });

    expect(copied).toBe(false);
    expect(result.current.isCopied()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('does not set state after unmount', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('text');
    });
    unmount();

    // The pending reset must be cancelled; if it is not, React logs an
    // update-on-unmounted warning when it fires.
    act(() => void vi.advanceTimersByTime(5000));
    expect(error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    error.mockRestore();
  });
});
