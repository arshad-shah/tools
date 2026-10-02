import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFPage,
  PDFRef,
  rgb,
  StandardFonts,
  type PDFDocument,
} from 'pdf-lib';
import type { Box } from '@/pdf/edit/draw';

/** Draws the visual signature into `box` on a scratch page (page space, y up). */
export type PaintVisual = (page: PDFPage, box: Box) => Promise<void>;

/** Share of the appearance height the visual signature takes when captioned. */
const VISUAL_SHARE = 0.75;

/**
 * The widget's normal appearance (a Form XObject, /BBox [0 0 w h]). The
 * visual is drawn with the same writers as page content on a scratch page
 * that never joins the page tree, then embedded; a caption ("Digitally
 * signed by {name}" and the date, Helvetica 6 to 8pt) goes below it. An
 * invisible signature gets an empty /BBox [0 0 0 0].
 */
export async function buildAppearance(
  doc: PDFDocument,
  rect: Box | null,
  paint: PaintVisual | null,
  caption: { name: string; date: string } | null,
): Promise<PDFRef> {
  if (!rect || rect.width <= 0 || rect.height <= 0)
    return doc.context.register(
      doc.context.formXObject([], { BBox: [0, 0, 0, 0] }),
    );
  const { width: w, height: h } = rect;
  const page = PDFPage.create(doc);
  page.setSize(w, h);
  const visualH = caption ? h * VISUAL_SHARE : h;
  if (paint)
    await paint(page, { x: 0, y: h - visualH, width: w, height: visualH });
  if (caption) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const room = h - visualH;
    const size = Math.max(4, Math.min(8, room / 2.6));
    const lines = [`Digitally signed by ${caption.name}`, caption.date];
    lines.forEach((line, i) => {
      // Shrink a long line to fit the width rather than cutting it.
      const s = Math.min(
        size,
        (w - 2) / Math.max(1, font.widthOfTextAtSize(line, 1)),
      );
      page.drawText(line, {
        x: 1,
        y: room - (i + 1) * size * 1.15 + size * 0.15,
        size: s,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
  }
  const embedded = await doc.embedPage(page);
  // pdf-lib embeds lazily: copy the content now, before the page goes.
  await doc.flush();
  // The scratch page and its content streams are not needed in the file.
  const contents = page.node.get(PDFName.of('Contents'));
  if (contents instanceof PDFRef) doc.context.delete(contents);
  else if (contents instanceof PDFArray)
    for (const c of contents.asArray())
      if (c instanceof PDFRef) doc.context.delete(c);
  doc.context.delete(page.ref);
  const xobject = doc.context.lookup(embedded.ref);
  if (xobject && 'dict' in xobject) {
    const dict = (xobject as { dict: PDFDict }).dict;
    dict.set(PDFName.of('BBox'), doc.context.obj([0, 0, w, h]));
    dict.delete(PDFName.of('Matrix'));
  }
  return embedded.ref;
}
