import { readFileSync } from 'node:fs';
import { degrees, PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { encodePng } from './images';

/*
 * Image-only pages for OCR tests (plan F-4, F-5): each page is one raster
 * image filling the page, with no text layer, as a scanner produces.
 */

/** Light-grey paper with dark horizontal rules, RGBA. */
function paper(width: number, height: number): Uint8Array {
  const px = new Uint8Array(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    const rule = y % 40 === 20 || y % 40 === 21;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const v =
        rule && x > 10 && x < width - 10 ? 40 : 245 - ((x * 7 + y * 3) % 9);
      px[i] = px[i + 1] = px[i + 2] = v;
    }
  }
  return px;
}

/** Image-only pages; `rotate` sets each page's /Rotate (default 0). */
export async function makeScanPdf({
  rotate = [0],
}: { rotate?: number[] } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(encodePng(306, 396, paper(306, 396)));
  for (const r of rotate) {
    const page = doc.addPage([612, 792]);
    page.drawImage(png, { x: 0, y: 0, width: 612, height: 792 });
    page.setRotation(degrees(r));
  }
  return doc.save();
}

const FONT_DIR = 'node_modules/@fontsource/noto-sans/files';
/** The OCR text-layer fonts, as the edit worker loads them. */
export const ocrFonts = (): Uint8Array[] =>
  ['latin', 'latin-ext'].map(
    (s) =>
      new Uint8Array(
        readFileSync(`${FONT_DIR}/noto-sans-${s}-400-normal.woff`),
      ),
  );

/** One page rendered with pdf.js in Node (RGBA), for pixel comparisons. */
export async function renderPageRgba(
  bytes: Uint8Array,
  pageIndex: number,
  scale = 1,
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const factory = (
      pdf as unknown as {
        canvasFactory: {
          create(
            w: number,
            h: number,
          ): { canvas: unknown; context: CanvasRenderingContext2D };
        };
      }
    ).canvasFactory;
    const { canvas, context } = factory.create(width, height);
    await page.render({
      canvas: canvas as HTMLCanvasElement,
      canvasContext: context,
      viewport,
    }).promise;
    return {
      width,
      height,
      data: context.getImageData(0, 0, width, height).data,
    };
  } finally {
    await task.destroy();
  }
}

/** pdf.js text items of one page, in page space. */
export async function pageTextItems(bytes: Uint8Array, pageIndex: number) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const { items } = await page.getTextContent();
    return items
      .filter(
        (
          i,
        ): i is typeof i & {
          str: string;
          transform: number[];
          width: number;
        } => 'str' in i && i.str.trim() !== '',
      )
      .map((i) => ({ str: i.str, transform: i.transform, width: i.width }));
  } finally {
    await task.destroy();
  }
}
