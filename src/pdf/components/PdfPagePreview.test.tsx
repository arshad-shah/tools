/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocInfo, PageBitmap } from '@/pdf/render';
import { PdfPagePreview } from './PdfPagePreview';

const state = vi.hoisted(() => ({
  doc: null as DocInfo | null,
  bitmap: { bitmap: null, error: null } as PageBitmap,
}));
vi.mock('@/pdf/render', () => ({
  usePdfDocument: () => ({ doc: state.doc, loading: !state.doc, error: null }),
  usePageBitmap: () => state.bitmap,
}));

const docA: DocInfo = {
  docId: 'a',
  pageCount: 1,
  pages: [{ width: 600, height: 800 }],
};
const drawn = { width: 200, height: 266 } as ImageBitmap;

const preview = (bytes: Uint8Array) => (
  <PdfPagePreview bytes={bytes} width={200} label="Preview" caption="Page 1" />
);

describe('PdfPagePreview', () => {
  beforeEach(() => {
    state.doc = null;
    state.bitmap = { bitmap: null, error: null };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  it('keeps the last rendered page on screen while the next one opens', () => {
    state.doc = docA;
    state.bitmap = { bitmap: drawn, error: null };
    const { rerender } = render(preview(new Uint8Array([1])));
    expect(
      screen
        .getByRole('img', { name: 'Preview' })
        .getAttribute('data-rendered'),
    ).toBe('true');
    // New bytes: the document is reopening, nothing rendered yet.
    state.doc = null;
    state.bitmap = { bitmap: null, error: null };
    rerender(preview(new Uint8Array([2])));
    expect(
      screen
        .getByRole('img', { name: 'Preview' })
        .getAttribute('data-rendered'),
    ).toBe('true');
    expect(screen.queryByLabelText('Rendering preview')).toBeNull();
  });

  it('shows a spinner before anything has rendered', () => {
    render(preview(new Uint8Array([1])));
    expect(screen.getByLabelText('Rendering preview')).toBeTruthy();
  });
});
