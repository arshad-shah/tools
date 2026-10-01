import { describe, expect, it } from 'vitest';
import { imageFileName, pagesToExport } from './plan';

describe('pdf-to-images plan', () => {
  it('exports every page when the field is blank', () => {
    expect(pagesToExport('  ', 3)).toEqual([0, 1, 2]);
  });
  it('dedupes and sorts ranges', () => {
    expect(pagesToExport('3, 1-2, 2', 3)).toEqual([0, 1, 2]);
  });
  it('reports range errors precisely', () => {
    expect(() => pagesToExport('5', 3)).toThrow('Page 5 is out of range (1–3)');
  });
  it('pads page numbers to the document width and uses .jpg for JPEG', () => {
    expect(imageFileName('report.pdf', 0, 12, 'png')).toBe(
      'report.page-01.png',
    );
    expect(imageFileName('report.pdf', 11, 12, 'jpeg')).toBe(
      'report.page-12.jpg',
    );
  });
});
