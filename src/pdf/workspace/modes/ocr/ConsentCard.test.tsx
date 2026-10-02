/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeManifest } from '@/pdf/ocr/test-manifest';
import type { OcrManifest } from '@/pdf/ocr/types';
import { ConsentCard } from './ConsentCard';

const MiB = 1024 * 1024;

/** English with SIMD comes to exactly 5.5 MB (worker + SIMD core + eng). */
function manifest(): OcrManifest {
  const m = fakeManifest();
  m.languages.eng.bytes = 5.5 * MiB - m.worker.bytes - m.core.simd.bytes;
  return m;
}

const props = {
  manifest: manifest(),
  langs: ['eng' as const],
  onLangsChange: () => {},
  cached: false,
  simd: true,
  onRun: () => {},
  onDismiss: () => {},
};

afterEach(() => vi.unstubAllGlobals());

describe('ConsentCard', () => {
  it('states the exact download size and fetches nothing before consent', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const onRun = vi.fn();
    render(<ConsentCard {...props} onRun={onRun} />);
    expect(
      screen.getByRole('heading', { name: 'Make this document searchable' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'English OCR data: 5.5 MB download (engine + language), stored on this device for next time.',
      ),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download and run' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('counts the plain core when SIMD is missing, and every language', () => {
    const m = manifest();
    render(
      <ConsentCard
        {...props}
        manifest={m}
        langs={['eng', 'fra']}
        simd={false}
      />,
    );
    const bytes =
      m.worker.bytes +
      m.core.plain.bytes +
      m.languages.eng.bytes +
      m.languages.fra.bytes;
    expect(
      screen.getByText(
        `English + French OCR data: ${(bytes / MiB).toFixed(1)} MB download (engine + languages), stored on this device for next time.`,
      ),
    ).toBeTruthy();
  });

  it('says the data is stored once it is cached', () => {
    const onRun = vi.fn();
    render(<ConsentCard {...props} cached onRun={onRun} />);
    expect(
      screen.getByText('English OCR data is stored on this device.'),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Download and run' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Run OCR' }));
    expect(onRun).toHaveBeenCalled();
  });

  it('picks up to three languages and declines', () => {
    const onLangsChange = vi.fn();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <ConsentCard
        {...props}
        onLangsChange={onLangsChange}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'deu' },
    });
    expect(onLangsChange).toHaveBeenLastCalledWith(['deu']);
    fireEvent.click(screen.getByRole('button', { name: 'Add a language' }));
    expect(onLangsChange).toHaveBeenLastCalledWith(['eng', 'fra']);
    rerender(
      <ConsentCard
        {...props}
        langs={['eng', 'fra', 'deu']}
        onLangsChange={onLangsChange}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add a language' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove language 2' }));
    expect(onLangsChange).toHaveBeenLastCalledWith(['eng', 'deu']);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('still asks without a manifest, naming no size', () => {
    render(<ConsentCard {...props} manifest={null} />);
    expect(
      screen.getByText(
        'English OCR data downloads once (engine + language) and is stored on this device for next time.',
      ),
    ).toBeTruthy();
  });
});
