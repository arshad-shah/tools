/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRESETS, type CompressReport } from '@/pdf/compress/pipeline';
import type { DocumentApi } from '../types';
import { KEPT_ORIGINAL } from '@/pdf/doc/checkpoints/optimize';
import { CompressPanel } from './CompressPanel';
import { useOptimizeSettings } from './settings-store';

const keptReport: CompressReport = {
  inputSize: 2048,
  outputSize: 2048,
  stages: [
    {
      id: 'restructure',
      label: 'Restructure (qpdf)',
      before: 2048,
      after: 2100,
    },
  ],
  images: null,
  warnings: [],
  keptOriginal: true,
};

function fakeDoc(opType: string | null = null) {
  const runCheckpoint = vi.fn(async () => null);
  const doc = {
    runCheckpoint,
    view: { checkpoint: 'c1' },
    state: {
      checkpoints: [
        { id: 'c0', opId: null },
        {
          id: 'c1',
          opId: 'op1',
          report: {
            title:
              opType === 'optimize.compress'
                ? KEPT_ORIGINAL
                : 'Rewrote the file: no problems found',
            lines: ['Size: 2.0 KB to 2.0 KB'],
            warnings: [],
            details: keptReport,
          },
        },
      ],
      log: opType ? [{ id: 'op1', type: opType }] : [],
    },
  } as unknown as DocumentApi;
  return { doc, runCheckpoint };
}

beforeEach(() => useOptimizeSettings.getState().choosePreset('balanced'));

describe('CompressPanel', () => {
  it('compresses with the chosen preset', () => {
    const { doc, runCheckpoint } = fakeDoc();
    render(<CompressPanel doc={doc} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Strong' }));
    expect(
      screen.getByText(/Downsamples images above 96 DPI at 60% quality/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Compress' }));
    expect(runCheckpoint).toHaveBeenCalledWith(
      'optimize.compress',
      { preset: 'strong', settings: PRESETS.strong },
      { title: 'Compressing' },
    );
  });

  it('marks adjusted settings as custom', () => {
    const { doc } = fakeDoc();
    render(<CompressPanel doc={doc} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced settings' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Remove metadata (Info and XMP)' }),
    );
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(useOptimizeSettings.getState().settings.stripMetadata).toBe(true);
  });

  it('reports a kept original from the current checkpoint, not as an error', () => {
    const { doc } = fakeDoc('optimize.compress');
    render(<CompressPanel doc={doc} />);
    expect(screen.getByText(KEPT_ORIGINAL)).toBeTruthy();
    expect(
      screen.getByRole('cell', { name: 'Restructure (qpdf)' }),
    ).toBeTruthy();
    expect(screen.getByText(/This is not an error/)).toBeTruthy();
  });

  it('shows no result when the current checkpoint is not an Optimize one', () => {
    const { doc } = fakeDoc('redact.apply');
    render(<CompressPanel doc={doc} />);
    expect(screen.queryByText(KEPT_ORIGINAL)).toBeNull();
  });
});
