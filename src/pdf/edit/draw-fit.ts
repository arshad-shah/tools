import type { TextMeasure } from './font-stack';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from './draw';

export interface FittedText {
  size: number;
  lines: string[];
  /** Text had to be cut (lines dropped or shortened) to stay inside the box. */
  truncated: boolean;
}

export const DEFAULT_LINE_HEIGHT = 1.2;
const EPS = 1e-6;

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

export function assertBox(box: Box): void {
  const { x, y, width, height } = box;
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0)
    throw invalid('The drawing box is not valid');
}

/** Line breaks unified; tabs as spaces (no font draws a tab). */
export const normalizeText = (text: string) =>
  text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');

/** The longest prefix of `line` (whole code points) that fits `maxWidth`. */
function cut(
  width: (s: string) => number,
  line: string,
  maxWidth: number,
): string {
  const chars = Array.from(line);
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (width(chars.slice(0, mid).join('')) <= maxWidth + EPS) lo = mid;
    else hi = mid - 1;
  }
  return chars.slice(0, lo).join('').trimEnd();
}

/** Word wrap; a word wider than the line is broken between characters. */
function wrap(
  width: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ').filter((w) => w !== '')) {
      const joined = line ? `${line} ${word}` : word;
      if (width(joined) <= maxWidth + EPS) {
        line = joined;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (width(rest) > maxWidth + EPS) {
        const head = cut(width, rest, maxWidth) || Array.from(rest)[0];
        lines.push(head);
        rest = rest.slice(head.length);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Lays text out in `box` (pure; the overlays use it too, so the preview
 * matches the output). A numeric `size` is the largest size wanted; text
 * shrinks from it down to `minSize` until it fits (pass `minSize === size`
 * for no shrinking). `'auto'` starts from the size whose line fills the box
 * height. Single-line text joins line breaks with spaces. When even
 * `minSize` does not fit, lines are cut so nothing leaves the box, and
 * `truncated` says so. `lineHeight` is a multiple of the size (default 1.2).
 */
export function fitText(
  font: TextMeasure,
  text: string,
  box: Box,
  style: {
    size: number | 'auto';
    minSize: number;
    multiline: boolean;
    lineHeight?: number;
  },
): FittedText {
  assertBox(box);
  const lh = style.lineHeight ?? DEFAULT_LINE_HEIGHT;
  if (!(lh > 0 && Number.isFinite(lh)))
    throw invalid('The line height must be a positive number');
  if (!(style.minSize > 0 && Number.isFinite(style.minSize)))
    throw invalid('The text size must be a positive number');
  const start =
    style.size === 'auto' ? box.height / lh : Math.max(0, style.size);
  if (style.size !== 'auto' && !(style.size > 0 && Number.isFinite(style.size)))
    throw invalid('The text size must be a positive number');
  const minSize = Math.min(style.minSize, Math.max(start, EPS));
  const clean = normalizeText(text);
  const body = style.multiline ? clean : clean.replace(/\n/g, ' ');
  if (body.trim() === '')
    return { size: Math.max(start, minSize), lines: [], truncated: false };

  const unit = (s: string) => font.widthOfTextAtSize(s, 1);
  const layout = (size: number) =>
    style.multiline ? wrap((s) => unit(s) * size, body, box.width) : [body];
  const fits = (size: number) => {
    const lines = layout(size);
    return (
      lines.length * size * lh <= box.height + EPS &&
      lines.every((l) => unit(l) * size <= box.width + EPS)
    );
  };
  // Two decimals are plenty, and keep sizes stable between preview and output.
  const floor2 = (n: number) => Math.floor(n * 100 + EPS) / 100;

  let size: number | null = null;
  if (fits(start)) size = start;
  else if (!style.multiline) {
    const w = unit(body);
    const best = floor2(
      Math.min(start, box.height / lh, w > 0 ? box.width / w : Infinity),
    );
    if (best >= minSize && fits(best)) size = best;
  } else if (fits(minSize)) {
    let lo = minSize;
    let hi = start;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    size = Math.max(minSize, floor2(lo));
  }
  if (size !== null) return { size, lines: layout(size), truncated: false };

  // Even the minimum is too large: cut what does not fit.
  const all = layout(minSize);
  const maxLines = Math.floor((box.height + EPS) / (minSize * lh));
  const kept = all
    .slice(0, maxLines)
    .map((l) => cut((s) => unit(s) * minSize, l, box.width));
  return { size: minSize, lines: kept, truncated: true };
}
