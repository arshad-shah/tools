import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { pageViewport, toPage } from '@/pdf/doc/geometry';
import { fmt, loadPdf, normalizeRotation } from '@/pdf/edit';
import type { OcrWord } from './pool';

/** Recognised words of one page, as rendered for recognition. */
export interface PageWords {
  pageIndex: number;
  words: OcrWord[];
  /** Size of the image the boxes refer to, in pixels. */
  imageWidth: number;
  imageHeight: number;
  /** DPI the page was rendered at (the page's own /Rotate applied). */
  dpi: number;
}

export interface TextLayerResult {
  bytes: Uint8Array;
  /** Characters no font could draw, per page index (pages with none omitted). */
  skippedChars: Record<number, number>;
}

/** pdf.js `page.view`: the CropBox (MediaBox when absent), unrotated. */
function viewOf(page: PDFPage): [number, number, number, number] {
  const b = page.getCropBox();
  return [b.x, b.y, b.x + b.width, b.y + b.height];
}

/** Fonts embedded on first use, so an unused fallback adds nothing. */
class Fonts {
  private readonly embedded: (Promise<PDFFont> | null)[];
  private readonly charsets: Set<number>[] = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly files: Uint8Array[],
  ) {
    this.embedded = files.map(() => null);
  }

  async init(): Promise<void> {
    this.doc.registerFontkit(fontkit);
    for (const file of this.files) {
      const f = fontkit.create(file as unknown as Buffer);
      this.charsets.push(new Set(f.characterSet));
    }
  }

  /** Index of the first font with a glyph for `ch`, or -1. */
  fontFor(ch: string): number {
    const cp = ch.codePointAt(0)!;
    return this.charsets.findIndex((s) => s.has(cp));
  }

  get(i: number): Promise<PDFFont> {
    this.embedded[i] ??= this.doc.embedFont(this.files[i], { subset: true });
    return this.embedded[i];
  }
}

/** Consecutive characters drawn with the same font. */
interface Run {
  font: number;
  text: string;
}

function splitRuns(
  text: string,
  fonts: Fonts,
): { runs: Run[]; skipped: number } {
  const runs: Run[] = [];
  let skipped = 0;
  for (const ch of text) {
    const font = fonts.fontFor(ch);
    if (font < 0) {
      skipped += 1;
      continue;
    }
    const last = runs.at(-1);
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  }
  return { runs, skipped };
}

/**
 * Adds an invisible text layer (spec 11) over each listed page: one text
 * object per word in render mode 3, its font size matched to the box height
 * and its horizontal scaling to the box width, so selection and search line
 * up with the image. Appended as a separate content stream; the page's own
 * streams are kept byte for byte. `fonts` are tried in order per character
 * (Noto Sans latin, then latin-ext); characters none can draw are skipped
 * and counted.
 */
export async function writeTextLayer(
  bytes: Uint8Array,
  pages: PageWords[],
  fonts: Uint8Array[],
): Promise<TextLayerResult> {
  const doc = await loadPdf(bytes);
  const set = new Fonts(doc, fonts);
  await set.init();
  const skippedChars: Record<number, number> = {};

  for (const p of pages) {
    const page = doc.getPage(p.pageIndex);
    const vp = pageViewport(
      {
        view: viewOf(page),
        rotate: normalizeRotation(page.getRotation().angle),
      },
      0,
      p.dpi / 72,
    );
    // Image px to viewport px (the render rounds the canvas size).
    const kx = vp.width / p.imageWidth;
    const ky = vp.height / p.imageHeight;
    const at = (x: number, y: number) => toPage(vp, x * kx, y * ky);
    const names = new Map<number, string>();
    const nameOf = async (i: number) => {
      let name = names.get(i);
      if (!name) {
        name = page.node
          .newFontDictionary('FOCR', (await set.get(i)).ref)
          .asString();
        names.set(i, name);
      }
      return name;
    };
    const primary = await set.get(0);
    const full = primary.heightAtSize(1) || 1;
    const descent = full - primary.heightAtSize(1, { descender: false });

    const ops: string[] = ['q', 'BT', '3 Tr'];
    let skipped = 0;
    let drawn = 0;
    for (const w of p.words) {
      const text = w.text.trim();
      if (!text) continue;
      const { runs, skipped: s } = splitRuns(text, set);
      skipped += s;
      if (runs.length === 0) continue;
      // Baseline from the box's bottom edge; "up" from its left edge.
      const [x0, y0] = at(w.bbox.x0, w.bbox.y1);
      const [x1, y1] = at(w.bbox.x1, w.bbox.y1);
      const [xt, yt] = at(w.bbox.x0, w.bbox.y0);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const height = Math.hypot(xt - x0, yt - y0);
      if (len < 0.5 || height < 0.5) continue;
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      // Full font height (ascender to descender) fills the box.
      const size = height / full;
      let natural = 0;
      for (const r of runs)
        natural += (await set.get(r.font)).widthOfTextAtSize(r.text, size);
      const tz = natural > 0 ? (100 * len) / natural : 100;
      // The baseline sits the descent above the box bottom; up is (-uy, ux).
      const ox = x0 - uy * descent * size;
      const oy = y0 + ux * descent * size;
      ops.push(
        `${fmt(tz)} Tz`,
        `${fmt(ux)} ${fmt(uy)} ${fmt(-uy)} ${fmt(ux)} ${fmt(ox)} ${fmt(oy)} Tm`,
      );
      for (const r of runs) {
        const font = await set.get(r.font);
        ops.push(
          `${await nameOf(r.font)} ${fmt(size)} Tf`,
          `${font.encodeText(r.text).toString()} Tj`,
        );
      }
      drawn += 1;
    }
    ops.push('ET', 'Q');
    if (skipped > 0) skippedChars[p.pageIndex] = skipped;
    if (drawn === 0) continue;
    // A separate stream: the page's own streams stay untouched (pdf-lib
    // wraps them in q/Q so their state cannot leak into this one).
    page.node.addContentStream(
      doc.context.register(doc.context.flateStream(ops.join('\n'))),
    );
  }
  return { bytes: await doc.save(), skippedChars };
}
