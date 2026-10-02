/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SizeBreakdown } from '@/pdf/edit/size-breakdown';
import {
  WorkspaceContext,
  type WorkspaceActions,
} from '../../workspace-context';
import type { DocumentApi } from '../types';
import { documentBreakdown } from './breakdown';
import { SizeBreakdownPanel, SizeBreakdownView } from './SizeBreakdown';

vi.mock('./breakdown', () => ({ documentBreakdown: vi.fn() }));

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

describe('SizeBreakdownView ids', () => {
  it('gives each mounted panel its own list labels', () => {
    const { container } = render(
      <>
        <SizeBreakdownView data={data} pageIds={[]} onGoToPage={() => {}} />
        <SizeBreakdownView data={data} pageIds={[]} onGoToPage={() => {}} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(ids.length);
    const labelled = screen
      .getAllByRole('list')
      .filter((l) => l.hasAttribute('aria-labelledby'));
    expect(labelled).toHaveLength(4);
    for (const list of labelled)
      expect(
        container.querySelector(
          `[id="${list.getAttribute('aria-labelledby')}"]`,
        ),
      ).toBeTruthy();
  });
});

describe('SizeBreakdownPanel', () => {
  afterEach(() => vi.useRealTimers());

  const docAt = (log: number) =>
    ({
      view: { checkpoint: 'c0', pages: [] },
      state: { cursor: log, log: Array.from({ length: log }) },
    }) as unknown as DocumentApi;

  it('measures at once, then once after a burst of changes settles', async () => {
    vi.useFakeTimers();
    const measure = vi.mocked(documentBreakdown);
    measure.mockReset();
    measure.mockResolvedValue(data);
    const ws = {
      session: {},
      goToPage: () => {},
    } as unknown as WorkspaceActions;
    const panel = (log: number) => (
      <WorkspaceContext.Provider value={ws}>
        <SizeBreakdownPanel doc={docAt(log)} />
      </WorkspaceContext.Provider>
    );
    const { rerender } = render(panel(0));
    expect(measure).toHaveBeenCalledTimes(1);
    for (let i = 1; i <= 5; i++) {
      rerender(panel(i));
      await act(() => vi.advanceTimersByTimeAsync(100));
    }
    expect(measure).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(measure).toHaveBeenCalledTimes(2);
  });
});
