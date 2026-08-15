import Link from 'next/link';

import { siteConfig } from '@/lib/seo';
import type { TimerPreset } from '@/config/timers';

/**
 * Server-rendered copy shared by /timer and /timer/[slug].
 *
 * It all sits below the countdown. The fullscreen target is the countdown
 * itself, so none of this appears in fullscreen.
 */

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-serif text-2xl text-title first:mt-0">
      {children}
    </h2>
  );
}

export function HowToUse() {
  return (
    <>
      <SectionHeading>How to use it</SectionHeading>
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
        <li>Press Start, or hit the space bar.</li>
        <li>
          Press <span className="font-mono text-sm">F</span> for fullscreen so
          the countdown stays readable at a glance.
        </li>
        <li>
          Work until it blinks. The last ten seconds flash red, then it chimes.
        </li>
        <li>
          Need a different length? Use the presets, or type any number of
          minutes into the custom field.
        </li>
      </ol>
    </>
  );
}

export function KeyboardShortcuts() {
  return (
    <>
      <SectionHeading>Keyboard shortcuts</SectionHeading>
      <ul className="mt-4 space-y-2 leading-relaxed">
        <li>
          <span className="font-mono text-sm">Space</span> - start or pause
        </li>
        <li>
          <span className="font-mono text-sm">R</span> - reset to the selected
          duration
        </li>
        <li>
          <span className="font-mono text-sm">F</span> - toggle fullscreen
        </li>
      </ul>
    </>
  );
}

export function FaqList({
  entries,
}: {
  entries: { question: string; answer: string }[];
}) {
  return (
    <>
      <SectionHeading>Frequently asked questions</SectionHeading>
      <div className="mt-4 space-y-6">
        {entries.map((entry) => (
          <div key={entry.question}>
            <h3 className="font-medium text-title">{entry.question}</h3>
            <p className="mt-2 leading-relaxed">{entry.answer}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/** Cross-links between timer pages - the only way crawlers reach them. */
export function TimerLinks({
  title,
  timers,
}: {
  title: string;
  timers: TimerPreset[];
}) {
  return (
    <>
      <SectionHeading>{title}</SectionHeading>
      <ul className="mt-4 flex flex-wrap gap-2">
        {timers.map((timer) => (
          <li key={timer.slug}>
            <Link
              href={`/timer/${timer.slug}`}
              className="inline-block rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {timer.heading}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function TimerFooter() {
  return (
    <footer className="mt-16 border-t border-border pt-6 text-sm">
      <Link
        href="/timer"
        className="text-primary underline-offset-4 hover:underline"
      >
        All timers
      </Link>
      {' · '}
      Built by{' '}
      <Link
        href="/"
        className="text-primary underline-offset-4 hover:underline"
      >
        {siteConfig.name}
      </Link>
      , a library of{' '}
      <Link
        href="/components"
        className="text-primary underline-offset-4 hover:underline"
      >
        animated React components
      </Link>
      .
    </footer>
  );
}
