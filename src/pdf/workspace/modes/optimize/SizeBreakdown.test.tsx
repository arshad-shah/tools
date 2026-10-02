/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SizeBreakdown } from '@/pdf/edit/size-breakdown';
import { SizeBreakdownView } from './SizeBreakdown';

const data: SizeBreakdown = {
  total: 10240,
  images: 8192,
  fonts: 1024,
  content: 512,
  other: 512,
  largestImages: [
    { page: 2, bytes: 6144, width: 1000, height: 750 },
    { page: -1, bytes: 2048, width: 10, height: 10 },
  ],
  fontList: [
    { name: 'ABCDEF+NotoSans', bytes: 1024, embedded: true, subset: true },
    { name: 'Helvetica', bytes: 0, embedded: false, subset: false },
  ],
};

describe('SizeBreakdownView', () => {
  it('shows a bar per category, the largest images and the fonts', () => {
    const onGoToPage = vi.fn();
    render(
      <SizeBreakdownView
        data={data}
        pageIds={['p1', 'p2', 'p3']}
        onGoToPage={onGoToPage}
      />,
    );
    const images = screen.getByRole('progressbar', {
      name: 'Images: 8.0 KB of 10.0 KB',
    });
    expect(images.getAttribute('aria-valuenow')).toBe('8192');
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
    expect(screen.getByText('8.0 KB (80%)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onGoToPage).toHaveBeenCalledWith('p3');
    // An image on no known page has no button.
    expect(screen.getAllByRole('button', { name: /Go to page/ })).toHaveLength(
      1,
    );
    expect(screen.getByText('ABCDEF+NotoSans')).toBeTruthy();
    expect(screen.getByText('Not embedded')).toBeTruthy();
    expect(screen.getByText('Subset')).toBeTruthy();
  });
});
