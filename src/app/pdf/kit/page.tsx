import Link from 'next/link';
import { Check } from 'lucide-react';
import JsonLd from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import {
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  siteConfig,
} from '@/lib/seo';
import {
  KIT_TIERS,
  kitCheckoutConfigured,
  kitCheckoutUrl,
} from '@/config/pdf-kit';

const TITLE = 'messy-ui PDF Kit - A Client-Side PDF Editor You Can Ship';
const DESCRIPTION =
  'The full source for a browser-only PDF editor: rendering, annotation, forms, redaction, OCR and PKCS#12 signing. One-time licence, no runtime, no server.';

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/pdf/kit',
  keywords: [
    'react pdf editor component',
    'client side pdf editor source',
    'pdf.js react editor',
    'pdf signing library browser',
    'pdf editor licence',
  ],
});

const FAQ = [
  {
    question: 'Is the hosted editor still free?',
    answer:
      'Yes, permanently. messyui.dev/pdf has no account, no watermark and no limits, and nothing you open there is uploaded. The licence sold here is for shipping the code inside your own product — it changes nothing about the free tool.',
  },
  {
    question: 'The code is on GitHub. What am I paying for?',
    answer:
      'Permission, primarily: the toolkit is source-available, not MIT, so using it commercially needs a licence. Beyond that you get the test suite, the integration notes, and the answers to the problems that cost the most time — the pdf.js build that renders blank pages on older Chrome, the byte-range splice for detached signatures, the text encoding bug that silently corrupts certificates, and the minifier trap that breaks form-field detection.',
  },
  {
    question: 'What are the dependencies?',
    answer:
      'pdf.js for rendering, @cantoo/pdf-lib for writing, node-forge and @signpdf for signing, tesseract.js for OCR, and fontkit for font embedding. Everything heavy is dynamically imported, so nothing loads until the feature is used. There is no backend and no API key.',
  },
  {
    question: 'What framework does it assume?',
    answer:
      'It is written for React 19 and the Next.js App Router with Tailwind. The logic in the lib layer is framework-agnostic — coordinates, export, signing and OCR are plain TypeScript — so porting the UI is the bulk of the work if you use something else.',
  },
  {
    question: 'What does it not do?',
    answer:
      'It cannot validate a signature trust chain against AATL or the EU trusted lists, produce linearised output, or rewrite existing text in place. These are documented rather than faked, and the same limits apply to the free tool.',
  },
  {
    question: 'Refunds?',
    answer:
      'Ask and you get one. You can evaluate the entire thing at messyui.dev/pdf and read every line on GitHub before buying, so there should be few surprises.',
  },
];

const INCLUDED = [
  {
    title: 'The whole editor',
    body: 'Viewer with virtualised rendering, annotation overlay, page operations, forms, security, stamps and the export pipeline.',
  },
  {
    title: 'Real redaction',
    body: 'Pages carrying a redaction are rasterised on export, so the text underneath is destroyed rather than covered. Verified by grepping the output bytes.',
  },
  {
    title: 'Cryptographic signing',
    body: 'PKCS#12 signing with ByteRange splicing and incremental updates, plus offline verification of integrity and coverage.',
  },
  {
    title: 'Self-hosted OCR',
    body: 'Tesseract with an invisible text layer, so a scan becomes searchable. No CDN calls, so the privacy claim stays true.',
  },
  {
    title: 'The test suite',
    body: '44 Playwright assertions against a production build, including a Node-side PKCS#7 verification that does not trust the browser path.',
  },
  {
    title: 'Integration notes',
    body: 'The Turbopack worker wiring, the asset copy step, and the traps that cost hours: the legacy pdf.js build, detached ArrayBuffers, latin1 decoding, minified constructor names.',
  },
];

const productSchema = {
  '@type': 'Product',
  name: 'messy-ui PDF Kit',
  description: DESCRIPTION,
  url: absoluteUrl('/pdf/kit'),
  brand: { '@type': 'Brand', name: siteConfig.name },
  offers: KIT_TIERS.map((tier) => ({
    '@type': 'Offer',
    name: tier.name,
    price: String(tier.price),
    priceCurrency: tier.currency,
    url: absoluteUrl('/pdf/kit'),
    availability: 'https://schema.org/InStock',
  })),
};

export default function PdfKitPage() {
  const configured = kitCheckoutConfigured();

  return (
    <>
      <JsonLd
        schema={[
          productSchema,
          faqSchema(FAQ),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'PDF Editor', path: '/pdf' },
            { name: 'PDF Kit', path: '/pdf/kit' },
          ]),
        ]}
      />

      <div className="text-body mx-auto max-w-4xl px-6 py-16">
        <header className="max-w-2xl">
          <p className="text-muted-foreground text-sm">messy-ui PDF Kit</p>
          <h1 className="text-title mt-2 font-serif text-4xl">
            A PDF editor you can ship, that never uploads a file
          </h1>
          <p className="mt-4 text-lg leading-relaxed">
            The complete source behind{' '}
            <Link href="/pdf" className="underline underline-offset-4">
              messyui.dev/pdf
            </Link>
            . Rendering, annotation, page operations, forms, genuine redaction,
            OCR and cryptographic signing — all in the browser, with no backend
            to run and nothing to pay per document.
          </p>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            The hosted editor stays free forever, for everyone, with no account
            and no watermark. This licence is for putting the code in your own
            product.
          </p>
        </header>

        <section className="mt-14">
          <h2 className="text-title font-serif text-2xl">What you get</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {INCLUDED.map(({ title, body }) => (
              <li key={title}>
                <h3 className="text-title flex items-center gap-2 text-sm font-medium">
                  <Check
                    className="size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-title font-serif text-2xl">Licences</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            One-time payment, not a subscription. There is no server to run, so
            charging you monthly for one would be a promise with nothing behind
            it.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {KIT_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={
                  tier.highlighted
                    ? 'border-primary bg-card rounded-xl border-2 p-6'
                    : 'bg-card rounded-xl border p-6'
                }
              >
                <h3 className="text-title text-lg font-medium">{tier.name}</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {tier.tagline}
                </p>
                <p className="text-title mt-4 font-serif text-3xl">
                  ${tier.price}
                </p>
                <p className="text-muted-foreground text-xs">{tier.seats}</p>

                <ul className="mt-5 space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-muted-foreground flex gap-2 text-sm leading-snug"
                    >
                      <Check
                        className="mt-0.5 size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={tier.highlighted ? 'default' : 'outline'}
                >
                  <a
                    href={kitCheckoutUrl(tier.id)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {configured ? `Buy ${tier.name}` : 'Get in touch'}
                  </a>
                </Button>
              </div>
            ))}
          </div>

          {!configured && (
            <p className="text-muted-foreground mt-4 text-xs">
              Checkout is not live yet — the buttons open the repository
              discussions so you can reach me directly in the meantime.
            </p>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-title font-serif text-2xl">Questions</h2>
          <dl className="mt-6 space-y-6">
            {FAQ.map(({ question, answer }) => (
              <div key={question}>
                <dt className="text-title text-sm font-medium">{question}</dt>
                <dd className="text-muted-foreground mt-1 leading-relaxed">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-muted-foreground mt-16 text-sm">
          Not sure?{' '}
          <Link href="/pdf" className="underline underline-offset-4">
            Use the free editor
          </Link>{' '}
          — it is the same code.
        </p>
      </div>
    </>
  );
}
