import { PDFName } from 'pdf-lib';
import { loadPdf } from '@/pdf/edit/load';
import { formatNumber as n } from '@/pdf/edit/content/serialize';
import { removeAnnotations } from './annots';
import { drawFills, type RedactMark } from './fill';

/**
 * Replaces one page's content by an image of itself (rendered unrotated
 * over its CropBox with the marks burned in): same MediaBox, CropBox and
 * Rotate; fonts and other resources dropped; annotations under the marks
 * removed; fills and overlay text drawn on top again.
 */
export async function replaceWithImage(
  bytes: Uint8Array,
  pageIndex: number,
  image: Uint8Array,
  mime: 'image/png' | 'image/jpeg',
  marks: readonly RedactMark[],
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const page = doc.getPage(pageIndex);
  const img =
    mime === 'image/png'
      ? await doc.embedPng(image)
      : await doc.embedJpg(image);
  const { x, y, width, height } = page.getCropBox();
  page.node.set(
    PDFName.of('Resources'),
    doc.context.obj({ XObject: { Im0: img.ref } }),
  );
  page.node.set(
    PDFName.of('Contents'),
    doc.context.register(
      doc.context.flateStream(
        `q ${n(width)} 0 0 ${n(height)} ${n(x)} ${n(y)} cm /Im0 Do Q`,
      ),
    ),
  );
  for (const k of ['Group', 'StructParents', 'Thumb', 'PieceInfo'])
    page.node.delete(PDFName.of(k));
  removeAnnotations(
    doc,
    page,
    marks.map((m) => m.box),
  );
  await drawFills(doc, page, marks);
  return doc.save({ useObjectStreams: true });
}
