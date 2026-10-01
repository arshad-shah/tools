import { describe, expect, it } from 'vitest';
import { MAX_CANVAS_PIXELS } from '@/pdf/render';
import {
  estimateExportBytes,
  imageFileName,
  LARGE_EXPORT_BYTES,
  pagesToExport,
} from './plan';

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

describe('estimateExportBytes', () => {
  const letter = { width: 612, height: 792 };
  it('estimates about half a byte per output pixel', () => {
    // 1275 × 1650 px at 150 DPI.
    expect(estimateExportBytes([letter], [0], 150)).toBeCloseTo(
      (612 * 792 * (150 / 72) ** 2) / 2,
      -3,
    );
  });
  it('counts each capped page at the canvas limit at most', () => {
    const a0 = { width: 2384, height: 3370 };
    expect(estimateExportBytes([a0], [0], 300)).toBeLessThanOrEqual(
      MAX_CANVAS_PIXELS / 2,
    );
  });
  it('flags 300 pages at 300 DPI as a large export', () => {
    const pages = Array.from({ length: 300 }, () => letter);
    const bytes = estimateExportBytes(
      pages,
      pages.map((_, i) => i),
      300,
    );
    expect(bytes).toBeGreaterThan(LARGE_EXPORT_BYTES);
    expect(estimateExportBytes(pages, [0, 1, 2], 300)).toBeLessThan(
      LARGE_EXPORT_BYTES,
    );
  });
});
