import {
  PDFDict,
  PDFName,
  StandardFonts,
  type PDFDocument,
  type PDFPage,
} from 'pdf-lib';
import { formatNumber as n } from '@/pdf/edit/content/serialize';
import { fromLatin1 } from '@/pdf/edit/content/tokens';
import { pageContentBytes } from './page';
import { rgbOf, textColour, type RedactMark } from './mark-style';

export { rgbOf, textColour, type RedactMark } from './mark-style';

const rg = ([r, g, b]: [number, number, number]) =>
  `${n(r / 255)} ${n(g / 255)} ${n(b / 255)} rg`;

/** A private copy of the page's (possibly inherited) resources. */
export function privateResources(doc: PDFDocument, page: PDFPage): PDFDict {
  const res = page.node.Resources();
  const copy = res ? res.clone(doc.context) : doc.context.obj({});
  page.node.set(PDFName.of('Resources'), copy);
  return copy;
}

/**
 * Draws the redaction fills (and fitted overlay text) over the page: the
 * existing content is wrapped in q/Q so its graphics state cannot leak.
 * `only` draws just the fills or just the overlay text.
 */
export async function drawFills(
  doc: PDFDocument,
  page: PDFPage,
  marks: readonly RedactMark[],
  only?: 'fills' | 'text',
): Promise<void> {
  const parts: string[] = [];
  const texts = only === 'fills' ? [] : marks.filter((m) => m.overlayText);
  let fontName = '';
  let font: Awaited<ReturnType<PDFDocument['embedFont']>> | null = null;
  const res = privateResources(doc, page);
  if (texts.length) {
    font = await doc.embedFont(StandardFonts.Helvetica);
    const fonts = res.lookupMaybe(PDFName.of('Font'), PDFDict);
    const fontDict = fonts ? fonts.clone(doc.context) : doc.context.obj({});
    res.set(PDFName.of('Font'), fontDict);
    let k = 0;
    while (fontDict.has(PDFName.of(`RdF${k}`))) k++;
    fontName = `RdF${k}`;
    fontDict.set(PDFName.of(fontName), font.ref);
  }
  const angle = page.getRotation().angle % 360;
  const rad = (angle * Math.PI) / 180;
  const [cos, sin] = [Math.cos(rad), Math.sin(rad)].map((v) =>
    Math.abs(v) < 1e-9 ? 0 : v,
  );
  for (const m of marks) {
    const { x, y, width, height } = m.box;
    if (only !== 'text')
      parts.push(
        `q ${rg(rgbOf(m.fill))} ${n(x)} ${n(y)} ${n(width)} ${n(height)} re f Q`,
      );
    if (!m.overlayText || !font) continue;
    const upright = angle === 90 || angle === 270;
    const [w, h] = upright ? [height, width] : [width, height];
    const unit = font.widthOfTextAtSize(m.overlayText, 1);
    const size = Math.min(h * 0.6, (w * 0.9) / unit);
    if (!(size >= 2)) continue;
    const tw = unit * size;
    // Centre of the mark; the text runs along the page's reading direction.
    const cx = x + width / 2;
    const cy = y + height / 2;
    const dx = -tw / 2;
    const dy = -size * 0.35;
    const ox = cx + dx * cos - dy * sin;
    const oy = cy + dx * sin + dy * cos;
    const hex = font.encodeText(m.overlayText).toString();
    parts.push(
      `q ${rg(textColour(m.fill))} BT /${fontName} ${n(size)} Tf ${n(cos)} ${n(sin)} ${n(-sin)} ${n(cos)} ${n(ox)} ${n(oy)} Tm ${hex} Tj ET Q`,
    );
  }
  const before = pageContentBytes(doc, page) ?? new Uint8Array(0);
  const head = fromLatin1('q\n');
  const tail = fromLatin1(`\nQ\n${parts.join('\n')}\n`);
  const all = new Uint8Array(head.length + before.length + tail.length);
  all.set(head, 0);
  all.set(before, head.length);
  all.set(tail, head.length + before.length);
  page.node.set(
    PDFName.of('Contents'),
    doc.context.register(doc.context.flateStream(all)),
  );
}
