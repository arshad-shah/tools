import { describe, expect, it } from 'vitest';
import {
  makeEncryptMarkedPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { getPageCount, loadPdf } from './load';

describe('loadPdf', () => {
  it('loads a valid PDF', async () => {
    expect(
      (await loadPdf(await makeTextPdf({ pages: 2 }))).getPageCount(),
    ).toBe(2);
  });
  it('rejects encrypted PDFs with ENCRYPTED', async () => {
    await expect(loadPdf(await makeEncryptMarkedPdf())).rejects.toMatchObject({
      code: 'ENCRYPTED',
      message:
        'This PDF is password-protected. Encrypted files are not supported by this tool yet.',
    });
  });
  it('rejects a header followed by garbage with INVALID_FILE', async () => {
    const garbage = new TextEncoder().encode(
      '%PDF-1.7\nthis is not a pdf body at all',
    );
    await expect(loadPdf(garbage)).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
  it('rejects a truncated PDF with INVALID_FILE', async () => {
    const bytes = await makeTextPdf({ pages: 2 });
    await expect(loadPdf(bytes.slice(0, 200))).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
  it('counts pages', async () => {
    expect(await getPageCount(await makeTextPdf({ pages: 4 }))).toBe(4);
  });
});
