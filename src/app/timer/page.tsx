import JsonLd from '@/components/seo/json-ld';
import {
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  siteConfig,
} from '@/lib/seo';
import { curatedTimers, popularTimers } from '@/config/timers';
import CountdownTimer from './countdown-timer';
import {
  FaqList,
  HowToUse,
  KeyboardShortcuts,
  SectionHeading,
  TimerFooter,
  TimerLinks,
} from './timer-sections';

const TITLE = 'LeetCode Timer - Free Fullscreen Countdown for Coding Practice';
const DESCRIPTION =
  'A free fullscreen countdown timer for timed LeetCode practice. Pick 25, 35 or 45 minutes, set any custom duration, and get a blinking warning in the final seconds.';

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/timer',
  keywords: [
    'leetcode timer',
    'coding interview timer',
    'online countdown timer',
    'fullscreen timer',
    '25 minute timer',
    '45 minute timer',
    'pomodoro timer for coding',
    'dsa practice timer',
    'free countdown timer',
  ],
});

const FAQ = [
  {
    question: 'How long should I spend on a LeetCode problem?',
    answer:
      'A common rule of thumb is 25 minutes for an easy problem, 35 for a medium and 45 for a hard one. If the timer runs out, read the solution, understand it, and re-attempt the problem a few days later rather than grinding past the limit.',
  },
  {
    question: 'Does the timer keep running if I switch tabs?',
    answer:
      'Yes. The countdown is calculated from a fixed end time rather than counted tick by tick, so background throttling cannot make it drift. The remaining time also appears in the browser tab title while you work in another tab.',
  },
  {
    question: 'Can I set a custom duration?',
    answer:
      'Yes. Type any number of minutes between 1 and 600 into the custom field and press Enter to load it. Every common duration also has its own page, such as /timer/45-minute-timer.',
  },
  {
    question: 'Is this timer free?',
    answer:
      'Yes, it is completely free, needs no account, and runs entirely in your browser - nothing is sent to a server.',
  },
];

const appSchema = {
  '@type': 'WebApplication',
  name: 'LeetCode Timer',
  description: DESCRIPTION,
  url: absoluteUrl('/timer'),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  isPartOf: { '@id': `${siteConfig.url}/#website` },
  author: { '@id': `${siteConfig.url}/#person` },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    '25, 35 and 45 minute presets',
    'Custom countdown duration',
    'Fullscreen mode',
    'Blinking final-seconds warning',
    'Keyboard shortcuts',
  ],
};

export default function TimerPage() {
  return (
    <>
      <JsonLd
        schema={[
          appSchema,
          faqSchema(FAQ),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'LeetCode Timer', path: '/timer' },
          ]),
        ]}
      />

      <CountdownTimer heading="LeetCode Timer" minutes={25} />

      {/* Static copy below the fold. The fullscreen target is the timer itself,
          so none of this shows up in fullscreen. */}
      <section className="mx-auto max-w-2xl px-6 pb-24 text-body">
        <SectionHeading>A countdown built for timed practice</SectionHeading>
        <p className="mt-4 leading-relaxed">
          Interviews are timed, so practice should be too. Pick a duration, put
          the clock in fullscreen on a second monitor, and solve the problem
          before it runs out. The last ten seconds blink so you notice them
          without watching the clock.
        </p>

        <SectionHeading>Which duration to pick</SectionHeading>
        <dl className="mt-4 space-y-3 leading-relaxed">
          <div>
            <dt className="inline font-medium text-title">25 minutes - </dt>
            <dd className="inline">
              easy problems, and a standard Pomodoro block for warming up.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-title">35 minutes - </dt>
            <dd className="inline">
              mediums, which is roughly the time you get per question in a real
              interview round.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-title">45 minutes - </dt>
            <dd className="inline">
              hards, or a full mock round including explaining your approach.
            </dd>
          </div>
        </dl>

        <HowToUse />
        <KeyboardShortcuts />
        <FaqList entries={FAQ} />
        <TimerLinks title="Popular timers" timers={popularTimers} />
        <TimerLinks title="Every timer" timers={curatedTimers} />
        <TimerFooter />
      </section>
    </>
  );
}
