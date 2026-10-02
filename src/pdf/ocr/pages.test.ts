import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeTextPdf } from '../../../test/fixtures/builders';
import { makeScanPdf } from '../../../test/fixtures/scan';
import type { PageGeom } from '@/pdf/doc/types';
import type { PageTextItems } from '@/pdf/render/handlers';
import { textItemsFrom } from '@/pdf/render/text';
import { glyphCoverage, pagesNeedingOcr } from './pages';

async function firstPage(
  bytes: Uint8Array,
): Promise<{ text: PageTextItems; geom: PageGeom }> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const page = await (await task.promise).getPage(1);
    return {
      text: textItemsFrom(
        await page.getTextContent({ includeMarkedContent: false }),
      ),
      geom: { view: page.view as PageGeom['view'], rotate: 0 },
    };
  } finally {
    await task.destroy();
  }
}

const GEOM: PageGeom = { view: [0, 0, 100, 100], rotate: 0 };
const items = (...runs: [string, number, number][]): PageTextItems => ({
  items: runs.map(([str, width, height]) => ({
    str,
    transform: [height, 0, 0, height, 0, 0],
    width,
    height,
    fontName: 'f',
    hasEOL: false,
  })),
  styles: {},
});

describe('glyphCoverage', () => {
  it('is above 1% on a text page and 0 on a scan', async () => {
    const text = await firstPage(
      await makeTextPdf({ label: 'Some words on a page' }),
    );
    expect(glyphCoverage(text.text, text.geom)).toBeGreaterThan(0.01);
    const scan = await firstPage(await makeScanPdf());
    expect(glyphCoverage(scan.text, scan.geom)).toBe(0);
  });

  it('sums run boxes over the page area and ignores blank runs', () => {
    expect(
      glyphCoverage(items(['ab', 10, 10], [' ', 50, 50], ['c', 20, 5]), GEOM),
    ).toBe(0.02);
  });
});

describe('pagesNeedingOcr', () => {
  const pages = [
    { index: 0, text: items(['Plenty of text', 60, 10]), geom: GEOM },
    { index: 1, text: items(), geom: GEOM },
    { index: 2, text: items(['p', 2, 2]), geom: GEOM },
  ];
  it('auto: no text layer or under 1% coverage', () => {
    expect(pagesNeedingOcr(pages, 'auto')).toEqual([1, 2]);
  });
  it('force: every page', () => {
    expect(pagesNeedingOcr(pages, 'force')).toEqual([0, 1, 2]);
  });
  it('explicit: the listed pages in document order', () => {
    expect(pagesNeedingOcr(pages, [2, 0, 9])).toEqual([0, 2]);
  });
});
