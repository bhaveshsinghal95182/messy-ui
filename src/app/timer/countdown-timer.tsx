'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TIMER_MINUTES,
  FALLBACK_PRESETS,
  MAX_TIMER_MINUTES,
} from '@/config/timers';

type Status = 'idle' | 'running' | 'paused' | 'finished';

interface CountdownTimerProps {
  /** Page H1, and the label the countdown uses in the tab title. */
  heading: string;
  /** Duration the page loads with, in minutes. */
  minutes?: number;
  /** Preset buttons, in minutes. */
  presets?: number[];
}

/** Countdown blinks for the last stretch so it's visible from across the room. */
const BLINK_THRESHOLD_MS = 10_000;
/** Floor for the custom input only - a preset may be shorter than a minute. */
const MIN_CUSTOM_MINUTES = 1;

/** Exported for unit tests - the boundaries below are easy to get subtly wrong. */
export const minutesToMs = (minutes: number) => Math.round(minutes * 60 * 1000);

export const formatTime = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

const CountdownTimer = ({
  heading,
  minutes: initialMinutes = DEFAULT_TIMER_MINUTES,
  presets = FALLBACK_PRESETS,
}: CountdownTimerProps) => {
  const [durationMs, setDurationMs] = useState(() =>
    minutesToMs(initialMinutes)
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    minutesToMs(initialMinutes)
  );
  const [status, setStatus] = useState<Status>('idle');
  const [customValue, setCustomValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const deadlineRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const baseTitleRef = useRef('');

  const isRunning = status === 'running';
  const isFinished = status === 'finished';

  /* ---------------------------------------------------------------- sound */

  const playChime = useCallback(() => {
    if (!soundOn) return;

    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = new AudioCtor();
      // Three short beeps, then let the context tear itself down.
      [0, 0.35, 0.7].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(
          0.25,
          ctx.currentTime + offset + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + offset + 0.25
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.3);
      });

      window.setTimeout(() => void ctx.close(), 1500);
    } catch {
      // Audio is a nicety — never let it break the timer.
    }
  }, [soundOn]);

  /* ----------------------------------------------------------------- tick */

  useEffect(() => {
    if (status !== 'running') return;

    const id = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);

      if (left === 0) {
        deadlineRef.current = null;
        setStatus('finished');
        playChime();
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [status, playChime]);

  /* --------------------------------------------------------------- controls */

  const start = useCallback(() => {
    setStatus((current) => {
      if (current === 'running') return current;
      const base = current === 'finished' ? durationMs : remainingMs;
      if (base <= 0) return current;
      deadlineRef.current = Date.now() + base;
      return 'running';
    });
  }, [durationMs, remainingMs]);

  const pause = useCallback(() => {
    if (deadlineRef.current !== null) {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()));
    }
    deadlineRef.current = null;
    setStatus((current) => (current === 'running' ? 'paused' : current));
  }, []);

  const toggle = useCallback(() => {
    if (status === 'running') pause();
    else start();
  }, [status, pause, start]);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    setStatus('idle');
    setRemainingMs(durationMs);
  }, [durationMs]);

  const applyDuration = useCallback((minutes: number) => {
    const ms = minutesToMs(minutes);
    deadlineRef.current = null;
    setStatus('idle');
    setDurationMs(ms);
    setRemainingMs(ms);
  }, []);

  const submitCustom = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const parsed = Number(customValue);
      if (!Number.isFinite(parsed)) return;

      const minutes = Math.min(
        MAX_TIMER_MINUTES,
        Math.max(MIN_CUSTOM_MINUTES, parsed)
      );
      applyDuration(minutes);
      setCustomValue('');
    },
    [customValue, applyDuration]
  );

  /* ------------------------------------------------------------ fullscreen */

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void shellRef.current?.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* -------------------------------------------------------- keyboard + title */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        toggle();
      } else if (event.key.toLowerCase() === 'r') {
        reset();
      } else if (event.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle, reset, toggleFullscreen]);

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    // While idle the page keeps its real <title>, so a crawler that renders the
    // page still indexes the SEO title rather than a frozen countdown.
    if (status === 'idle') {
      if (baseTitleRef.current) document.title = baseTitleRef.current;
      return;
    }

    // Once running, the countdown is readable from the tab strip while the work
    // itself is in the focused tab.
    document.title = isFinished
      ? `Time's up — ${heading}`
      : `${formatTime(remainingMs)} — ${heading}`;
  }, [remainingMs, isFinished, status, heading]);

  /* ------------------------------------------------------------- wake lock */

  useEffect(() => {
    if (!isRunning || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) void lock.release();
        else sentinel = lock;
      })
      .catch(() => {
        // Denied or unsupported — the timer still runs.
      });

    return () => {
      released = true;
      void sentinel?.release();
    };
  }, [isRunning]);

  /* --------------------------------------------------------------- render */

  const isLow = remainingMs <= BLINK_THRESHOLD_MS && remainingMs > 0;
  // Blink phase comes straight off the remaining time, so no extra timer.
  const blinkOff =
    isLow && isRunning && Math.floor(remainingMs / 500) % 2 === 1;
  const progress = durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  const activePreset = presets.find((p) => minutesToMs(p) === durationMs);

  return (
    <div
      ref={shellRef}
      className={cn(
        'flex min-h-svh w-full flex-col items-center justify-center bg-background text-foreground',
        'gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:gap-10',
        // Landscape on a phone is mostly height-starved, not width-starved.
        '[@media(max-height:600px)]:gap-3 [@media(max-height:600px)]:py-4'
      )}
    >
      <div className="flex flex-col items-center gap-4 sm:gap-6 [@media(max-height:600px)]:gap-2">
        <h1 className="text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {heading}
        </h1>

        <div
          className={cn(
            'font-mono font-medium tabular-nums leading-none tracking-tight transition-opacity duration-100',
            // Below lg the digits also have to respect the viewport height, or a
            // phone in landscape pushes the controls off screen. From lg up this
            // is exactly the desktop sizing it has always been.
            'text-[clamp(2.5rem,min(19vw,30vh),16rem)] lg:text-[clamp(4.5rem,20vw,16rem)]',
            (isLow || isFinished) && 'text-destructive',
            blinkOff && 'opacity-15'
          )}
          role="timer"
          aria-live="off"
        >
          {formatTime(remainingMs)}
        </div>

        <div
          className="h-1 w-[min(70vw,32rem)] overflow-hidden rounded-full bg-border"
          role="progressbar"
          // A progressbar without a name is announced as a bare percentage.
          aria-label={`${heading} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-100 ease-linear',
              isLow || isFinished ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>

        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {isFinished
            ? "time's up"
            : status === 'running'
              ? 'focus'
              : status === 'paused'
                ? 'paused'
                : 'ready'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={toggle} className="w-32">
          {isRunning ? (
            <>
              <Pause /> Pause
            </>
          ) : (
            <>
              <Play /> {status === 'paused' ? 'Resume' : 'Start'}
            </>
          )}
        </Button>
        <Button size="lg" variant="outline" onClick={reset}>
          <RotateCcw /> Reset
        </Button>
        <Button
          size="icon-lg"
          variant="outline"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
        <Button
          size="icon-lg"
          variant="outline"
          onClick={() => setSoundOn((on) => !on)}
          aria-label={soundOn ? 'Mute chime' : 'Unmute chime'}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {presets.map((minutes) => (
          <Button
            key={minutes}
            variant={activePreset === minutes ? 'default' : 'outline'}
            onClick={() => applyDuration(minutes)}
          >
            {minutes} min
          </Button>
        ))}

        <form onSubmit={submitCustom} className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_CUSTOM_MINUTES}
            max={MAX_TIMER_MINUTES}
            step={1}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder="Custom"
            aria-label="Custom duration in minutes"
            className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button type="submit" variant="secondary" disabled={!customValue}>
            Set
          </Button>
        </form>
      </div>

      {/* Shortcuts are useless without a keyboard, and the room they take is
          exactly what a short landscape viewport does not have. */}
      <p className="font-mono text-xs text-muted-foreground [@media(max-height:600px)]:hidden">
        space start/pause · r reset · f fullscreen
      </p>
    </div>
  );
};

export default CountdownTimer;
