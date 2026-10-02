import { charSpans } from './advance';
import type { PageTextItems } from '@/pdf/render';
import type { GlyphBox, TextRun } from './types';

const FALLBACK_ASCENT = 0.8;
const FALLBACK_DESCENT = -0.2;
const WHITESPACE = /^\s*$/u;

/**
 * One run per non-blank pdf.js text item (spec 8.2 step 4): x and baseline
 * from the item transform, font size in page space, vertical extent from
 * the font's ascent and descent. Rotated text keeps a ` rotated` font
 * suffix so labelling can skip it.
 */
export function textRuns(
  text: PageTextItems,
  fontNames: Record<string, string>,
): TextRun[] {
  const runs: TextRun[] = [];
  text.items.forEach((item, index) => {
    if (WHITESPACE.test(item.str)) return;
    const t = item.transform;
    const size = Math.hypot(t[2], t[3]) || Math.abs(item.height) || 1;
    const style = text.styles[item.fontName];
    const ascent = style?.ascent || FALLBACK_ASCENT;
    const descent = style?.descent || FALLBACK_DESCENT;
    const rotated = Math.abs(t[1]) > 1e-6 || Math.abs(t[2]) > 1e-6;
    const name = fontNames[item.fontName] ?? item.fontName;
    runs.push({
      str: item.str,
      x: t[4],
      y: t[5] + descent * size,
      w: item.width,
      h: (ascent - descent) * size,
      baseline: t[5],
      size,
      font: rotated ? `${name} rotated` : name,
      item: index,
    });
  });
  return runs;
}

/** Per code point boxes by proportional advance (standard widths, see advance.ts) (blank code points carry no ink and get no box). */
export function splitGlyphs(run: TextRun): GlyphBox[] {
  const chars = Array.from(run.str);
  const { offsets, widths } = charSpans(chars, run.w);
  const out: GlyphBox[] = [];
  chars.forEach((ch, i) => {
    if (WHITESPACE.test(ch)) return;
    out.push({
      x: run.x + offsets[i],
      y: run.y,
      w: widths[i],
      h: run.h,
      ch,
      cp: ch.codePointAt(0) ?? 0,
      item: run.item,
      baseline: run.baseline,
      size: run.size,
      font: run.font,
    });
  });
  return out;
}
