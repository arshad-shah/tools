/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileThumb } from './FileThumb';

vi.mock('@/pdf/render', () => ({
  usePdfDocument: () => ({ doc: null, loading: true, error: null }),
  usePageBitmap: () => ({ bitmap: null, error: null }),
}));

describe('FileThumb', () => {
  it('renders a loading placeholder while the file opens', () => {
    render(<FileThumb bytes={new Uint8Array([1, 2, 3])} name="a.pdf" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
