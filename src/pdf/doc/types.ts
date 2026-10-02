import type { Rotation } from '@/pdf/edit';

export type { Rotation };
export type SourceId = string;
export type CheckpointId = string;
export type AssetId = string;
export type PageId = string;
export type OpId = string;
export type ModeId =
  | 'organize'
  | 'edit'
  | 'annotate'
  | 'fill-sign'
  | 'redact'
  | 'convert'
  | 'protect'
  | 'optimize'
  | 'ocr';

/** PDF user space, unrotated, points; origin wherever the page's user space puts it (usually MediaBox lower-left). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** pdf.js page.view and page.rotate. */
export interface PageGeom {
  view: [number, number, number, number];
  rotate: Rotation;
}

export interface SourceRef {
  id: SourceId;
  name: string;
  byteSize: number;
  pageCount: number;
  pages: PageGeom[];
  origin: 'checkpoint' | 'merged';
}

export interface CheckpointReport {
  title: string;
  lines: string[];
  warnings: string[];
  rasterisedPages?: number[];
  /** 0-based pages of the checkpoint's source a redaction changed. */
  redactedPages?: number[];
  /** Runner-specific structured report (JSON-serialisable), e.g. the compress report. */
  details?: unknown;
}

export interface CheckpointMeta {
  id: CheckpointId;
  index: number;
  sourceId: SourceId;
  opId: OpId | null;
  byteSize: number;
  pageCount: number;
  createdAt: number;
  report?: CheckpointReport;
  available: boolean;
}

export interface PageRef {
  id: PageId;
  source: SourceId;
  /** Index within the source. */
  index: number;
  /** Pending rotation added to the source page's own /Rotate. */
  rotate: Rotation;
  /** Pending CropBox in page space. */
  crop?: Box;
  /** Pending resize (MediaBox), points. */
  size?: { width: number; height: number };
  /** Inserted blank page (source/index ignored). */
  blank?: { width: number; height: number };
}

export interface PageLabelRange {
  start: number;
  style: 'D' | 'r' | 'R' | 'a' | 'A' | null;
  prefix?: string;
  first?: number;
}

export interface OverlayItem {
  opId: OpId;
  type: string;
  pageId: PageId | null;
  params: unknown;
}

export interface DocView {
  checkpoint: CheckpointId;
  pages: readonly PageRef[];
  /** Page-scoped overlay ops, log order. */
  overlays: ReadonlyMap<PageId, readonly OverlayItem[]>;
  /** Overlay ops with pageId null (metadata, protect, labels...). */
  docOverlays: readonly OverlayItem[];
  pageLabels: readonly PageLabelRange[] | null;
  /** Overlay ops removed by later ops (e.g. annot.delete of a pending annot). */
  hidden: ReadonlySet<OpId>;
}

export interface Operation<P = unknown> {
  id: OpId;
  type: string;
  v: number;
  params: P;
  at: number;
  label: string;
  group?: string;
  checkpoint?: CheckpointId;
}

export interface NewOperation<P = unknown> {
  type: string;
  params: P;
}
