import JsonLd from '@/components/seo/json-ld';
import {
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  siteConfig,
} from '@/lib/seo';
import PdfWorkspaceLoader from './pdf-workspace-loader';
import {
  FaqList,
  HowItWorks,
  LimitsNote,
  PdfFooter,
  PrivacyNote,
  SectionHeading,
} from './pdf-sections';

const TITLE = 'Free PDF Editor - Edit and Sign PDFs in Your Browser';
const DESCRIPTION =
  'Edit, annotate, merge, split and sign PDFs entirely in your browser. Nothing is uploaded, there is no account, and it keeps working offline.';

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/pdf',
  keywords: [
    'free pdf editor',
    'edit pdf online',
    'sign pdf online free',
    'pdf editor no upload',
    'offline pdf editor',
    'merge pdf',
    'split pdf',
    'fill pdf form',
    'add signature to pdf',
    'private pdf editor',
  ],
});

const FAQ = [
  {
    question: 'Is my file uploaded anywhere?',
    answer:
      'No. The PDF is opened and edited by this browser tab using JavaScript running on your own device. There is no upload endpoint and no server-side processing, so the file never leaves your machine. You can confirm it by disconnecting from the network after the page loads — everything still works.',
  },
  {
    question: 'Is it really free, and do I need an account?',
    answer:
      'Yes and no, respectively. There is no sign-up, no watermark on the output, no page limit and no file size cap beyond what your browser can hold in memory.',
  },
  {
    question: 'Can I sign a PDF with a real digital certificate?',
    answer:
      'Yes. Alongside drawn, typed and uploaded signatures, you can apply a cryptographic signature using your own PKCS#12 (.p12 or .pfx) certificate. The certificate and its passphrase are used in the browser and are never transmitted or stored.',
  },
  {
    question: 'Can I edit the text that is already in the PDF?',
    answer:
      'You can cover a run of text and retype it, which is what browser-based editors do in practice. Truly rewriting existing text requires re-encoding through the original font, which is usually a subset containing only the characters already present, so newly typed characters would be missing. Covering and retyping avoids that and produces a correct file.',
  },
  {
    question: 'Does it work on a phone or tablet?',
    answer:
      'Yes. Drawing a signature with a finger or stylus is a good deal easier on a touchscreen than with a mouse. Very large files are riskier on mobile, since the browser may reclaim memory from a tab holding a few hundred megabytes.',
  },
  {
    question: 'What happens to a password-protected PDF?',
    answer:
      'You will be asked for the password, which is used locally to decrypt the file. You can also add, change or remove a password, and set permissions, on the way out.',
  },
];

const appSchema = {
  '@type': 'WebApplication',
  name: 'PDF Editor',
  description: DESCRIPTION,
  url: absoluteUrl('/pdf'),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  isPartOf: { '@id': `${siteConfig.url}/#website` },
  author: { '@id': `${siteConfig.url}/#person` },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Edit PDFs without uploading them',
    'Merge, split, reorder and rotate pages',
    'Annotate with text, shapes, highlights and freehand ink',
    'Draw, type or upload a signature',
    'Cryptographic signing with a PKCS#12 certificate',
    'Fill and flatten PDF forms',
    'Add or remove passwords and permissions',
    'OCR scanned documents',
    'Compress and convert',
  ],
};

export default function PdfPage() {
  return (
    <>
      <JsonLd
        schema={[
          appSchema,
          faqSchema(FAQ),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'PDF Editor', path: '/pdf' },
          ]),
        ]}
      />

      {/* The editor is client-only; everything below it is server-rendered and
          is what search engines and LLM crawlers actually see. */}
      <PdfWorkspaceLoader mode="edit" />

      <section className="text-body mx-auto max-w-2xl px-6 pb-24">
        <h1 className="text-title font-serif text-3xl">
          A PDF editor that never uploads your file
        </h1>
        <p className="mt-4 leading-relaxed">
          Open a PDF above and edit it directly. Merge and split documents,
          reorder and rotate pages, annotate, fill in forms, sign, redact,
          compress, OCR a scan, and set or remove a password — all without the
          document leaving your device.
        </p>

        <HowItWorks />
        <PrivacyNote />
        <LimitsNote />
        <FaqList entries={FAQ} />

        <SectionHeading>Keyboard shortcuts</SectionHeading>
        <ul className="mt-4 space-y-2 leading-relaxed">
          <li>
            <span className="font-mono text-sm">Ctrl/Cmd + Z</span> - undo, and{' '}
            <span className="font-mono text-sm">Shift + Ctrl/Cmd + Z</span> to
            redo
          </li>
          <li>
            <span className="font-mono text-sm">Ctrl/Cmd + scroll</span> - zoom
          </li>
          <li>
            <span className="font-mono text-sm">Ctrl/Cmd + V</span> - paste a
            PDF or image straight in
          </li>
        </ul>

        <PdfFooter />
      </section>
    </>
  );
}
