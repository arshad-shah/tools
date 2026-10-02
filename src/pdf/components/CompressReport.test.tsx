/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CompressReport } from '@/pdf/compress/pipeline';
import { CompressReportView } from './CompressReport';

const report: CompressReport = {
  inputSize: 4096,
  outputSize: 1024,
  stages: [
    { id: 'images', label: 'Images', before: 4096, after: 2048 },
    {
      id: 'restructure',
      label: 'Restructure (qpdf)',
      before: 2048,
      after: 1024,
    },
  ],
  images: {
    total: 3,
    processed: 2,
    unchanged: 0,
    skipped: [{ reason: 'CMYK colour', count: 1 }],
    bytesBefore: 3000,
    bytesAfter: 1000,
    grayToRgb: 0,
  },
  warnings: ['object 3 0: bad length'],
  keptOriginal: false,
};

describe('CompressReportView', () => {
  it('lists every stage, the image summary and the warnings', () => {
    render(<CompressReportView report={report} />);
    expect(screen.getByRole('cell', { name: 'Images' })).toBeTruthy();
    expect(
      screen.getByRole('cell', { name: 'Restructure (qpdf)' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Images: 2 recompressed, 0 already optimal, 1 left untouched',
      ),
    ).toBeTruthy();
    expect(screen.getByText('CMYK colour (1)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Warnings (1)' })).toBeTruthy();
  });
});
