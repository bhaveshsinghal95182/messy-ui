import { describe, expect, it } from 'vitest';
import {
  curatedTimers,
  DEFAULT_TIMER_MINUTES,
  durationAttribute,
  durationPhrase,
  FALLBACK_PRESETS,
  headingFromSlug,
  MAX_TIMER_MINUTES,
  MIN_TIMER_MINUTES,
  minutesFromSlug,
  popularTimers,
  presetsFor,
  relatedTimers,
  resolveTimer,
  TIMER_ALIASES,
  timerFaq,
} from '@/config/timers';

describe('minutesFromSlug', () => {
  it('multiplies each number by the unit that follows it', () => {
    expect(minutesFromSlug('1-hour-30-minute')).toBe(90);
    expect(minutesFromSlug('2-hours')).toBe(120);
    expect(minutesFromSlug('90-seconds')).toBe(1.5);
  });

  it('reads a number with no unit as minutes', () => {
    expect(minutesFromSlug('20')).toBe(20);
    expect(minutesFromSlug('45-timer')).toBe(45);
  });

  it('returns null when the slug holds no usable number', () => {
    expect(minutesFromSlug('pomodoro')).toBeNull();
    expect(minutesFromSlug('')).toBeNull();
    expect(minutesFromSlug('---')).toBeNull();
  });

  it('skips zero and negative parts rather than counting them', () => {
    // "-" is a separator, so a negative can never reach the parser; a literal
    // 0 is dropped by the `value <= 0` guard.
    expect(minutesFromSlug('0-minute')).toBeNull();
    expect(minutesFromSlug('0-minute-10-minute')).toBe(10);
  });

  it('clamps the result into [MIN_TIMER_MINUTES, MAX_TIMER_MINUTES]', () => {
    expect(minutesFromSlug('99999-minute')).toBe(MAX_TIMER_MINUTES);
    expect(minutesFromSlug('1-second')).toBeCloseTo(MIN_TIMER_MINUTES, 10);
  });

  it('is case insensitive', () => {
    expect(minutesFromSlug('1-HOUR')).toBe(60);
  });
});

describe('headingFromSlug', () => {
  it('title-cases the slug and appends "Timer" when it is missing', () => {
    expect(headingFromSlug('pomodoro')).toBe('Pomodoro Timer');
    expect(headingFromSlug('deep-work')).toBe('Deep Work Timer');
  });

  it('leaves headings that already say timer/countdown/stopwatch alone', () => {
    expect(headingFromSlug('17-minute-timer')).toBe('17 Minute Timer');
    expect(headingFromSlug('exam-countdown')).toBe('Exam Countdown');
    expect(headingFromSlug('stopwatch')).toBe('Stopwatch');
  });

  it('falls back to "Countdown" for an empty slug', () => {
    // "Countdown" already satisfies the timer/countdown/stopwatch test, so no
    // suffix is appended - the fallback is "Countdown", not "Countdown Timer".
    expect(headingFromSlug('')).toBe('Countdown');
  });
});

describe('durationAttribute vs durationPhrase', () => {
  it('keeps the attributive form singular', () => {
    expect(durationAttribute(0.5)).toBe('30 second');
    expect(durationAttribute(45)).toBe('45 minute');
    expect(durationAttribute(60)).toBe('1 hour');
    expect(durationAttribute(120)).toBe('2 hour');
  });

  it('pluralises the standalone form', () => {
    expect(durationPhrase(0.5)).toBe('30 seconds');
    expect(durationPhrase(1 / 60)).toBe('1 second');
    expect(durationPhrase(1)).toBe('1 minute');
    expect(durationPhrase(45)).toBe('45 minutes');
    expect(durationPhrase(60)).toBe('1 hour');
    expect(durationPhrase(120)).toBe('2 hours');
  });
});

describe('resolveTimer', () => {
  it('returns the curated preset for a known slug', () => {
    const preset = resolveTimer('pomodoro-timer');
    expect(preset.curated).toBe(true);
    expect(preset.minutes).toBe(25);
  });

  it('normalises case and percent-encoding', () => {
    expect(resolveTimer('POMODORO-TIMER').slug).toBe('pomodoro-timer');
    expect(resolveTimer('25%2Dminute%2Dtimer').slug).toBe('25-minute-timer');
  });

  it('derives a non-curated preset from any duration-bearing slug', () => {
    const preset = resolveTimer('17-minute-timer');
    expect(preset.curated).toBe(false);
    expect(preset.minutes).toBe(17);
    expect(preset.heading).toBe('17 Minute Timer');
    expect(preset.keywords).toEqual([]);
  });

  it('falls back to the default duration when the slug holds no number', () => {
    const preset = resolveTimer('something-made-up');
    expect(preset.minutes).toBe(DEFAULT_TIMER_MINUTES);
    expect(preset.curated).toBe(false);
  });

  it('never throws, including on malformed percent-encoding', () => {
    // /timer/%25 arrives here as a bare "%", which is not valid
    // percent-encoding. It has to degrade to a default, not 500 the page.
    const junk = ['%', '%zz', '%E0%A4%A', '', '../../etc/passwd', 'timer'];
    for (const slug of junk) {
      expect(() => resolveTimer(slug), `resolveTimer(${slug})`).not.toThrow();
    }
  });
});

describe('presetsFor', () => {
  it('merges its own duration with the fallbacks, deduped and sorted', () => {
    expect(presetsFor(resolveTimer('90-minute-timer'))).toEqual([
      ...FALLBACK_PRESETS,
      90,
    ]);
  });

  it('does not duplicate a duration already in the fallbacks', () => {
    expect(presetsFor(resolveTimer('25-minute-timer'))).toEqual(
      FALLBACK_PRESETS
    );
  });

  it('drops a non-integer own duration', () => {
    const preset = resolveTimer('90-second-timer');
    expect(preset.minutes).toBe(1.5);
    expect(presetsFor(preset)).toEqual(FALLBACK_PRESETS);
  });
});

describe('relatedTimers', () => {
  it('excludes the preset itself and returns the closest by length', () => {
    const preset = resolveTimer('25-minute-timer');
    const related = relatedTimers(preset, 3);

    expect(related).toHaveLength(3);
    expect(related.map((t) => t.slug)).not.toContain(preset.slug);

    const distances = related.map((t) => Math.abs(t.minutes - preset.minutes));
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('respects the count argument and defaults to 6', () => {
    const preset = resolveTimer('pomodoro-timer');
    expect(relatedTimers(preset)).toHaveLength(6);
    expect(relatedTimers(preset, 2)).toHaveLength(2);
  });
});

describe('timerFaq', () => {
  it('leads with a duration-specific question so pages are not identical', () => {
    const five = timerFaq(resolveTimer('5-minute-timer'));
    const hour = timerFaq(resolveTimer('1-hour-timer'));

    expect(five[0].question).toBe('How do I set a 5 minute timer?');
    expect(hour[0].question).toBe('How do I set a 1 hour timer?');
    expect(five[0].answer).not.toBe(hour[0].answer);
  });

  it('gives every entry a non-empty question and answer', () => {
    for (const entry of timerFaq(resolveTimer('pomodoro-timer'))) {
      expect(entry.question.length).toBeGreaterThan(0);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });
});

describe('registry invariants', () => {
  it('has no duplicate curated slugs', () => {
    const slugs = curatedTimers.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('round-trips every curated slug through resolveTimer', () => {
    for (const preset of curatedTimers) {
      const resolved = resolveTimer(preset.slug);
      expect(resolved.slug).toBe(preset.slug);
      expect(resolved.curated).toBe(true);
      expect(resolved.minutes).toBe(preset.minutes);
    }
  });

  it('gives every curated preset the copy a page needs', () => {
    for (const preset of curatedTimers) {
      expect(preset.heading, preset.slug).toBeTruthy();
      expect(preset.title, preset.slug).toBeTruthy();
      expect(preset.description, preset.slug).toBeTruthy();
      expect(preset.intro, preset.slug).toBeTruthy();
      expect(preset.useCases.length, preset.slug).toBeGreaterThan(0);
      expect(preset.keywords.length, preset.slug).toBeGreaterThan(0);
      expect(preset.minutes).toBeGreaterThanOrEqual(MIN_TIMER_MINUTES);
      expect(preset.minutes).toBeLessThanOrEqual(MAX_TIMER_MINUTES);
    }
  });

  it('points every alias at a real curated timer', () => {
    for (const [alias, target] of Object.entries(TIMER_ALIASES)) {
      expect(
        curatedTimers.some((t) => t.slug === target),
        `alias "${alias}" points at missing timer "${target}"`
      ).toBe(true);
    }
  });

  it('never aliases a slug that is itself curated', () => {
    // An alias that is also a curated page would redirect away from a page
    // that is in the sitemap.
    for (const alias of Object.keys(TIMER_ALIASES)) {
      expect(
        curatedTimers.some((t) => t.slug === alias),
        `"${alias}" is both a curated timer and an alias`
      ).toBe(false);
    }
  });

  it('resolves every popular timer slug', () => {
    // popularTimers filters out misses silently, so a typo would quietly
    // shrink the list rather than fail loudly.
    expect(popularTimers).toHaveLength(12);
    expect(popularTimers.every((t) => t.curated)).toBe(true);
  });
});
