import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import CountdownTimer, { formatTime, minutesToMs } from './countdown-timer';

/** Advance both the tick interval and the faked clock the deadline reads. */
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

const display = () => screen.getByRole('timer');
const status = () => screen.getByText(/^(ready|focus|paused|time's up)$/i);

describe('formatTime', () => {
  it('rounds up, so a running timer never shows a second it has already spent', () => {
    // Anything above zero must read as at least one second, or the last
    // second of a countdown appears to last twice as long.
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(999)).toBe('00:01');
    expect(formatTime(1000)).toBe('00:01');
    expect(formatTime(1001)).toBe('00:02');
  });

  it('switches to H:MM:SS exactly at the hour', () => {
    expect(formatTime(59 * 1000)).toBe('00:59');
    expect(formatTime(60 * 1000)).toBe('01:00');
    expect(formatTime(3599 * 1000)).toBe('59:59');
    expect(formatTime(3600 * 1000)).toBe('1:00:00');
    expect(formatTime(3661 * 1000)).toBe('1:01:01');
    expect(formatTime(minutesToMs(600))).toBe('10:00:00');
  });
});

describe('minutesToMs', () => {
  it('rounds to whole milliseconds so sub-minute presets stay exact', () => {
    expect(minutesToMs(25)).toBe(1_500_000);
    expect(minutesToMs(0.5)).toBe(30_000);
    expect(minutesToMs(1 / 60)).toBe(1000);
  });
});

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'Base Title';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads at the requested duration, idle', () => {
    render(<CountdownTimer heading="Deep Work" minutes={25} />);

    expect(display()).toHaveTextContent('25:00');
    expect(status()).toHaveTextContent(/ready/i);
    expect(
      screen.getByRole('progressbar', { name: /deep work progress/i })
    ).toHaveAttribute('aria-valuenow', '0');
  });

  it('counts down from a deadline rather than accumulating ticks', () => {
    render(<CountdownTimer heading="Deep Work" minutes={25} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // 100 uneven advances: a tick-counting implementation drifts here, a
    // deadline-based one lands on the exact wall-clock remainder.
    for (let i = 0; i < 100; i++) tick(137);

    expect(display()).toHaveTextContent(formatTime(1_500_000 - 13_700));
    expect(status()).toHaveTextContent(/focus/i);
  });

  it('pauses, holds, and resumes from where it stopped', () => {
    render(<CountdownTimer heading="Deep Work" minutes={25} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    tick(10_000);
    expect(display()).toHaveTextContent('24:50');

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(status()).toHaveTextContent(/paused/i);

    // A paused timer must not move, however long the page sits there.
    tick(60_000);
    expect(display()).toHaveTextContent('24:50');

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    tick(5_000);
    expect(display()).toHaveTextContent('24:45');
  });

  it('resets to the full duration and back to idle', () => {
    render(<CountdownTimer heading="Deep Work" minutes={25} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    tick(30_000);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(display()).toHaveTextContent('25:00');
    expect(status()).toHaveTextContent(/ready/i);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('finishes at zero and restarts from the full duration', () => {
    render(<CountdownTimer heading="Deep Work" minutes={1} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    tick(60_000);
    expect(display()).toHaveTextContent('00:00');
    expect(status()).toHaveTextContent(/time's up/i);

    // Starting from finished takes the duration, not the exhausted remainder.
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    tick(1_000);
    expect(display()).toHaveTextContent('00:59');
  });

  it('plays the chime on completion, and not while muted', () => {
    const audio = vi.spyOn(window, 'AudioContext');
    render(<CountdownTimer heading="Deep Work" minutes={1} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    tick(60_000);
    expect(audio).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /mute chime/i }));
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    tick(60_000);
    expect(audio).toHaveBeenCalledTimes(1);
  });

  it('still finishes when audio is unavailable', () => {
    vi.spyOn(window, 'AudioContext').mockImplementation(() => {
      throw new Error('no audio device');
    });

    render(<CountdownTimer heading="Deep Work" minutes={1} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    tick(60_000);

    expect(status()).toHaveTextContent(/time's up/i);
  });

  describe('duration controls', () => {
    it('applies a preset and marks it active', () => {
      render(
        <CountdownTimer heading="Deep Work" minutes={25} presets={[5, 10]} />
      );

      fireEvent.click(screen.getByRole('button', { name: '10 min' }));

      expect(display()).toHaveTextContent('10:00');
      expect(status()).toHaveTextContent(/ready/i);
    });

    it('refuses an out-of-range duration at the input', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      const input = screen.getByLabelText(/custom duration/i);

      // min/max on the input are the first gate: the browser blocks the
      // submission outright, so the duration never changes.
      fireEvent.change(input, { target: { value: '900' } });
      fireEvent.click(screen.getByRole('button', { name: /^set$/i }));
      expect(display()).toHaveTextContent('25:00');

      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: /^set$/i }));
      expect(display()).toHaveTextContent('25:00');
    });

    it('clamps to the supported range if validation is bypassed', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      const input = screen.getByLabelText(/custom duration/i);
      const form = input.closest('form')!;

      // Submitting the form directly skips constraint validation, which is
      // exactly what the handler's own clamp is there to survive.
      fireEvent.change(input, { target: { value: '900' } });
      fireEvent.submit(form);
      expect(display()).toHaveTextContent('10:00:00');

      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.submit(form);
      expect(display()).toHaveTextContent('01:00');
    });

    it('cannot be submitted empty, and rejects non-numeric text', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      const input = screen.getByLabelText(/custom duration/i);

      expect(screen.getByRole('button', { name: /^set$/i })).toBeDisabled();

      // type="number" refuses to hold text at all, which is why the
      // Number.isFinite guard in the handler is a second line of defence
      // rather than the only one.
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(input).toHaveValue(null);
      expect(screen.getByRole('button', { name: /^set$/i })).toBeDisabled();
      expect(display()).toHaveTextContent('25:00');
    });

    it('clears the input after applying it', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      const input = screen.getByLabelText(/custom duration/i);

      fireEvent.change(input, { target: { value: '7' } });
      fireEvent.click(screen.getByRole('button', { name: /^set$/i }));

      expect(input).toHaveValue(null);
      expect(display()).toHaveTextContent('07:00');
    });
  });

  describe('keyboard shortcuts', () => {
    it('starts and pauses on space, resets on r', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);

      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      tick(5_000);
      expect(display()).toHaveTextContent('24:55');

      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      expect(status()).toHaveTextContent(/paused/i);

      fireEvent.keyDown(window, { key: 'r' });
      expect(display()).toHaveTextContent('25:00');
      expect(status()).toHaveTextContent(/ready/i);
    });

    it('toggles fullscreen on f', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);

      fireEvent.keyDown(window, { key: 'F' });
      expect(Element.prototype.requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('ignores shortcuts typed into the custom duration field', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      const input = screen.getByLabelText(/custom duration/i);

      // Otherwise typing a duration would start the timer and reset it.
      fireEvent.keyDown(input, { code: 'Space', key: ' ' });
      fireEvent.keyDown(input, { key: 'r' });
      fireEvent.keyDown(input, { key: 'f' });

      expect(status()).toHaveTextContent(/ready/i);
      expect(Element.prototype.requestFullscreen).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen', () => {
    afterEach(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
    });

    it('exits when already fullscreen, and follows the browser back out', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      });
      act(() => void document.dispatchEvent(new Event('fullscreenchange')));

      const button = screen.getByRole('button', { name: /exit fullscreen/i });
      fireEvent.click(button);
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
      act(() => void document.dispatchEvent(new Event('fullscreenchange')));

      expect(
        screen.getByRole('button', { name: /enter fullscreen/i })
      ).toBeInTheDocument();
    });
  });

  describe('document title', () => {
    it('keeps the SEO title while idle', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      expect(document.title).toBe('Base Title');
    });

    it('shows the countdown while running and restores it on reset', () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);

      fireEvent.click(screen.getByRole('button', { name: /start/i }));
      tick(5_000);
      expect(document.title).toBe('24:55 — Deep Work');

      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
      expect(document.title).toBe('Base Title');
    });

    it('announces completion in the tab strip', () => {
      render(<CountdownTimer heading="Deep Work" minutes={1} />);

      fireEvent.click(screen.getByRole('button', { name: /start/i }));
      tick(60_000);

      expect(document.title).toBe("Time's up — Deep Work");
    });
  });

  describe('wake lock', () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });

    beforeEach(() => {
      // Left undefined by the shared setup, so each test opts in explicitly.
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: { request },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'wakeLock');
    });

    it('holds the screen awake only while running', async () => {
      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      expect(request).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /start/i }));
      await act(async () => {});
      expect(request).toHaveBeenCalledWith('screen');

      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      await act(async () => {});
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('runs normally when the lock is denied', async () => {
      request.mockRejectedValueOnce(new Error('denied'));

      render(<CountdownTimer heading="Deep Work" minutes={25} />);
      fireEvent.click(screen.getByRole('button', { name: /start/i }));
      await act(async () => {});

      tick(5_000);
      expect(display()).toHaveTextContent('24:55');
    });
  });

  it('has no accessibility violations', async () => {
    // axe schedules its own work on real timers, so a faked clock hangs it.
    vi.useRealTimers();
    const { container } = render(
      <CountdownTimer heading="Deep Work" minutes={25} />
    );
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
