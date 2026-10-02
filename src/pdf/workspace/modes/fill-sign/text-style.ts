import { createToolStore } from '@/shared/state/createToolStore';
import { layoutStyled, type StyledLayout } from '@/pdf/edit/styled-layout';
import { textWidth } from './text-measure';

/** Text settings a flat text box or field carries (plan R39). */
export interface TextSettings {
  /** Points. */
  size: number;
  /** '#rrggbb'. */
  color: string;
  /** Letter spacing, points. */
  spacing: number;
}

export interface FieldStyle extends TextSettings {
  /** Character boxes: cell count, 0 when off. */
  comb: number;
  /** Detected character boxes: cell centres as shares of the width. */
  cells?: readonly number[];
}

export const DEFAULT_TEXT: TextSettings = {
  size: 11,
  color: '#000000',
  spacing: 0,
};
/** Quick text colours (the full picker is under More). */
export const TEXT_COLORS: readonly { value: string; label: string }[] = [
  { value: '#000000', label: 'Black' },
  { value: '#1d4ed8', label: 'Blue' },
  { value: '#1e3a8a', label: 'Dark blue' },
  { value: '#b91c1c', label: 'Red' },
  { value: '#15803d', label: 'Green' },
];
export const TEXT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 24, 36];
export const MIN_SIZE = 6;
export const MAX_SIZE = 72;
export const MAX_SPACING = 20;
const KEEP_DOCS = 30;

interface Remembered {
  /** Default for documents without their own. */
  global: TextSettings;
  /** Last used per document (content hash of the opened file), newest kept. */
  byDoc: Record<string, TextSettings & { at: number }>;
}

/** Settings only (never document content): sizes, colours, spacing. */
export const useTextDefaults = createToolStore<Remembered>({
  toolId: 'pdf-fill-sign-text',
  initial: { global: DEFAULT_TEXT, byDoc: {} },
});

const hashes = new Map<string, string>();

/** Records the content hash of an open document (the opened file's bytes). */
export function knowContentHash(docId: string, hash: string): void {
  hashes.set(docId, hash);
}

/**
 * The key text settings are remembered under: the opened file's content
 * hash once known (reopening the same file finds them), else the document id.
 */
export const textKey = (doc: { state: { id: string } }): string =>
  hashes.get(doc.state.id) ?? doc.state.id;

/** The settings a new text box starts with in this document. */
export function lastUsed(docId: string): TextSettings {
  const s = useTextDefaults.getState();
  const d = s.byDoc[docId];
  return d ? { size: d.size, color: d.color, spacing: d.spacing } : s.global;
}

/** Remembers settings for this document and as the global default. */
export function remember(
  docId: string,
  t: TextSettings,
  now: () => number = Date.now,
): void {
  const s = useTextDefaults.getState();
  const byDoc = { ...s.byDoc, [docId]: { ...t, at: now() } };
  const keep = Object.entries(byDoc)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, KEEP_DOCS);
  useTextDefaults.setState({
    global: { size: t.size, color: t.color, spacing: t.spacing },
    byDoc: Object.fromEntries(keep),
  });
}

/** Helvetica metrics as the export writer measures them. */
const heights = (size: number) => ({
  ascent: 0.718 * size,
  descent: -0.207 * size,
});

/**
 * Where the overlay draws the text: the same layout the writer uses
 * (styled-layout), with Helvetica widths. `quarter` swaps the box's sides
 * for a page shown a quarter turn round; `multiline` wraps from the top.
 */
export function overlayLayout(
  text: string,
  rect: { width: number; height: number },
  style: FieldStyle,
  quarter = false,
  multiline = false,
): StyledLayout {
  const box = quarter
    ? { width: rect.height, height: rect.width }
    : { width: rect.width, height: rect.height };
  return layoutStyled((ch, size) => textWidth(ch, size), heights, text, box, {
    size: style.size,
    spacing: style.spacing,
    comb: style.comb || undefined,
    cells: style.cells,
    multiline,
  });
}

/** A flat field's settings: its own, else the writer's defaults. */
export function effectiveStyle(
  f: { rect: { width: number; height: number }; style?: Partial<FieldStyle> },
  quarter = false,
): FieldStyle {
  const h = quarter ? f.rect.width : f.rect.height;
  return {
    size: f.style?.size ?? Math.min(DEFAULT_TEXT.size, h * 0.75),
    color: f.style?.color ?? DEFAULT_TEXT.color,
    spacing: f.style?.spacing ?? 0,
    comb: f.style?.comb ?? 0,
    ...(f.style?.cells ? { cells: f.style.cells } : {}),
  };
}

/**
 * The inline editor's caret metrics on screen (CSS px): the size the
 * overlay draws the text at, and its letter spacing. Character boxes get
 * the cell width instead, so the caret steps one box per character.
 */
export function caretMetrics(
  text: string,
  rect: { width: number; height: number },
  style: FieldStyle,
  scale: number,
  quarter = false,
): { fontPx: number; spacingPx: number; cellPx?: number } {
  const layout = overlayLayout(text || 'M', rect, style, quarter);
  const fontPx = layout.size * scale;
  if (!style.comb) return { fontPx, spacingPx: style.spacing * scale };
  const across = quarter ? rect.height : rect.width;
  return { fontPx, spacingPx: 0, cellPx: (across / style.comb) * scale };
}
