import Link from 'next/link';

import { siteConfig } from '@/lib/seo';

/**
 * Server-rendered copy shared by /pdf and /pdf/[tool].
 *
 * The editor itself is client-only, so this is the entire indexable content of
 * the route. It has to be rendered on the server — it sits deliberately outside
 * the dynamic boundary in page.tsx for exactly that reason.
 */

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-title mt-12 font-serif text-2xl first:mt-0">
      {children}
    </h2>
  );
}

export function HowItWorks() {
  return (
    <>
      <SectionHeading>How it works</SectionHeading>
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
        <li>
          Drop a PDF onto the page, paste one from the clipboard, or click to
          browse. Encrypted files will ask for their password.
        </li>
        <li>
          Reorder, rotate or delete pages from the thumbnail rail, and merge in
          more files by dropping them on top.
        </li>
        <li>
          Annotate, fill in forms, or place a signature you draw, type or
          upload.
        </li>
        <li>Download the result. It never left your device to begin with.</li>
      </ol>
    </>
  );
}

export function PrivacyNote() {
  return (
    <>
      <SectionHeading>Why nothing is uploaded</SectionHeading>
      <p className="mt-4 leading-relaxed">
        Most online PDF tools work by sending your file to a server, editing it
        there, and sending it back. That means contracts, medical records, bank
        statements and passports all end up on someone else&apos;s machine, and
        you are trusting a privacy policy about what happens next.
      </p>
      <p className="mt-4 leading-relaxed">
        This editor does the work in your browser instead. The PDF is read by
        this tab, rendered with{' '}
        <Link
          href="https://mozilla.github.io/pdf.js/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          pdf.js
        </Link>{' '}
        and written back out with pdf-lib, both running as ordinary JavaScript
        on your own device. There is no upload endpoint, because there is no
        server doing any of this. Once the page has loaded you can disconnect
        from the network entirely and everything still works.
      </p>
    </>
  );
}

export function LimitsNote() {
  return (
    <>
      <SectionHeading>What it can and cannot do</SectionHeading>
      <p className="mt-4 leading-relaxed">
        A few honest limits, because tools in this category tend to overclaim:
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
        <li>
          <span className="text-title font-medium">Editing existing text</span>{' '}
          works by covering the original and retyping it. Genuinely rewriting
          text inside a PDF means re-encoding through the original font, which
          is usually a subset containing only the characters already used — so a
          newly typed letter would come out blank. Covering and retyping is what
          every browser-based editor actually does; this one says so.
        </li>
        <li>
          <span className="text-title font-medium">Redaction removes text</span>{' '}
          rather than covering it. Pages carrying a redaction are rasterised on
          export, so the underlying words are genuinely gone rather than hidden
          under a black box that copy-and-paste would defeat.
        </li>
        <li>
          <span className="text-title font-medium">Compression</span> depends
          entirely on what is inside. Scans shrink dramatically; a text document
          exported from Word is already compressed and will barely move.
        </li>
      </ul>
    </>
  );
}

export function PdfFooter() {
  return (
    <p className="text-muted-foreground mt-12 text-sm leading-relaxed">
      Part of{' '}
      <Link href="/" className="text-primary underline underline-offset-4">
        {siteConfig.name}
      </Link>
      . Free, open source and account-free — see also the{' '}
      <Link href="/timer" className="text-primary underline underline-offset-4">
        countdown timer
      </Link>
      .
    </p>
  );
}

export function FaqList({
  entries,
}: {
  entries: { question: string; answer: string }[];
}) {
  return (
    <>
      <SectionHeading>Questions</SectionHeading>
      <dl className="mt-4 space-y-6">
        {entries.map((entry) => (
          <div key={entry.question}>
            <dt className="text-title font-medium">{entry.question}</dt>
            <dd className="mt-1 leading-relaxed">{entry.answer}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
