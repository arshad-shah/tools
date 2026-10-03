/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockViewport } from '@/shared/ui/data-grid/test-utils';

interface Job {
  file: File;
  signal?: AbortSignal;
  onProgress?(p: { done: number }): void;
  resolve(r: Record<string, string>): void;
  reject(e: unknown): void;
}
const jobs: Job[] = [];

vi.mock('@/shared/workers/text-client', () => ({
  createTextWorker: () => ({
    call: (
      _method: string,
      [file]: [File],
      opts: { signal?: AbortSignal; onProgress?(p: { done: number }): void },
    ) =>
      new Promise((resolve, reject) => {
        const job = { file, ...opts, resolve, reject };
        jobs.push(job);
        opts.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('Cancelled'), { code: 'CANCELLED' })),
        );
      }),
    terminate: () => {},
  }),
}));

const { FileHashes } = await import('./FileHashes');

beforeEach(() => {
  mockViewport(1200, 400);
  jobs.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const file = (name: string, size: number) =>
  new File([new Uint8Array(size)], name);

describe('FileHashes', () => {
  it('shows each file progress and Cancel inside its grid row', async () => {
    const incoming = [file('a.bin', 1000), file('b.bin', 2000)];
    render(
      <FileHashes selected={['sha256']} output="hex" incoming={incoming} />,
    );
    const grid = screen.getByRole('grid', { name: 'File hashes' });
    act(() => jobs[0].onProgress?.({ done: 500 }));
    const meter = screen.getByRole('meter', { name: 'Hashing a.bin' });
    expect(grid.contains(meter)).toBe(true);
    expect(meter.getAttribute('aria-valuenow')).toBe('0.5');

    const cancel = screen.getByRole('button', { name: 'Cancel b.bin' });
    expect(grid.contains(cancel)).toBe(true);
    fireEvent.click(cancel);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Cancel b.bin' })).toBeNull();
    expect(grid.textContent).toContain('Cancelled');

    await act(async () => jobs[0].resolve({ sha256: '0102' }));
    expect(screen.queryByRole('meter', { name: 'Hashing a.bin' })).toBeNull();
    expect(grid.textContent).toContain('0102');
    expect(grid.textContent).toContain('Done');
  });

  it('puts Copy all and Download checksums above the grid', () => {
    render(
      <FileHashes
        selected={['sha256']}
        output="hex"
        incoming={[file('a.bin', 10)]}
      />,
    );
    const grid = screen.getByRole('grid', { name: 'File hashes' });
    for (const name of ['Copy all', 'Download checksums'])
      expect(
        screen.getByRole('button', { name }).compareDocumentPosition(grid) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
  });
});
