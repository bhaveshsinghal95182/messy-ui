/**
 * The tools behind /pdf/[tool].
 *
 * Every sub-route is one entry here and no per-route code: the page component
 * looks the slug up, renders the same workspace in the matching mode, and
 * builds its metadata, breadcrumbs and copy from these fields. Adding a tool
 * means adding an object.
 *
 * Only curated tools are indexable and listed in the sitemap. An unknown slug
 * still opens a working editor — a hand-typed or mis-remembered URL should not
 * be a dead end — but is noindex, so search engines don't crawl an unbounded
 * space of near-identical pages.
 */

export interface PdfTool {
  slug: string;
  /** Passed to the workspace, which uses it to open the relevant flow. */
  mode: string;
  /** The H1. */
  heading: string;
  /** The <title> tag. */
  title: string;
  description: string;
  /** Opening paragraph below the editor. */
  intro: string;
  steps: string[];
  keywords: string[];
  faq: { question: string; answer: string }[];
  /** Slugs of related tools, cross-linked at the foot of the page. */
  related: string[];
  curated: boolean;
}

/** Shared across every tool page — the reason this site's version is different. */
const PRIVACY_FAQ = {
  question: 'Is my file uploaded?',
  answer:
    'No. Everything happens in this browser tab, on your own device. There is no upload endpoint and no server-side processing, so the file never leaves your machine — you can disconnect from the network after the page loads and it still works.',
};

export const pdfTools: PdfTool[] = [
  {
    slug: 'merge',
    mode: 'merge',
    heading: 'Merge PDFs',
    title: 'Merge PDF Files Free - Combine PDFs in Your Browser',
    description:
      'Combine several PDFs into one, in your browser. Nothing is uploaded, there is no account, and there is no page limit.',
    intro:
      'Drop in as many PDFs as you like and they are appended in the order you add them. Drag the thumbnails to rearrange pages across the whole combined document before you save.',
    steps: [
      'Open the first PDF, then drop the others on top of it.',
      'Drag thumbnails in the sidebar to reorder pages across all the files.',
      'Delete or rotate anything you do not want to keep.',
      'Download the combined document.',
    ],
    keywords: [
      'merge pdf',
      'combine pdf',
      'join pdf files',
      'merge pdf free',
      'merge pdf without uploading',
      'combine pdf offline',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'How many files can I combine?',
        answer:
          'There is no fixed limit. The practical ceiling is your device memory, since every open document is held in the tab.',
      },
      {
        question: 'Can I reorder pages while merging?',
        answer:
          'Yes. Once files are open, all their pages appear in one thumbnail rail and can be dragged into any order, regardless of which file they came from.',
      },
    ],
    related: ['split', 'rotate', 'delete-pages'],
    curated: true,
  },
  {
    slug: 'split',
    mode: 'split',
    heading: 'Split a PDF',
    title: 'Split PDF Free - Separate Pages in Your Browser',
    description:
      'Split a PDF into several files, or pull out a range of pages, entirely in your browser. No upload and no account.',
    intro:
      'Split a document into fixed-size chunks, or extract exactly the pages you want with a range like 1-3, 7, 9-. You see precisely what will be saved before anything is written.',
    steps: [
      'Open the PDF you want to split.',
      'Choose whether to extract a range of pages or split every N pages.',
      'Check the preview of what will be produced.',
      'Save — one file, or several.',
    ],
    keywords: [
      'split pdf',
      'extract pdf pages',
      'separate pdf pages',
      'split pdf free',
      'split pdf without uploading',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'What range formats are supported?',
        answer:
          'Single pages (7), ranges (1-3), open-ended ranges (9- for page nine to the end, -4 for the start through page four) and any combination of those separated by commas.',
      },
      {
        question: 'Can I pull out a single page?',
        answer:
          'Yes — either type its number in the extract field, or right-click its thumbnail and choose "Save this page as PDF".',
      },
    ],
    related: ['merge', 'extract-pages', 'delete-pages'],
    curated: true,
  },
  {
    slug: 'extract-pages',
    mode: 'extract-pages',
    heading: 'Extract pages from a PDF',
    title: 'Extract PDF Pages Free - Pull Out Pages in Your Browser',
    description:
      'Pull selected pages out of a PDF into a new document, in your browser. Nothing is uploaded.',
    intro:
      'Keep only the pages you need. Give a range like 2-5, or right-click any thumbnail to save that single page on its own.',
    steps: [
      'Open the PDF.',
      'Enter the pages to keep, such as 2-5 or 1, 4, 8.',
      'Save the extracted document.',
    ],
    keywords: [
      'extract pdf pages',
      'pull pages from pdf',
      'save pdf page separately',
      'extract pages free',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Does extracting change the original file?',
        answer:
          'No. The file on your disk is never modified — extraction produces a new document that you save separately.',
      },
    ],
    related: ['split', 'delete-pages', 'merge'],
    curated: true,
  },
  {
    slug: 'rotate',
    mode: 'rotate',
    heading: 'Rotate PDF pages',
    title: 'Rotate PDF Free - Fix Page Orientation in Your Browser',
    description:
      'Rotate one page or the whole document and save the result permanently. Runs in your browser with no upload.',
    intro:
      'Scanned pages that came out sideways can be turned a quarter at a time. Unlike rotating in a viewer, the rotation is written into the saved file.',
    steps: [
      'Open the PDF.',
      'Select a page in the thumbnail rail.',
      'Rotate it with the toolbar buttons, or the [ and ] keys.',
      'Download — the new orientation is saved into the file.',
    ],
    keywords: [
      'rotate pdf',
      'rotate pdf pages',
      'fix pdf orientation',
      'rotate pdf and save',
      'turn pdf page',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Is the rotation saved permanently?',
        answer:
          'Yes. It is written to the page as its rotation, so every viewer will show it the right way up — unlike rotating inside a PDF reader, which usually only affects that session.',
      },
    ],
    related: ['merge', 'split', 'delete-pages'],
    curated: true,
  },
  {
    slug: 'delete-pages',
    mode: 'delete-pages',
    heading: 'Delete pages from a PDF',
    title: 'Delete PDF Pages Free - Remove Pages in Your Browser',
    description:
      'Remove unwanted pages from a PDF and save the rest. Runs entirely in your browser with no upload.',
    intro:
      'Drop out cover sheets, blank pages or anything else you do not want. Undo is available throughout, so a mistake costs nothing.',
    steps: [
      'Open the PDF.',
      'Right-click any thumbnail and choose Delete page.',
      'Undo with Ctrl/Cmd + Z if you remove the wrong one.',
      'Download the trimmed document.',
    ],
    keywords: [
      'delete pdf pages',
      'remove pages from pdf',
      'delete page from pdf free',
      'remove blank pages pdf',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Can I get a deleted page back?',
        answer:
          'Yes, while the document is still open — undo restores it. Once you have downloaded and closed the tab, reopen the original file, which was never modified.',
      },
    ],
    related: ['split', 'extract-pages', 'rotate'],
    curated: true,
  },
];

export const curatedPdfTools = pdfTools.filter((tool) => tool.curated);

export const resolvePdfTool = (slug: string): PdfTool | undefined =>
  pdfTools.find((tool) => tool.slug === slug);
