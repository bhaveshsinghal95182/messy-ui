/**
 * Shared types for the client-side PDF editor.
 *
 * Two conventions hold everywhere below and are worth stating once:
 *
 * - **All geometry is in PDF user space**: points (1/72"), origin at the
 *   bottom-left, y increasing upwards, relative to the CropBox of the page in
 *   its *unrotated* orientation. Screen pixels only exist inside event handlers
 *   and are converted immediately by `@/lib/pdf/geometry`.
 * - **State is immutable.** The React Compiler is enabled for this project, so
 *   mutating an object in place will be memoised away and the UI will silently
 *   fail to update. Reducers always return new objects.
 */

/* -------------------------------------------------------------------------- */
/*                                  Geometry                                   */
/* -------------------------------------------------------------------------- */

export interface Point {
  x: number;
  y: number;
}

/** Bottom-left anchored rectangle in PDF user space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 0-1 per channel, matching pdf-lib's `rgb()` helper. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Quarter-turn page rotation, the only rotation PDF's /Rotate allows. */
export type Quadrant = 0 | 90 | 180 | 270;

/* -------------------------------------------------------------------------- */
/*                             Sources and pages                               */
/* -------------------------------------------------------------------------- */

export type SourceId = string;
export type PageEntryId = string;
export type AssetId = string;

export interface PageSize {
  /** CropBox width in points, before any rotation. */
  width: number;
  /** CropBox height in points, before any rotation. */
  height: number;
  /** The page's own /Rotate value. */
  rotation: Quadrant;
}

/** One opened file. Several may be loaded at once when merging. */
export interface PdfSource {
  id: SourceId;
  name: string;
  /**
   * The pristine bytes, exactly as read from disk. pdf.js is never handed this
   * array directly — `getDocument` transfers the underlying ArrayBuffer to its
   * worker, which detaches it on the main thread and makes every later read
   * throw. Always pass a `.slice()` copy to pdf.js and keep this for pdf-lib.
   */
  bytes: Uint8Array;
  byteLength: number;
  encrypted: boolean;
  /** Held in memory only, so an encrypted source can be re-opened for export. */
  password: string | null;
  pageCount: number;
  pageSizes: PageSize[];
}

/**
 * One page of the working document.
 *
 * This is a *reference* into a source, not a copy of the page. That single
 * decision is what makes merge, split, extract, reorder, delete and duplicate
 * all reduce to ordinary array operations on `pages`.
 */
export interface PageEntry {
  /** Stable across reorders, so React keys and selection survive a move. */
  id: PageEntryId;
  sourceId: SourceId;
  /** 0-based index of the page within its source. */
  sourceIndex: number;
  /** Extra rotation the user applied, *on top of* the page's own /Rotate. */
  rotation: Quadrant;
  /** Crop in PDF points relative to the source CropBox, or null for no crop. */
  crop: Rect | null;
}

/* -------------------------------------------------------------------------- */
/*                                  Objects                                    */
/* -------------------------------------------------------------------------- */

export type PdfObjectKind =
  | 'text'
  | 'image'
  | 'signature'
  | 'shape'
  | 'ink'
  | 'highlight'
  | 'whiteout'
  | 'redaction'
  | 'note'
  | 'link';

interface ObjectBase {
  id: string;
  kind: PdfObjectKind;
  /** Bounding box in PDF user space. */
  rect: Rect;
  /** Degrees counter-clockwise about the rect centre. */
  rotation: number;
  /** 0-1. Applied via an ExtGState on export. */
  opacity: number;
  locked: boolean;
  /** Paint order within the page; higher paints later. */
  z: number;
  createdAt: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextObject extends ObjectBase {
  kind: 'text';
  text: string;
  fontId: string;
  size: number;
  color: RGB;
  align: TextAlign;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  /** Grow the rect to fit the text instead of wrapping inside it. */
  autoSize: boolean;
}

export interface ImageObject extends ObjectBase {
  kind: 'image';
  assetId: AssetId;
  fit: 'contain' | 'stretch';
}

export interface SignatureObject extends ObjectBase {
  kind: 'signature';
  assetId: AssetId;
  variant: 'signature' | 'initials';
  sourceKind: 'draw' | 'type' | 'upload';
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow';

export interface ShapeObject extends ObjectBase {
  kind: 'shape';
  shape: ShapeKind;
  stroke: RGB | null;
  fill: RGB | null;
  strokeWidth: number;
  dash: number[] | null;
  arrowHead: 'none' | 'end' | 'both';
}

export interface InkObject extends ObjectBase {
  kind: 'ink';
  /** Polyline in PDF user space, absolute (not relative to `rect`). */
  points: Point[];
  strokeWidth: number;
  color: RGB;
}

export interface HighlightObject extends ObjectBase {
  kind: 'highlight';
  color: RGB;
  /** One rect per covered text line, from the pdf.js text layer selection. */
  quads: Rect[];
}

export interface WhiteoutObject extends ObjectBase {
  kind: 'whiteout';
  color: RGB;
}

/**
 * A region to genuinely remove. Unlike `whiteout`, exporting a page that holds
 * one of these rasterises that page so the underlying text is destroyed rather
 * than merely covered. See `@/lib/pdf/ops/redact`.
 */
export interface RedactionObject extends ObjectBase {
  kind: 'redaction';
  label: string | null;
}

export interface NoteObject extends ObjectBase {
  kind: 'note';
  body: string;
  author: string;
  color: RGB;
  open: boolean;
}

export type LinkTarget =
  | { type: 'url'; url: string }
  | { type: 'page'; pageId: PageEntryId };

export interface LinkObject extends ObjectBase {
  kind: 'link';
  target: LinkTarget;
}

export type PdfObject =
  | TextObject
  | ImageObject
  | SignatureObject
  | ShapeObject
  | InkObject
  | HighlightObject
  | WhiteoutObject
  | RedactionObject
  | NoteObject
  | LinkObject;

/* -------------------------------------------------------------------------- */
/*                                   Assets                                    */
/* -------------------------------------------------------------------------- */

/**
 * Binary payloads live outside the store, in a module-level map, so history
 * snapshots stay cheap and the reducer stays pure. See `@/lib/pdf/assets`.
 */
export interface PdfAsset {
  id: AssetId;
  bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  /** Lazily created for rendering; revoked when the asset is dropped. */
  objectUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*                                    Tools                                    */
/* -------------------------------------------------------------------------- */

export type ToolId =
  | 'select'
  | 'text'
  | 'image'
  | 'signature'
  | 'ink'
  | 'highlight'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'whiteout'
  | 'redaction'
  | 'note';

/** Last-used settings per tool, so picking a tool again keeps your colour. */
export interface ToolSettings {
  color: RGB;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
}

/* -------------------------------------------------------------------------- */
/*                                    View                                     */
/* -------------------------------------------------------------------------- */

export type FitMode = 'width' | 'page' | 'none';
export type SidebarPanel = 'thumbnails' | 'search' | 'outline' | 'none';

export interface ViewState {
  zoom: number;
  fit: FitMode;
  sidebar: SidebarPanel;
  /** Page currently filling most of the viewport, for the page indicator. */
  currentPageId: PageEntryId | null;
}

/* -------------------------------------------------------------------------- */
/*                              Export settings                                */
/* -------------------------------------------------------------------------- */

export type OptimizeMode = 'none' | 'restructure' | 'downsample' | 'raster';

export interface EncryptionSettings {
  userPassword: string;
  ownerPassword: string;
  permissions: {
    printing: 'highResolution' | 'lowResolution' | false;
    modifying: boolean;
    copying: boolean;
    annotating: boolean;
    fillingForms: boolean;
    contentAccessibility: boolean;
    documentAssembly: boolean;
  };
}

export interface ExportSettings {
  filename: string;
  flattenForms: boolean;
  optimize: OptimizeMode;
  /** JPEG quality 0-1, used by the downsample and raster paths. */
  imageQuality: number;
  targetDpi: number;
  encryption: EncryptionSettings | null;
  stripMetadata: boolean;
}

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

/* -------------------------------------------------------------------------- */
/*                                   State                                     */
/* -------------------------------------------------------------------------- */

export interface StatusState {
  busy: boolean;
  label: string;
  /** 0-1, or null for an indeterminate operation. */
  progress: number | null;
}

export interface Selection {
  pageId: PageEntryId | null;
  objectIds: string[];
}

/** The slice undo/redo captures. Structural sharing makes snapshots cheap. */
export interface HistorySnapshot {
  pages: PageEntry[];
  objects: Record<PageEntryId, PdfObject[]>;
  metadata: PdfMetadata;
  forms: Record<string, FormFieldValue>;
}

export type FormFieldValue = string | boolean | string[];

export interface PdfEditorState {
  sources: Record<SourceId, PdfSource>;
  pages: PageEntry[];
  objects: Record<PageEntryId, PdfObject[]>;
  selection: Selection;
  activeTool: ToolId;
  toolDefaults: Record<ToolId, ToolSettings>;
  view: ViewState;
  history: {
    past: HistorySnapshot[];
    future: HistorySnapshot[];
    /** Set between BEGIN_TRANSACTION and COMMIT_TRANSACTION during a drag. */
    inTransaction: boolean;
  };
  dirty: boolean;
  status: StatusState;
  exportSettings: ExportSettings;
  metadata: PdfMetadata;
  forms: Record<string, FormFieldValue>;
}

/* -------------------------------------------------------------------------- */
/*                                  Actions                                    */
/* -------------------------------------------------------------------------- */

export type PdfAction =
  | { type: 'ADD_SOURCE'; source: PdfSource; entries: PageEntry[] }
  | { type: 'REMOVE_SOURCE'; sourceId: SourceId }
  | { type: 'SET_PAGES'; pages: PageEntry[] }
  | { type: 'MOVE_PAGE'; from: number; to: number }
  | { type: 'DELETE_PAGES'; pageIds: PageEntryId[] }
  | { type: 'DUPLICATE_PAGES'; pageIds: PageEntryId[] }
  | { type: 'ROTATE_PAGES'; pageIds: PageEntryId[]; delta: number }
  | { type: 'SET_CROP'; pageId: PageEntryId; crop: Rect | null }
  | { type: 'ADD_OBJECT'; pageId: PageEntryId; object: PdfObject }
  | {
      type: 'UPDATE_OBJECT';
      pageId: PageEntryId;
      objectId: string;
      patch: Partial<PdfObject>;
    }
  | {
      type: 'UPDATE_OBJECTS';
      pageId: PageEntryId;
      patches: { objectId: string; patch: Partial<PdfObject> }[];
    }
  | { type: 'DELETE_OBJECTS'; pageId: PageEntryId; objectIds: string[] }
  | {
      type: 'REORDER_OBJECT';
      pageId: PageEntryId;
      objectId: string;
      to: 'front' | 'back' | 'forward' | 'backward';
    }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'SET_TOOL'; tool: ToolId }
  | { type: 'SET_TOOL_DEFAULTS'; tool: ToolId; patch: Partial<ToolSettings> }
  | { type: 'SET_VIEW'; patch: Partial<ViewState> }
  | { type: 'SET_METADATA'; patch: Partial<PdfMetadata> }
  | { type: 'SET_FORM_VALUE'; field: string; value: FormFieldValue }
  | { type: 'SET_EXPORT_SETTINGS'; patch: Partial<ExportSettings> }
  | { type: 'SET_STATUS'; patch: Partial<StatusState> }
  | { type: 'BEGIN_TRANSACTION' }
  | { type: 'COMMIT_TRANSACTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };
