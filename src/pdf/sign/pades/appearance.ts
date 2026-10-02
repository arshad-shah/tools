import {
  concatTransformationMatrix,
  PDFArray,
  PDFDict,
  PDFName,
  PDFPage,
  PDFRef,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
  type PDFDocument,
} from 'pdf-lib';
import type { Box } from '@/pdf/edit/draw';

/** Draws the visual signature into `box` on a scratch page (page space, y up). */
export type PaintVisual = (page: PDFPage, box: Box) => Promise<void>;

/**
 * Upright frame to page space for a page shown turned clockwise by the key:
 * the content is turned the other way (counter-clockwise in y-up space) by
 * the same angle, so the reader sees it upright. `pw` and `ph` are the
 * appearance box's page-space sides.
 */
const TURNS: Record<
  number,
  (pw: number, ph: number) => ReturnType<typeof concatTransformationMatrix>
> = {
  90: (pw) => concatTransformationMatrix(0, 1, -1, 0, pw, 0),
  180: (pw, ph) => concatTransformationMatrix(-1, 0, 0, -1, pw, ph),
  270: (_pw, ph) => concatTransformationMatrix(0, -1, 1, 0, 0, ph),
};

/** Share of the appearance height the visual signature takes when captioned. */
const VISUAL_SHARE = 0.75;

/**
 * The widget's normal appearance (a Form XObject, /BBox [0 0 w h]). The
 * visual is drawn with the same writers as page content on a scratch page
 * that never joins the page tree, then embedded; a caption ("Digitally
 * signed by {name}" and the date, Helvetica 6 to 8pt) goes below it. An
 * invisible signature gets an empty /BBox [0 0 0 0].
 *
 * `pageRotation` is the page's /Rotate: the whole layout (visual above,
 * caption below) is made in the frame the reader sees and turned into page
 * space, so the caption reads upright under the visual on a turned page.
 */
export async function buildAppearance(
  doc: PDFDocument,
  rect: Box | null,
  paint: PaintVisual | null,
  caption: { name: string; date: string } | null,
  pageRotation = 0,
): Promise<PDFRef> {
  if (!rect || rect.width <= 0 || rect.height <= 0)
    return doc.context.register(
      doc.context.formXObject([], { BBox: [0, 0, 0, 0] }),
    );
  const page = PDFPage.create(doc);
  page.setSize(rect.width, rect.height);
  const r = (((Math.round(pageRotation / 90) * 90) % 360) + 360) % 360;
  // The upright frame: a quarter turn swaps the sides as the reader sees them.
  const [w, h] =
    r % 180 === 90 ? [rect.height, rect.width] : [rect.width, rect.height];
  const turn = TURNS[r]?.(rect.width, rect.height);
  if (turn) page.pushOperators(pushGraphicsState(), turn);
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
  if (turn) page.pushOperators(popGraphicsState());
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
    dict.set(
      PDFName.of('BBox'),
      doc.context.obj([0, 0, rect.width, rect.height]),
    );
    dict.delete(PDFName.of('Matrix'));
  }
  return embedded.ref;
}
