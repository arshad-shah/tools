import { degrees, rgb, StandardFonts, type PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import type { FontCache } from './font-cache';
import { FontStack } from './font-stack';
import { unsupportedChars } from './fonts';
import { pageFrame, selectPages, type PageSelection } from './geometry';
import {
  formatHeaderFooter,
  headerFooterPlacements,
  type HeaderFooterLayout,
} from './markup-layout';

export { formatHeaderFooter } from './markup-layout';

export interface HeaderFooterOptions extends HeaderFooterLayout {
  color: string;
  pages: PageSelection;
  /** Token values: the document name and the date the op was made. */
  filename: string;
  date: Date;
  locale?: string;
}

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

/**
 * Left, centre and right header and footer text on the selected pages,
 * anchored to the visual page edges (rotation-aware). Helvetica, falling
 * back to the Unicode font (itself falling back per character) when the
 * text needs characters it lacks.
 */
export async function headerFooterDoc(
  doc: PDFDocument,
  o: HeaderFooterOptions,
  fonts?: FontCache,
): Promise<void> {
  if (!(o.fontSize >= 4 && o.fontSize <= 72))
    throw invalid('Font size must be between 4 and 72');
  for (const m of [o.margin.top, o.margin.bottom, o.margin.side])
    if (!(m >= 0 && m <= 500))
      throw invalid('Margins must be between 0 and 500 points');
  const color = hexToRgb(o.color);
  const total = doc.getPageCount();
  const pages = selectPages(o.pages, total);
  const helvetica = doc.embedStandardFont(StandardFonts.Helvetica);
  for (const i of pages) {
    const fill = (t: string) =>
      formatHeaderFooter(t, {
        n: i + 1,
        total,
        date: o.date,
        filename: o.filename,
        locale: o.locale ?? 'en-GB',
      });
    const slots = (s: HeaderFooterLayout['header']) => ({
      left: fill(s.left),
      center: fill(s.center),
      right: fill(s.right),
    });
    const filled = { ...o, header: slots(o.header), footer: slots(o.footer) };
    const all = [filled.header, filled.footer]
      .flatMap((s) => [s.left, s.center, s.right])
      .join('');
    let font = new FontStack([helvetica]);
    if (unsupportedChars(helvetica, all).length) {
      if (!fonts)
        throw invalid(
          'The header or footer has characters Helvetica cannot draw',
        );
      font = await fonts.forText({ unicode: true }, all);
      font.assertDrawable(all, 'The header or footer');
    }
    const page = doc.getPage(i);
    const placed = headerFooterPlacements(pageFrame(page), filled, {
      width: (t, size) => font.widthOfTextAtSize(t, size),
      height: (size) => font.heightAtSize(size, { descender: false }),
    });
    for (const p of placed) {
      // Runs advance along the text's own direction.
      const rad = (p.rotate * Math.PI) / 180;
      let along = 0;
      for (const run of font.runs(p.text)) {
        page.drawText(run.text, {
          x: p.x + along * Math.cos(rad),
          y: p.y + along * Math.sin(rad),
          size: p.size,
          font: run.font,
          color: rgb(color.r, color.g, color.b),
          rotate: degrees(p.rotate),
        });
        along += run.font.widthOfTextAtSize(run.text, p.size);
      }
    }
  }
}
