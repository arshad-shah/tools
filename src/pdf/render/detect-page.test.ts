import { describe, expect, it } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { OpsTable } from '@/pdf/detect';
import {
  makeComplexPagePdf,
  makeFlatFormWord,
  makeNegativeReport,
} from '../../../test/fixtures/flat-form';
import { detectFromPage, summarise, type DetectPageLike } from './detect-page';

async function detect(bytes: Uint8Array, pageIndex = 0) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const page = await (await task.promise).getPage(pageIndex + 1);
    return await detectFromPage(
      page as unknown as DetectPageLike,
      pageIndex,
      OPS as unknown as OpsTable,
    );
  } finally {
    await task.destroy();
  }
}

describe('detectFromPage (render worker)', () => {
  it('finds the fields and table cells of a flat form page', async () => {
    const { bytes } = await makeFlatFormWord();
    const d = await detect(bytes);
    expect(d.skipped).toBeNull();
    expect(
      d.fields.filter((f) => f.status === 'field').length,
    ).toBeGreaterThanOrEqual(10);
    expect(d.cells.length).toBeGreaterThan(10);
    expect(d.fields.some((f) => f.label === 'Surname')).toBe(true);
  });

  it('skips a page over the path budget', async () => {
    const d = await detect(await makeComplexPagePdf());
    expect(d).toMatchObject({ skipped: 'too-complex', fields: [], cells: [] });
  });

  it('summarises sampled pages, extrapolated', async () => {
    const { bytes } = await makeFlatFormWord();
    const pages = [await detect(bytes, 0), await detect(bytes, 1)];
    const s = summarise(6, pages, { hasAcroForm: false, hasXfa: false }, true);
    expect(s.sampled).toBe(2);
    expect(s.flatForm).toBe(true);
    expect(s.estimatedFields).toBe(Math.round((s.fields / 2) * 6));
    const neg = summarise(
      1,
      [await detect(await makeNegativeReport())],
      { hasAcroForm: false, hasXfa: false },
      true,
    );
    expect(neg.flatForm).toBe(false);
  });
});
