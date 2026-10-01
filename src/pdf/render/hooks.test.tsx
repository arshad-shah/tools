/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';

const fake = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let generation = 0;
  let n = 0;
  return {
    listeners,
    restart() {
      generation++;
      for (const l of [...listeners]) l();
    },
    reset() {
      listeners.clear();
      generation = 0;
      n = 0;
    },
    pdfRender: {
      open: vi.fn(async () => {
        n++;
        return { docId: `doc${n}`, pageCount: 1, pages: [] };
      }),
      close: vi.fn(async () => {}),
      renderPage: vi.fn(),
      generation: () => generation,
      onRestart: (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    },
  };
});

vi.mock('./client', () => ({ pdfRender: fake.pdfRender }));

const { usePdfDocument } = await import('./hooks');

describe('usePdfDocument', () => {
  beforeEach(() => fake.reset());

  it('reopens the same bytes after a worker restart', async () => {
    const file = { bytes: new Uint8Array([1, 2, 3]) };
    const { result } = renderHook(() => usePdfDocument(file));
    await waitFor(() => expect(result.current.doc?.docId).toBe('doc1'));

    act(() => fake.restart());
    expect(result.current.doc).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.doc?.docId).toBe('doc2'));
    expect(fake.pdfRender.open).toHaveBeenCalledTimes(2);
    expect((fake.pdfRender.open.mock.calls[1] as unknown[])[0]).toBe(
      file.bytes,
    );
  });

  it('surfaces an error when reopening fails instead of spinning', async () => {
    const file = { bytes: new Uint8Array([1]) };
    const { result } = renderHook(() => usePdfDocument(file));
    await waitFor(() => expect(result.current.doc).not.toBeNull());
    fake.pdfRender.open.mockRejectedValueOnce(
      new ToolError('WORKER_CRASHED', 'The background worker keeps crashing.'),
    );
    act(() => fake.restart());
    await waitFor(() =>
      expect(result.current.error?.code).toBe('WORKER_CRASHED'),
    );
    expect(result.current.loading).toBe(false);
  });
});
