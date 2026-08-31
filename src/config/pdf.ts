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
    slug: 'sign',
    mode: 'sign',
    heading: 'Sign a PDF',
    title: 'Sign a PDF Free - Add Your Signature in the Browser',
    description:
      'Draw, type or upload a signature and place it on any page. Runs entirely in your browser, so the document you are signing is never uploaded.',
    intro:
      'Sign with a mouse, a finger or a stylus, type your name in a script face, or upload a photo of your handwritten signature — the white paper is dropped automatically so only the ink lands on the page. Signatures you create can be saved in this browser for next time.',
    steps: [
      'Open the PDF you need to sign.',
      'Choose Draw, Type or Upload.',
      'Drag the signature into place and resize it to fit the line.',
      'Download the signed document.',
    ],
    keywords: [
      'sign pdf',
      'sign pdf online free',
      'add signature to pdf',
      'esign pdf',
      'electronic signature pdf',
      'draw signature on pdf',
      'sign pdf without uploading',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Is a drawn signature legally binding?',
        answer:
          'In many jurisdictions an electronic signature carries the same weight as a handwritten one, but the rules vary by country and by the kind of document. This tool produces the signature; whether a given document needs more than that is a legal question, not a technical one.',
      },
      {
        question: 'Where are my saved signatures kept?',
        answer:
          'In this browser, on this device, using IndexedDB. They are never transmitted. Clearing your browsing data removes them, and they will not appear in another browser or on another machine.',
      },
      {
        question: 'Can I use a real digital certificate instead?',
        answer:
          'Yes — a cryptographic signature using your own PKCS#12 certificate is supported as well, and unlike a drawn signature it can prove the document has not been altered since signing.',
      },
    ],
    related: ['esign', 'merge', 'split'],
    curated: true,
  },
  {
    slug: 'esign',
    mode: 'sign',
    heading: 'eSign a PDF',
    title: 'eSign PDF Free - Electronic Signatures in Your Browser',
    description:
      'Add an electronic signature to a PDF without an account and without uploading the file anywhere.',
    intro:
      'Everything an e-signature service does to a single document, minus the account and the upload. Draw, type or upload your signature, place it, add the date, and save.',
    steps: [
      'Open the document.',
      'Create your signature by drawing, typing or uploading it.',
      'Place it, and add initials or a date where the form asks for them.',
      'Download the signed file.',
    ],
    keywords: [
      'esign pdf',
      'esign pdf free',
      'electronic signature',
      'digital signature pdf free',
      'sign document online',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'How is this different from a signing service?',
        answer:
          'A signing service routes a document between several parties and keeps an audit trail on its servers. This signs a document you already have, on your own machine. If you need countersigning and an audit trail across parties, a service is the right tool; if you just need your own signature on a file, this avoids handing the document over.',
      },
    ],
    related: ['sign', 'merge', 'split'],
    curated: true,
  },
  {
    slug: 'protect',
    mode: 'protect',
    heading: 'Password-protect a PDF',
    title: 'Protect PDF with a Password Free - Encrypt in Your Browser',
    description:
      'Add a password and set permissions on a PDF. AES-256 encryption applied in your browser — the document and the password never leave your device.',
    intro:
      'Set a password that must be entered to open the document, and choose what readers are allowed to do with it. The encryption happens on your machine, which matters rather a lot here: uploading a file to a website in order to protect it rather defeats the point.',
    steps: [
      'Open the PDF.',
      'Choose a password to open the document.',
      'Optionally set permissions such as printing or copying.',
      'Download the protected file.',
    ],
    keywords: [
      'password protect pdf',
      'encrypt pdf',
      'add password to pdf',
      'lock pdf',
      'protect pdf free',
      'pdf encryption aes',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'How strong is the encryption?',
        answer:
          'AES-256, the algorithm specified in ISO 32000-2 revision 6. Weak legacy RC4 encryption is refused outright, so a file protected here cannot accidentally end up protected by broken crypto.',
      },
      {
        question: 'What is the difference between the two passwords?',
        answer:
          'The open password is real encryption — without it the file cannot be read at all. The owner password only guards the permission flags, and those flags are a convention that well-behaved readers honour rather than something enforced cryptographically. Treat permissions as a request, not a guarantee.',
      },
      {
        question: 'Can I remove a password instead?',
        answer:
          'Yes. Open the file with its password, turn protection off, and download — the saved copy is unencrypted.',
      },
    ],
    related: ['unlock', 'sign', 'merge'],
    curated: true,
  },
  {
    slug: 'unlock',
    mode: 'unlock',
    heading: 'Remove a PDF password',
    title: 'Remove PDF Password Free - Unlock a PDF in Your Browser',
    description:
      'Remove the password from a PDF you can already open, in your browser. Nothing is uploaded.',
    intro:
      'If you have the password but would rather not type it every time, open the document once and save an unprotected copy. This decrypts a file you can already open — it does not break or guess passwords.',
    steps: [
      'Open the PDF and enter its password when prompted.',
      'Open the password panel and turn protection off.',
      'Download the unprotected copy.',
    ],
    keywords: [
      'remove pdf password',
      'unlock pdf',
      'decrypt pdf',
      'remove password from pdf free',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Can this open a PDF whose password I do not know?',
        answer:
          'No. It decrypts a document using the password you supply. There is no password recovery, cracking or bypass here, and there will not be.',
      },
      {
        question: 'Does removing the password change anything else?',
        answer:
          'No. The pages, text, annotations and form fields are untouched; only the encryption is dropped.',
      },
    ],
    related: ['protect', 'merge', 'split'],
    curated: true,
  },
  {
    slug: 'redact',
    mode: 'redact',
    heading: 'Redact a PDF',
    title: 'Redact PDF Free - Permanently Remove Text in Your Browser',
    description:
      'Black out text so it is genuinely gone, not merely covered. Redacted pages are flattened to images on export, in your browser.',
    intro:
      'Drawing a black rectangle over text does not remove it — the words stay in the file and come straight back out with copy-and-paste. That mistake has leaked real documents. Here, any page carrying a redaction is rendered to pixels with the redacted areas painted opaque, and the original text is not present in the saved file at all.',
    steps: [
      'Open the PDF.',
      'Choose the redaction tool and drag over anything to remove.',
      'Download. Pages with redactions are flattened; the rest are untouched.',
      'Check the result by trying to select text in the redacted area.',
    ],
    keywords: [
      'redact pdf',
      'black out text pdf',
      'remove text from pdf permanently',
      'redact pdf free',
      'pdf redaction tool',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Is the text really removed?',
        answer:
          'Yes. The page is re-rendered as an image with the redaction painted on, and that image replaces the page. There is no text object left behind to select, search or extract — which is not true of tools that simply draw a filled rectangle.',
      },
      {
        question: 'What does redaction cost me?',
        answer:
          'Redacted pages become images: their text is no longer selectable or searchable and the file is larger. Only pages you actually redact are affected; everything else keeps its original text.',
      },
      {
        question: 'What about the metadata?',
        answer:
          'Worth clearing too. The document properties panel and the "remove metadata" option in the password panel strip the author, timestamps and any embedded scripts or attachments.',
      },
    ],
    related: ['protect', 'sign', 'delete-pages'],
    curated: true,
  },
  {
    slug: 'fill-form',
    mode: 'fill-form',
    heading: 'Fill in a PDF form',
    title: 'Fill PDF Forms Free - Complete and Flatten in Your Browser',
    description:
      'Fill in an interactive PDF form and optionally flatten it, entirely in your browser. Nothing is uploaded.',
    intro:
      'Interactive fields are detected automatically and listed in a side panel. Fill them in, then either keep the form editable or flatten it so the values are permanent and every reader shows the same thing.',
    steps: [
      'Open the form.',
      'Open the form panel from the toolbar; every fillable field is listed.',
      'Fill them in, and add text boxes anywhere the form lacks a field.',
      'Choose whether to flatten, then download.',
    ],
    keywords: [
      'fill pdf form',
      'pdf form filler',
      'complete pdf form free',
      'flatten pdf form',
      'fill and sign pdf',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'What if the form has no interactive fields?',
        answer:
          'Plenty of "forms" are just scans or flat documents with lines drawn on them. Add text boxes wherever you need to write, and they will be part of the saved file.',
      },
      {
        question: 'Should I flatten?',
        answer:
          'Flatten if you are sending the completed form onwards: it makes the values permanent and guarantees every reader displays them identically. Leave it interactive if someone else still needs to edit it.',
      },
    ],
    related: ['sign', 'esign', 'protect'],
    curated: true,
  },
  {
    slug: 'watermark',
    mode: 'watermark',
    heading: 'Add a watermark to a PDF',
    title: 'Add a Watermark to a PDF Free - In Your Browser',
    description:
      'Stamp DRAFT, CONFIDENTIAL or any text across every page, with control over size, angle and opacity. Runs in your browser.',
    intro:
      'Add diagonal text across a page range, at whatever size and opacity suits. The watermark is added as an ordinary editable object, so you can move or delete any individual one before saving.',
    steps: [
      'Open the PDF.',
      'Open the watermark panel and type your text.',
      'Set the size, angle and opacity, and choose a page range.',
      'Download.',
    ],
    keywords: [
      'add watermark to pdf',
      'watermark pdf free',
      'pdf watermark online',
      'stamp draft on pdf',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Can a watermark be removed by someone else?',
        answer:
          'A watermark is ordinary page content, so a determined person with the right tools can strip it. It marks a document, it does not protect one — for that, use a password.',
      },
    ],
    related: ['page-numbers', 'protect', 'merge'],
    curated: true,
  },
  {
    slug: 'page-numbers',
    mode: 'page-numbers',
    heading: 'Add page numbers to a PDF',
    title: 'Add Page Numbers to a PDF Free - In Your Browser',
    description:
      'Number the pages of a PDF, with headers and footers, entirely in your browser.',
    intro:
      'Add page numbers in any corner, using placeholders like {page} and {pages}. The same panel handles headers and footers, including the date and the file name.',
    steps: [
      'Open the PDF.',
      'Open the page numbers panel.',
      'Choose the format, position and page range.',
      'Download.',
    ],
    keywords: [
      'add page numbers to pdf',
      'number pdf pages',
      'pdf header footer',
      'page numbers pdf free',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Can I start numbering from something other than 1?',
        answer:
          'Choose a page range so numbering begins where you want it. The numbers follow the current page order, so reorder the document first if you plan to.',
      },
    ],
    related: ['watermark', 'merge', 'split'],
    curated: true,
  },
  {
    slug: 'compress',
    mode: 'compress',
    heading: 'Compress a PDF',
    title: 'Compress PDF Free - Reduce File Size in Your Browser',
    description:
      'Make a PDF smaller in your browser, with an honest account of what each option costs. Nothing is uploaded.',
    intro:
      'Two options, and the dialog is candid about both. Tidying up rebuilds the file with compressed object streams and drops orphaned data, changing nothing visible. Flattening to images shrinks scans dramatically but makes text unselectable, so it is the wrong choice for a text document.',
    steps: [
      'Open the PDF.',
      'Open the compress panel and pick an option.',
      'Download, and check the before-and-after size it reports.',
    ],
    keywords: [
      'compress pdf',
      'reduce pdf file size',
      'shrink pdf',
      'compress pdf free',
      'make pdf smaller',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Why did my file barely get smaller?',
        answer:
          'Because it was already compressed. PDF content streams and embedded fonts are Flate-compressed as a matter of course, so a document exported from a word processor has very little slack. Scans are mostly image data and are where real savings live. A tool advertising a fixed percentage regardless of what is in your file is guessing.',
      },
      {
        question: 'Will compressing lose quality?',
        answer:
          'Tidying up is lossless and changes nothing you can see. Flattening to images is lossy by definition — that is the trade it makes, and it is labelled as such.',
      },
    ],
    related: ['pdf-to-image', 'merge', 'split'],
    curated: true,
  },
  {
    slug: 'pdf-to-image',
    mode: 'pdf-to-image',
    heading: 'Convert a PDF to images',
    title: 'PDF to PNG or JPG Free - Convert in Your Browser',
    description:
      'Save each page of a PDF as a PNG or JPEG at a resolution you choose. Runs entirely in your browser.',
    intro:
      'Every page becomes its own image file. Pick the resolution — 150 DPI is fine on screen, 300 for print — and whether you want lossless PNG or smaller JPEG.',
    steps: [
      'Open the PDF.',
      'Open the compress and convert panel, then the Images tab.',
      'Choose a resolution and format.',
      'Save; one file per page.',
    ],
    keywords: [
      'pdf to png',
      'pdf to jpg',
      'convert pdf to image',
      'pdf to image free',
      'export pdf pages as images',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'What resolution should I choose?',
        answer:
          '150 DPI is comfortable for viewing on a screen. 300 DPI is the usual floor for printing. Higher costs memory and time for detail most uses never show.',
      },
      {
        question: 'PNG or JPEG?',
        answer:
          'PNG for text and line art, where it stays crisp and lossless. JPEG for photographic pages, where it is far smaller with little visible difference.',
      },
    ],
    related: ['compress', 'extract-text', 'split'],
    curated: true,
  },
  {
    slug: 'extract-text',
    mode: 'extract-text',
    heading: 'Extract text from a PDF',
    title: 'Extract Text from a PDF Free - In Your Browser',
    description:
      'Pull the text out of a PDF as plain text or Markdown, without uploading it anywhere.',
    intro:
      'Save the document text as a .txt file, or as Markdown with headings and lists inferred from type size and spacing. A PDF stores glyphs at coordinates rather than structure, so the Markdown conversion is a well-behaved guess rather than a faithful translation.',
    steps: [
      'Open the PDF.',
      'Open the compress and convert panel, then the Text tab.',
      'Choose plain text or Markdown.',
    ],
    keywords: [
      'extract text from pdf',
      'pdf to text',
      'pdf to markdown',
      'copy text from pdf',
      'pdf text extraction free',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Nothing came out — why?',
        answer:
          'The document is almost certainly a scan: a picture of a page, with no text objects in it at all. Extraction can only return text that is actually there; reading a scan needs OCR.',
      },
      {
        question: 'How good is the Markdown?',
        answer:
          'Good on conventionally laid-out documents, weaker on anything unusual. Headings come from lines noticeably larger than the body text, lists from bullet glyphs, and code from monospaced fonts. A PDF records none of that explicitly, so it is inference.',
      },
    ],
    related: ['pdf-to-image', 'compress', 'fill-form'],
    curated: true,
  },
  {
    slug: 'ocr',
    mode: 'ocr',
    heading: 'OCR a scanned PDF',
    title: 'OCR PDF Free - Make a Scan Searchable in Your Browser',
    description:
      'Recognise the text in a scanned PDF and make it searchable, without uploading the document anywhere.',
    intro:
      'A scan is a picture of a page: there is no text in the file to select, search or copy. OCR reads the words from the pixels and writes them back as an invisible layer sitting exactly over the printed ones, so the page looks identical but its text can be found and copied. The recognition and the language model both run on your device.',
    steps: [
      'Open the scanned PDF.',
      'Open the OCR panel and start.',
      'Each page is read at 300 DPI; the first run also loads the language model.',
      'Save the searchable copy.',
    ],
    keywords: [
      'ocr pdf',
      'make pdf searchable',
      'scanned pdf to text',
      'ocr pdf free',
      'searchable pdf',
      'ocr without uploading',
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: 'Does the language model come from a third party?',
        answer:
          'No. Both the recognition engine and the English model are served from this site, not a CDN — a tool promising no third-party requests should not quietly make one the moment you use a feature. The model is about 3 MB and your browser caches it after the first run.',
      },
      {
        question: 'How accurate is it?',
        answer:
          'Good on clean, straight scans of ordinary printed text; worse on handwriting, low resolution, heavy skew or unusual typefaces. Words the engine is not confident about are left out rather than filling your document with plausible-looking nonsense.',
      },
      {
        question: 'Does the page look any different afterwards?',
        answer:
          'No. The recognised text is drawn in an invisible rendering mode over the original image, so nothing is painted — you see the scan exactly as before, but selecting and searching now work.',
      },
    ],
    related: ['extract-text', 'compress', 'redact'],
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
