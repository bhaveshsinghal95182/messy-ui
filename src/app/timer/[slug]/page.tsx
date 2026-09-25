import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import JsonLd from '@/components/seo/json-ld';
import {
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  siteConfig,
} from '@/lib/seo';
import {
  curatedTimers,
  presetsFor,
  relatedTimers,
  resolveTimer,
  safeDecodeSlug,
  timerFaq,
  TIMER_ALIASES,
} from '@/config/timers';
import CountdownTimer from '../countdown-timer';
import {
  FaqList,
  HowToUse,
  KeyboardShortcuts,
  SectionHeading,
  TimerFooter,
  TimerLinks,
} from '../timer-sections';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Only curated timers are pre-rendered; anything else resolves on demand. */
export async function generateStaticParams() {
  return curatedTimers.map((timer) => ({ slug: timer.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const preset = resolveTimer(slug);

  const metadata = pageMetadata({
    title: preset.title,
    description: preset.description,
    path: `/timer/${preset.slug}`,
    keywords: preset.keywords,
  });

  return {
    ...metadata,
    // A slug we did not curate still renders a working timer, but it stays out
    // of the index so the site never ships an unbounded set of near-duplicates.
    robots: preset.curated ? undefined : { index: false, follow: true },
  };
}

export default async function TimerSlugPage({ params }: PageProps) {
  const { slug } = await params;

  // Permanent, so the alias never competes with the page it points at.
  const alias = TIMER_ALIASES[safeDecodeSlug(slug).toLowerCase()];
  if (alias) permanentRedirect(`/timer/${alias}`);

  const preset = resolveTimer(slug);
  const faq = timerFaq(preset);

  return (
    <>
      {preset.curated && (
        <JsonLd
          schema={[
            {
              '@type': 'WebApplication',
              name: preset.heading,
              description: preset.description,
              url: absoluteUrl(`/timer/${preset.slug}`),
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              isPartOf: { '@id': `${siteConfig.url}/#website` },
              author: { '@id': `${siteConfig.url}/#person` },
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
            faqSchema(faq),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Timers', path: '/timer' },
              { name: preset.heading, path: `/timer/${preset.slug}` },
            ]),
          ]}
        />
      )}

      <CountdownTimer
        heading={preset.heading}
        minutes={preset.minutes}
        presets={presetsFor(preset)}
      />

      <section className="mx-auto max-w-2xl px-6 pb-24 text-body">
        <SectionHeading>{preset.heading}</SectionHeading>
        <p className="mt-4 leading-relaxed">{preset.intro}</p>

        <SectionHeading>What it is good for</SectionHeading>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          {preset.useCases.map((useCase) => (
            <li key={useCase}>{useCase}</li>
          ))}
        </ul>

        <HowToUse />
        <KeyboardShortcuts />
        <FaqList entries={faq} />
        <TimerLinks title="Other timers" timers={relatedTimers(preset)} />
        <TimerFooter />
      </section>
    </>
  );
}
