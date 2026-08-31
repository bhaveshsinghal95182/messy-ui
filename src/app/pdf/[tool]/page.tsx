import type { Metadata } from 'next';
import Link from 'next/link';

import JsonLd from '@/components/seo/json-ld';
import {
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  siteConfig,
} from '@/lib/seo';
import { curatedPdfTools, resolvePdfTool, type PdfTool } from '@/config/pdf';
import PdfWorkspaceLoader from '../pdf-workspace-loader';
import {
  FaqList,
  PdfFooter,
  PrivacyNote,
  SectionHeading,
} from '../pdf-sections';
import AdSlot from '@/components/pdf/ad-slot';

interface PageProps {
  params: Promise<{ tool: string }>;
}

/** Only curated tools are prerendered; anything else renders on demand. */
export async function generateStaticParams() {
  return curatedPdfTools.map((tool) => ({ tool: tool.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = resolvePdfTool(slug);

  if (!tool) {
    // An unrecognised slug still opens a working editor, but must not be
    // indexed — otherwise every typo becomes a crawlable near-duplicate.
    return {
      title: 'PDF Editor',
      description: 'Edit and sign PDFs in your browser. Nothing is uploaded.',
      robots: { index: false, follow: true },
      alternates: { canonical: '/pdf' },
    };
  }

  return pageMetadata({
    title: tool.title,
    description: tool.description,
    path: `/pdf/${tool.slug}`,
    keywords: tool.keywords,
  });
}

const toolSchema = (tool: PdfTool) => ({
  '@type': 'WebApplication',
  name: tool.heading,
  description: tool.description,
  url: absoluteUrl(`/pdf/${tool.slug}`),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  isPartOf: { '@id': `${siteConfig.url}/#website` },
  author: { '@id': `${siteConfig.url}/#person` },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
});

export default async function PdfToolPage({ params }: PageProps) {
  const { tool: slug } = await params;
  const tool = resolvePdfTool(slug);

  // Unknown slug: give them the editor rather than a 404, but say nothing more.
  if (!tool) {
    return <PdfWorkspaceLoader mode="edit" />;
  }

  const related = tool.related
    .map(resolvePdfTool)
    .filter((entry): entry is PdfTool => Boolean(entry));

  return (
    <>
      <JsonLd
        schema={[
          toolSchema(tool),
          faqSchema(tool.faq),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'PDF Editor', path: '/pdf' },
            { name: tool.heading, path: `/pdf/${tool.slug}` },
          ]),
        ]}
      />

      <PdfWorkspaceLoader mode={tool.mode} />

      <section className="text-body mx-auto max-w-2xl px-6 pb-24">
        <h1 className="text-title font-serif text-3xl">{tool.heading}</h1>
        <p className="mt-4 leading-relaxed">{tool.intro}</p>

        <SectionHeading>How to do it</SectionHeading>
        <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
          {tool.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <PrivacyNote />
        <FaqList entries={tool.faq} />

        {related.length > 0 && (
          <>
            <SectionHeading>Related tools</SectionHeading>
            <ul className="mt-4 space-y-2 leading-relaxed">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/pdf/${entry.slug}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {entry.heading}
                  </Link>{' '}
                  — {entry.description}
                </li>
              ))}
              <li>
                <Link
                  href="/pdf"
                  className="text-primary underline underline-offset-4"
                >
                  The full editor
                </Link>{' '}
                — annotate, sign, fill forms, redact, OCR and more.
              </li>
            </ul>
          </>
        )}

        <AdSlot id={tool.slug} />

        <PdfFooter />
      </section>
    </>
  );
}
