import type {
  ExportSettings,
  PdfEditorState,
  PdfMetadata,
  RGB,
  ToolId,
  ToolSettings,
} from './types';

/* -------------------------------------------------------------------------- */
/*                               Asset locations                               */
/* -------------------------------------------------------------------------- */

/**
 * Everything pdf.js loads at runtime, served from our own origin by
 * `scripts/copy-static-assets.mjs`. Trailing slashes matter — pdf.js
 * concatenates file names onto these directly.
 */
export const PDFJS_ASSETS = {
  worker: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
  version: '/pdfjs/version.txt',
} as const;

/* -------------------------------------------------------------------------- */
/*                                   Viewing                                   */
/* -------------------------------------------------------------------------- */

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.2;

/** Gap between pages in the scroll list, in CSS pixels. */
export const PAGE_GAP = 16;

/**
 * Safari on iOS refuses to allocate a canvas beyond roughly 16.7 megapixels and
 * returns a blank one rather than throwing, so cap total area rather than
 * trusting devicePixelRatio.
 */
export const MAX_CANVAS_AREA = 16_700_000;

/** How many full-resolution page canvases to keep alive outside the viewport. */
export const RENDERED_PAGE_LIMIT = 8;

/** Concurrent thumbnail renders. More than this starves the main render. */
export const THUMBNAIL_CONCURRENCY = 3;

export const THUMBNAIL_WIDTH = 140;

/** Pages rendered above/below the viewport, as a fraction of viewport height. */
export const OVERSCAN_BEFORE = 1.5;
export const OVERSCAN_AFTER = 2.5;

/* -------------------------------------------------------------------------- */
/*                                   Editing                                   */
/* -------------------------------------------------------------------------- */

export const HISTORY_LIMIT = 50;

/** Snap distance in *screen* pixels, converted to points at the current zoom. */
export const SNAP_THRESHOLD_PX = 6;

/** Default page margin guide, in points (0.5"). */
export const MARGIN_GUIDE_PT = 36;

export const NUDGE_PT = 1;
export const NUDGE_LARGE_PT = 10;

/** Below this, a drag is treated as a click rather than a move. */
export const DRAG_THRESHOLD_PX = 3;

export const BLACK: RGB = { r: 0, g: 0, b: 0 };
export const WHITE: RGB = { r: 1, g: 1, b: 1 };

/* -------------------------------------------------------------------------- */
/*                                   Limits                                    */
/* -------------------------------------------------------------------------- */

/** Warn (don't block) above this — large files are a mobile tab-kill risk. */
export const LARGE_FILE_WARN_MB = 30;

export const DEFAULT_RASTER_DPI = 200;
export const OCR_DPI = 300;

/* -------------------------------------------------------------------------- */
/*                                  Defaults                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  color: BLACK,
  strokeWidth: 2,
  fontSize: 12,
  opacity: 1,
};

const TOOL_IDS: ToolId[] = [
  'select',
  'text',
  'image',
  'signature',
  'ink',
  'highlight',
  'rect',
  'ellipse',
  'line',
  'arrow',
  'whiteout',
  'redaction',
  'note',
  'link',
];

const toolDefaults = () =>
  Object.fromEntries(
    TOOL_IDS.map((tool) => [
      tool,
      tool === 'highlight'
        ? { ...DEFAULT_TOOL_SETTINGS, color: { r: 1, g: 0.9, b: 0.2 } }
        : tool === 'whiteout'
          ? { ...DEFAULT_TOOL_SETTINGS, color: WHITE }
          : { ...DEFAULT_TOOL_SETTINGS },
    ])
  ) as Record<ToolId, ToolSettings>;

export const EMPTY_METADATA: PdfMetadata = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  filename: 'document.pdf',
  flattenForms: false,
  optimize: 'none',
  imageQuality: 0.8,
  targetDpi: 150,
  encryption: null,
  stripMetadata: false,
};

export const createInitialState = (): PdfEditorState => ({
  sources: {},
  pages: [],
  objects: {},
  selection: { pageId: null, objectIds: [] },
  activeTool: 'select',
  toolDefaults: toolDefaults(),
  view: {
    zoom: 1,
    fit: 'width',
    sidebar: 'thumbnails',
    inspector: false,
    currentPageId: null,
  },
  history: { past: [], future: [], inTransaction: false },
  dirty: false,
  status: { busy: false, label: '', progress: null },
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  metadata: { ...EMPTY_METADATA },
  forms: {},
});
