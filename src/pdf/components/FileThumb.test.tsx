/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileThumb } from './FileThumb';

const opened = vi.hoisted(() => ({ files: [] as unknown[] }));
vi.mock('@/pdf/render', () => ({
  usePdfDocument: (file: unknown) => {
    opened.files.push(file);
    return { doc: null, loading: file !== null, error: null };
  },
  usePageBitmap: () => ({ bitmap: null, error: null }),
}));

let fireVisible: (() => void) | null = null;
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {
    fireVisible = () =>
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
}

describe('FileThumb', () => {
  beforeEach(() => {
    opened.files = [];
    fireVisible = null;
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  it('renders a loading placeholder while the file opens', () => {
    render(<FileThumb bytes={new Uint8Array([1, 2, 3])} name="a.pdf" />);
    // Decorative spinner: hidden from assistive tech (no live region per row).
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('status', { hidden: true })).toBeTruthy();
  });

  it('opens the document only once the row is near the viewport', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    render(<FileThumb bytes={bytes} name="a.pdf" />);
    expect(opened.files.every((f) => f === null)).toBe(true);
    act(() => fireVisible!());
    expect(opened.files.at(-1)).toEqual({ bytes });
  });
});
