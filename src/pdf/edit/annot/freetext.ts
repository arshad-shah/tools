import {
  PDFName,
  PDFString,
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib';
import type { Box } from '../draw';
import { fitText, type FittedText } from '../draw-fit';
import { assertDrawable } from '../fonts';
import {
  appearanceStream,
  fmt,
  opacityState,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, textString, type AnnotBase } from './common';
import { FREETEXT_LINE_HEIGHT, FREETEXT_PAD } from './geometry';

export interface FreeTextParams extends AnnotBase {
  rect: Box;
  text: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
  border: boolean;
}

export { FREETEXT_LINE_HEIGHT, FREETEXT_PAD } from './geometry';

const QUADDING = { left: 0, center: 1, right: 2 } as const;

/** The wrapped lines and size the appearance draws (shared with the overlay). */
export function freeTextLayout(
  font: PDFFont,
  p: Pick<FreeTextParams, 'rect' | 'text' | 'fontSize'>,
): FittedText {
  const inner: Box = {
    x: p.rect.x + FREETEXT_PAD,
    y: p.rect.y + FREETEXT_PAD,
    width: Math.max(0, p.rect.width - 2 * FREETEXT_PAD),
    height: Math.max(0, p.rect.height - 2 * FREETEXT_PAD),
  };
  return fitText(font, p.text, inner, {
    size: p.fontSize,
    minSize: Math.min(6, p.fontSize),
    multiline: true,
    lineHeight: FREETEXT_LINE_HEIGHT,
  });
}

/**
 * A text comment (/FreeText) in Helvetica with /DA, /Q, /DS and an
 * appearance that wraps the text inside the rect.
 */
export function writeFreeText(
  doc: PDFDocument,
  page: PDFPage,
  p: FreeTextParams,
): PDFRef {
  const font = doc.embedStandardFont(StandardFonts.Helvetica);
  assertDrawable(font, p.text.replace(/\r?\n/g, ''), 'The comment');
  const { size, lines } = freeTextLayout(font, p);
  const dict = baseAnnot(doc, page, 'FreeText', p.rect, {
    ...p,
    contents: p.text,
  });
  const color = rgbOps(p.color, false);
  dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${fmt(size)} Tf ${color}`));
  dict.set(PDFName.of('Q'), doc.context.obj(QUADDING[p.align]));
  dict.set(
    PDFName.of('DS'),
    textString(
      `font: Helvetica ${fmt(size)}pt; text-align:${p.align}; color:${p.color}`,
    ),
  );
  dict.set(PDFName.of('BS'), doc.context.obj({ W: p.border ? 1 : 0, S: 'S' }));
  setAppearance(
    dict,
    appearanceStream(doc, p.rect, ...freeTextAppearance(font, p, size, lines)),
  );
  return addToPage(doc, page, dict);
}

/** Border and wrapped Helvetica lines (/Helv) for a free-text appearance. */
export function freeTextAppearance(
  font: PDFFont,
  p: Pick<FreeTextParams, 'rect' | 'color' | 'opacity' | 'align' | 'border'>,
  size: number,
  lines: readonly string[],
): [string, Record<string, unknown>] {
  const color = rgbOps(p.color, false);
  const { x, y, width, height } = p.rect;
  const ops = ['q', '/GS0 gs'];
  if (p.border)
    ops.push(
      rgbOps(p.color, true),
      '1 w',
      `${fmt(x + 0.5)} ${fmt(y + 0.5)} ${fmt(width - 1)} ${fmt(height - 1)} re S`,
    );
  const lineH = size * FREETEXT_LINE_HEIGHT;
  const ascent = font.heightAtSize(size, { descender: false });
  const glyphH = font.heightAtSize(size);
  const top = y + height - FREETEXT_PAD;
  const innerW = width - 2 * FREETEXT_PAD;
  ops.push('BT', color, `/Helv ${fmt(size)} Tf`);
  lines.forEach((line, i) => {
    const w = font.widthOfTextAtSize(line, size);
    const lx =
      x +
      FREETEXT_PAD +
      (p.align === 'center'
        ? (innerW - w) / 2
        : p.align === 'right'
          ? innerW - w
          : 0);
    const ly = top - i * lineH - (lineH - glyphH) / 2 - ascent;
    ops.push(
      `1 0 0 1 ${fmt(lx)} ${fmt(ly)} Tm`,
      `${font.encodeText(line).toString()} Tj`,
    );
  });
  ops.push('ET', 'Q');
  return [
    ops.join('\n'),
    { Font: { Helv: font.ref }, ExtGState: { GS0: opacityState(p.opacity) } },
  ];
}
