/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { makeTextPdf } from '../../../test/fixtures/builders';
import { usePreviewBytes } from './usePreviewBytes';

describe('usePreviewBytes', () => {
  it('builds from a one-page extract, debounced to the latest settings', async () => {
    const source = await makeTextPdf({ pages: 3 });
    const build = vi.fn(async (page: Uint8Array) => page);
    const { result, rerender } = renderHook(
      ({ key }) => usePreviewBytes(source, 1, key, build, 60),
      {
        initialProps: { key: 'a' },
      },
    );
    rerender({ key: 'b' });
    rerender({ key: 'c' });
    await waitFor(() => expect(result.current.bytes).not.toBeNull());
    expect(build).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
    expect((await PDFDocument.load(result.current.bytes!)).getPageCount()).toBe(
      1,
    );
  });
  it('surfaces build errors as ToolErrors', async () => {
    const source = await makeTextPdf({ pages: 1 });
    const build = vi.fn(async () => {
      throw new ToolError('INVALID_INPUT', 'bad text');
    });
    const { result } = renderHook(() =>
      usePreviewBytes(source, 0, 'k', build, 10),
    );
    await waitFor(() => expect(result.current.error?.message).toBe('bad text'));
    expect(result.current.bytes).toBeNull();
  });
});
