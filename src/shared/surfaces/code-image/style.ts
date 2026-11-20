import type { TokenKind } from '@/shared/lib/syntax/tokenize';

/**
 * The look of a code image. These colours are image content chosen by the
 * user (an exported picture), not interface colours, so they are literals.
 */
export interface CodeImagePalette {
  /** The window. */
  background: string;
  /** Plain text. */
  foreground: string;
  border: string;
  /** Line numbers, and on highlighted lines. */
  gutter: string;
  gutterActive: string;
  /** Behind highlighted lines. */
  highlight: string;
  /** The title bar and its text. */
  chrome: string;
  title: string;
  dots: readonly [string, string, string];
  /** The window's drop shadow. */
  shadow: string;
  tokens: Partial<Record<TokenKind, string>>;
}

export type CodeImageBackdrop =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string }
  /** A linear gradient at `angle` degrees (CSS convention: 0 is upwards). */
  | { kind: 'gradient'; angle: number; stops: readonly string[] };

export interface CodeImageStyle {
  palette: CodeImagePalette;
  backdrop: CodeImageBackdrop;
  fontFamily: string;
}

/**
 * Monospace fonts most systems have; the app bundles no monospace face, so
 * an exported image uses the first of these the viewer's system has.
 */
export const MONO_STACK =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Cascadia Mono", "Liberation Mono", "DejaVu Sans Mono", monospace';

/** The colour of a run. */
export const runColor = (p: CodeImagePalette, kind: TokenKind) =>
  p.tokens[kind] ?? p.foreground;

/**
 * The line a CSS `linear-gradient(<angle>deg, ...)` runs along over a
 * `w` by `h` box: through the centre, long enough that the corners get the
 * first and last colours.
 */
export function gradientLine(
  w: number,
  h: number,
  angle: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return {
    x1: cx - dx * half,
    y1: cy - dy * half,
    x2: cx + dx * half,
    y2: cy + dy * half,
  };
}
