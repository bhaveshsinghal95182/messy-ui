/**
 * Timer presets behind /timer/[slug].
 *
 * A slug resolves in three steps:
 * 1. A curated preset (named, like "pomodoro-timer", or a duration, like
 *    "45-minute-timer"). These are the only ones that are indexable and listed
 *    in the sitemap.
 * 2. Failing that, any numbers in the slug are read as a duration, so
 *    /timer/17-minute-timer still opens a working 17 minute countdown.
 * 3. Failing that, the default duration with the slug as the heading.
 *
 * Steps 2 and 3 are deliberately noindex: they exist so a hand-typed URL works,
 * not so search engines crawl an infinite space of near-identical pages.
 */

export interface TimerPreset {
  slug: string;
  minutes: number;
  /** The H1, and the label the countdown uses in the tab title. */
  heading: string;
  /** The <title> tag. */
  title: string;
  description: string;
  /** Opening paragraph below the countdown. */
  intro: string;
  useCases: string[];
  keywords: string[];
  /** Curated presets are indexable; derived ones are not. */
  curated: boolean;
}

export const DEFAULT_TIMER_MINUTES = 25;
export const MIN_TIMER_MINUTES = 1 / 60;
export const MAX_TIMER_MINUTES = 600;

/** Preset buttons every timer page offers alongside its own duration. */
export const FALLBACK_PRESETS = [25, 35, 45];

/* -------------------------------------------------------------------------- */
/*                            Slug -> duration                                 */
/* -------------------------------------------------------------------------- */

const UNIT_TO_MINUTES: Record<string, number> = {
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  m: 1,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  s: 1 / 60,
  sec: 1 / 60,
  secs: 1 / 60,
  second: 1 / 60,
  seconds: 1 / 60,
};

const clampMinutes = (minutes: number) =>
  Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, minutes));

/**
 * Reads a duration out of a slug. Each number is multiplied by the unit that
 * follows it, so "1-hour-30-minute" is 90 and a bare "20" is 20 minutes.
 * Returns null when the slug holds no numbers at all.
 */
export function minutesFromSlug(slug: string): number | null {
  const parts = slug
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter(Boolean);

  let total = 0;
  let found = false;

  parts.forEach((part, index) => {
    const value = Number(part);
    if (!Number.isFinite(value) || value <= 0) return;

    // A number with no unit after it is read as minutes.
    total += value * (UNIT_TO_MINUTES[parts[index + 1] ?? ''] ?? 1);
    found = true;
  });

  return found && total > 0 ? clampMinutes(total) : null;
}

/** "pomodoro" -> "Pomodoro Timer", "17-minute-timer" -> "17 Minute Timer". */
export function headingFromSlug(slug: string): string {
  const words = slug
    .split(/[^a-zA-Z0-9.]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  const heading = words.join(' ') || 'Countdown';
  return /timer|countdown|stopwatch/i.test(heading)
    ? heading
    : `${heading} Timer`;
}

/* -------------------------------------------------------------------------- */
/*                              Generated copy                                 */
/* -------------------------------------------------------------------------- */

interface BucketCopy {
  /** Receives the attributive form, e.g. "45 minute". */
  intro: (duration: string) => string;
  useCases: string[];
}

/**
 * Copy is written per duration band rather than per page, so a 2 minute timer
 * and a 3 hour timer read differently instead of being the same paragraph with
 * one number swapped.
 */
const BUCKETS: { max: number; copy: BucketCopy }[] = [
  {
    max: 5,
    copy: {
      intro: (duration) =>
        `A ${duration} countdown for the things that should not take long. Start it, keep it in the corner of the screen, and let the blinking finish tell you the box is closed.`,
      useCases: [
        'Timeboxing a standup update or a single meeting agenda item',
        'A breathing, stretching or plank interval',
        'Steeping tea, or any short kitchen countdown',
      ],
    },
  },
  {
    max: 15,
    copy: {
      intro: (duration) =>
        `A ${duration} countdown, the length of a proper break. Long enough to step away from the screen, short enough that you actually come back.`,
      useCases: [
        'A break between focus blocks',
        'A short warm-up problem before the real session',
        'Quick reviews, triage, or clearing an inbox',
      ],
    },
  },
  {
    max: 30,
    copy: {
      intro: (duration) =>
        `A ${duration} focus block. Pick one task, start the clock, and treat anything that is not that task as out of scope until it runs out.`,
      useCases: [
        'A single focused work block with no context switching',
        'One easy or medium practice problem, timed',
        'Drafting something end to end without editing as you go',
      ],
    },
  },
  {
    max: 60,
    copy: {
      intro: (duration) =>
        `A ${duration} working session - about as long as most people can hold real concentration before the returns start dropping. Fullscreen it on a second monitor and forget the clock until it blinks.`,
      useCases: [
        'A deep work block on one problem or feature',
        'A timed practice round that mirrors a real interview slot',
        'A study session on a single topic',
      ],
    },
  },
  {
    max: Infinity,
    copy: {
      intro: (duration) =>
        `A ${duration} countdown for long sessions: full mock rounds, exam practice, or a morning of deep work where you want one clock running over the whole thing.`,
      useCases: [
        'A full mock interview, including the walkthrough at the end',
        'Exam or assessment practice under real time pressure',
        'A long deep work block with breaks built into your own plan',
      ],
    },
  },
];

const bucketFor = (minutes: number) =>
  BUCKETS.find((bucket) => minutes <= bucket.max)!.copy;

/**
 * The form that sits in front of a noun: "a 45 minute timer", "a 1 hour block".
 * Always singular, unlike the standalone phrase below.
 */
export function durationAttribute(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} second`;
  if (minutes % 60 === 0) return `${minutes / 60} hour`;
  return `${minutes} minute`;
}

/** The standalone form: "45 minutes", "1 hour", "1 minute". */
export function durationPhrase(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/* -------------------------------------------------------------------------- */
/*                              Named presets                                  */
/* -------------------------------------------------------------------------- */

interface NamedTimerInput {
  slug: string;
  minutes: number;
  heading: string;
  title: string;
  description: string;
  intro: string;
  useCases: string[];
  keywords: string[];
}

const NAMED_TIMERS: NamedTimerInput[] = [
  {
    slug: 'pomodoro-timer',
    minutes: 25,
    heading: 'Pomodoro Timer',
    title: 'Pomodoro Timer - Free 25 Minute Focus Countdown',
    description:
      'A free 25 minute Pomodoro timer that runs fullscreen in your browser. Work one pomodoro, take a five minute break, repeat.',
    intro:
      'The Pomodoro technique is one 25 minute block of single-tasking followed by a five minute break, with a longer break after four blocks. This is the 25 minute half - start it, work on exactly one thing, and stop when it chimes even if you are mid-thought.',
    useCases: [
      'One pomodoro of undistracted work',
      'Breaking a large task into blocks you can actually finish',
      'Building a work rhythm when you are struggling to start',
    ],
    keywords: [
      'pomodoro timer',
      '25 minute pomodoro',
      'online pomodoro timer',
      'free pomodoro timer',
    ],
  },
  {
    slug: 'short-break-timer',
    minutes: 5,
    heading: 'Short Break Timer',
    title: 'Short Break Timer - Free 5 Minute Countdown',
    description:
      'A free 5 minute break timer for the pause between focus blocks. Fullscreen, no account, no ads.',
    intro:
      'The break between pomodoros is five minutes: enough to stand up, refill a glass, and look at something further away than your monitor. The countdown is there so the break does not quietly turn into twenty minutes.',
    useCases: [
      'The five minute break between pomodoros',
      'A screen break to rest your eyes',
      'A hard stop on a quick scroll through messages',
    ],
    keywords: [
      'short break timer',
      '5 minute timer',
      'pomodoro break timer',
      'break countdown',
    ],
  },
  {
    slug: 'long-break-timer',
    minutes: 15,
    heading: 'Long Break Timer',
    title: 'Long Break Timer - Free 15 Minute Countdown',
    description:
      'A free 15 minute long break timer for the pause after four pomodoros. Runs fullscreen in the browser.',
    intro:
      'After four focus blocks the Pomodoro technique calls for a longer break - fifteen minutes or so. Long enough for a walk or a coffee, timed so the afternoon does not disappear into it.',
    useCases: [
      'The long break after four pomodoros',
      'A walk or a coffee between deep work sessions',
      'A lunch break you actually want to end on time',
    ],
    keywords: [
      'long break timer',
      '15 minute timer',
      'pomodoro long break',
      'break timer online',
    ],
  },
  {
    slug: 'deep-work-timer',
    minutes: 90,
    heading: 'Deep Work Timer',
    title: 'Deep Work Timer - Free 90 Minute Focus Countdown',
    description:
      'A free 90 minute deep work timer. One long, uninterrupted block on a single hard problem, fullscreen in your browser.',
    intro:
      'Ninety minutes is the classic deep work block - roughly one ultradian cycle, and about as long as most people can hold hard focus before quality drops. One problem, no tab switching, no messages, until the clock runs out.',
    useCases: [
      'One uninterrupted block on a genuinely hard problem',
      'Writing or designing something that needs a running start',
      'Morning deep work before the day fills up with meetings',
    ],
    keywords: [
      'deep work timer',
      '90 minute timer',
      'focus timer',
      'ultradian rhythm timer',
    ],
  },
  {
    slug: 'focus-timer',
    minutes: 50,
    heading: 'Focus Timer',
    title: 'Focus Timer - Free Fullscreen Concentration Countdown',
    description:
      'A free 50 minute focus timer that fills the screen and blinks in the final seconds. No account, nothing to install.',
    intro:
      'Fifty minutes on, ten minutes off is the other common focus rhythm - closer to how a lecture or a meeting block is scheduled, and a better fit than 25 minutes when a task needs a long ramp-up.',
    useCases: [
      'A 50/10 focus block instead of the shorter Pomodoro cycle',
      'Work that takes ten minutes just to load into your head',
      'Keeping a shared work session on the same clock',
    ],
    keywords: [
      'focus timer',
      '50 minute timer',
      'concentration timer',
      'study focus timer',
    ],
  },
  {
    slug: 'study-timer',
    minutes: 45,
    heading: 'Study Timer',
    title: 'Study Timer - Free 45 Minute Study Countdown',
    description:
      'A free 45 minute study timer for revision blocks. Fullscreen countdown with a blinking warning before time runs out.',
    intro:
      'A 45 minute revision block is long enough to get through a real chunk of material and short enough to repeat three or four times in an evening. Put one topic in front of you and let the clock decide when you move on.',
    useCases: [
      'One revision block on a single topic',
      'Timed practice questions before an exam',
      'Study sessions with a friend on a shared clock',
    ],
    keywords: [
      'study timer',
      '45 minute study timer',
      'revision timer',
      'exam study countdown',
    ],
  },
  {
    slug: 'coding-interview-timer',
    minutes: 45,
    heading: 'Coding Interview Timer',
    title: 'Coding Interview Timer - Free 45 Minute Practice Countdown',
    description:
      'A free 45 minute coding interview timer. Practice under the same clock a real technical round gives you.',
    intro:
      'A technical round is usually 45 minutes including introductions and questions at the end, which leaves about 35 minutes of actual problem solving. Practising against that clock is the difference between knowing a solution and being able to produce it under pressure.',
    useCases: [
      'Solving a problem under real interview time pressure',
      'Practising the explain-as-you-go part, not just the code',
      'Deciding when to move on instead of sinking the whole round',
    ],
    keywords: [
      'coding interview timer',
      'technical interview timer',
      '45 minute interview timer',
      'interview practice countdown',
    ],
  },
  {
    slug: 'mock-interview-timer',
    minutes: 60,
    heading: 'Mock Interview Timer',
    title: 'Mock Interview Timer - Free 1 Hour Countdown',
    description:
      'A free one hour mock interview timer for full practice rounds, including the walkthrough and questions at the end.',
    intro:
      'A full mock round - problem, solution, walkthrough and questions - runs about an hour. Run the clock for the whole thing rather than just the coding part, because the ending is the part most people never rehearse.',
    useCases: [
      'A complete mock round with a peer',
      'System design practice, which needs the full hour',
      'Rehearsing the closing questions, not just the solution',
    ],
    keywords: [
      'mock interview timer',
      '1 hour timer',
      'system design timer',
      'interview practice timer',
    ],
  },
  {
    slug: 'meeting-timer',
    minutes: 30,
    heading: 'Meeting Timer',
    title: 'Meeting Timer - Free 30 Minute Countdown for Meetings',
    description:
      'A free 30 minute meeting timer. Share the screen, start the clock, and end the meeting when it does.',
    intro:
      'A meeting expands to fill the time it is given, so give it a visible clock. Share the fullscreen countdown at the start and everyone in the room can see how much of the agenda is left.',
    useCases: [
      'Keeping a scheduled meeting inside its slot',
      'Timeboxing one agenda item at a time',
      'Workshop and retro sections that tend to overrun',
    ],
    keywords: [
      'meeting timer',
      '30 minute timer',
      'agenda timer',
      'meeting countdown',
    ],
  },
  {
    slug: 'standup-timer',
    minutes: 15,
    heading: 'Standup Timer',
    title: 'Standup Timer - Free 15 Minute Daily Standup Countdown',
    description:
      'A free 15 minute standup timer. Share it on the call so the daily standup stays a standup.',
    intro:
      'The daily standup is meant to be fifteen minutes. Putting the countdown on the shared screen does more to keep it there than asking people to be brief - anything that needs longer becomes a follow-up conversation.',
    useCases: [
      'The daily standup, kept to its fifteen minutes',
      'Timeboxing each person to a fixed slot',
      'Any recurring sync that keeps creeping longer',
    ],
    keywords: [
      'standup timer',
      'daily standup timer',
      '15 minute timer',
      'scrum timer',
    ],
  },
  {
    slug: 'meditation-timer',
    minutes: 10,
    heading: 'Meditation Timer',
    title: 'Meditation Timer - Free 10 Minute Countdown with Chime',
    description:
      'A free 10 minute meditation timer that chimes when the session ends. Fullscreen, silent while it runs.',
    intro:
      'Ten minutes is the usual starting point for a sitting practice. The timer stays silent while it runs and chimes at the end, so you are not checking a clock to find out how long is left.',
    useCases: [
      'A ten minute sitting practice',
      'A breathing exercise with a defined end',
      'A quiet reset between two demanding blocks of work',
    ],
    keywords: [
      'meditation timer',
      '10 minute timer',
      'mindfulness timer',
      'meditation countdown with bell',
    ],
  },
  {
    slug: 'workout-timer',
    minutes: 30,
    heading: 'Workout Timer',
    title: 'Workout Timer - Free 30 Minute Exercise Countdown',
    description:
      'A free 30 minute workout timer, big enough to read from across the room. Fullscreen with a blinking finish.',
    intro:
      'A thirty minute session, on one clock. The digits are large enough to read from a mat on the other side of the room, and the last ten seconds blink so you can see the finish coming without breaking form to check.',
    useCases: [
      'A thirty minute session on a single clock',
      'Circuit work where you need the time visible from a distance',
      'A treadmill or bike block with a fixed end',
    ],
    keywords: [
      'workout timer',
      '30 minute timer',
      'exercise timer',
      'gym countdown timer',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                            Duration presets                                 */
/* -------------------------------------------------------------------------- */

/**
 * Durations that get their own indexable page. Extending this list is how the
 * timer section grows - each entry becomes a static page and a sitemap URL.
 */
const DURATION_MINUTES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75,
  90, 120, 180,
];

/** Hours read better than minutes past the hour mark, and are searched more. */
function durationSlugParts(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return {
      slug: `${hours}-hour-timer`,
      heading: `${hours} Hour Timer`,
    };
  }
  return {
    slug: `${minutes}-minute-timer`,
    heading: `${minutes} Minute Timer`,
  };
}

function durationTimer(minutes: number): TimerPreset {
  const { slug, heading } = durationSlugParts(minutes);
  const duration = durationAttribute(minutes);
  const phrase = durationPhrase(minutes);
  const copy = bucketFor(minutes);

  return {
    slug,
    minutes,
    heading,
    title: `${heading} - Free Online Countdown, Fullscreen`,
    description: `A free ${duration} timer that runs fullscreen in your browser. Start it in one click, watch it blink in the final seconds, and hear a chime when it ends.`,
    intro: copy.intro(duration),
    useCases: copy.useCases,
    keywords: [
      `${duration} timer`,
      `${duration} countdown`,
      `online ${duration} timer`,
      `set a timer for ${phrase}`,
      'free countdown timer',
    ],
    curated: true,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Registry                                    */
/* -------------------------------------------------------------------------- */

export const curatedTimers: TimerPreset[] = [
  ...NAMED_TIMERS.map((timer) => ({ ...timer, curated: true })),
  ...DURATION_MINUTES.map(durationTimer),
];

const TIMER_INDEX = new Map(curatedTimers.map((timer) => [timer.slug, timer]));

/**
 * Slugs that 301 to a curated page, so the two spellings of the same duration
 * never compete with each other in search results.
 */
export const TIMER_ALIASES: Record<string, string> = {
  '60-minute-timer': '1-hour-timer',
  '120-minute-timer': '2-hour-timer',
  '180-minute-timer': '3-hour-timer',
  pomodoro: 'pomodoro-timer',
  'pomodoro-25': 'pomodoro-timer',
  'pomodoro-break-timer': 'short-break-timer',
  'interview-timer': 'coding-interview-timer',
};

/** Resolves any slug to a timer, curated or derived. Never throws. */
export function resolveTimer(slug: string): TimerPreset {
  const normalised = decodeURIComponent(slug).toLowerCase();

  const curated = TIMER_INDEX.get(normalised);
  if (curated) return curated;

  const minutes = minutesFromSlug(normalised) ?? DEFAULT_TIMER_MINUTES;
  const heading = headingFromSlug(normalised);
  const duration = durationAttribute(minutes);
  const copy = bucketFor(minutes);

  return {
    slug: normalised,
    minutes,
    heading,
    title: `${heading} - Free Online Countdown`,
    description: `A free ${duration} countdown timer that runs fullscreen in your browser.`,
    intro: copy.intro(duration),
    useCases: copy.useCases,
    keywords: [],
    // Derived pages work, but they stay out of the index and the sitemap.
    curated: false,
  };
}

/** Preset buttons for a page: its own duration first, then the usual three. */
export function presetsFor(preset: TimerPreset): number[] {
  const own = Number.isInteger(preset.minutes) ? [preset.minutes] : [];
  return [...new Set([...own, ...FALLBACK_PRESETS])].sort((a, b) => a - b);
}

/** The curated timers closest in length to this one, for cross-linking. */
export function relatedTimers(preset: TimerPreset, count = 6): TimerPreset[] {
  return curatedTimers
    .filter((timer) => timer.slug !== preset.slug)
    .sort(
      (a, b) =>
        Math.abs(a.minutes - preset.minutes) -
        Math.abs(b.minutes - preset.minutes)
    )
    .slice(0, count);
}

/**
 * FAQ for a timer page. The first entry is duration-specific so the block is
 * not identical across pages; the rest describe how the tool behaves.
 */
export function timerFaq(preset: TimerPreset) {
  const duration = durationAttribute(preset.minutes);
  const phrase = durationPhrase(preset.minutes);

  return [
    {
      question: `How do I set a ${duration} timer?`,
      answer: `Open this page and press Start, or hit the space bar - the countdown is already loaded with ${phrase}. Press F for fullscreen if you want to read it from across the room, and use the custom field to switch to any other duration.`,
    },
    {
      question: 'Does the timer keep running if I switch tabs?',
      answer:
        'Yes. The countdown is calculated from a fixed end time rather than counted tick by tick, so background throttling cannot make it drift. The remaining time also appears in the browser tab title while you work in another tab.',
    },
    {
      question: 'Does it make a sound when the time is up?',
      answer:
        'Yes, it chimes three times and the clock turns red. The last ten seconds blink as a warning, and the chime can be muted with the speaker button.',
    },
    {
      question: 'Is this timer free?',
      answer:
        'Yes, it is completely free, needs no account, and runs entirely in your browser - nothing is sent to a server.',
    },
  ];
}

/** A handful of well-known timers, for the links on /timer. */
export const popularTimers: TimerPreset[] = [
  'pomodoro-timer',
  '5-minute-timer',
  '10-minute-timer',
  '15-minute-timer',
  '20-minute-timer',
  '30-minute-timer',
  '45-minute-timer',
  '1-hour-timer',
  'coding-interview-timer',
  'deep-work-timer',
  'study-timer',
  'meditation-timer',
]
  .map((slug) => TIMER_INDEX.get(slug))
  .filter((timer): timer is TimerPreset => Boolean(timer));
