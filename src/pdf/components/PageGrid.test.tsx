/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocInfo } from '@/pdf/render';
import { PageGrid, type PageTile } from './PageGrid';

vi.mock('@/pdf/render', () => ({
  usePageBitmap: () => ({ bitmap: null, error: null }),
}));

class NoopObserver {
  observe() {}
  disconnect() {}
}

const doc: DocInfo = {
  docId: 'd1',
  pageCount: 3,
  pages: [0, 1, 2].map(() => ({ width: 600, height: 800 })),
};
const tiles: PageTile[] = [0, 1, 2].map((i) => ({
  key: `k${i}`,
  pageIndex: i,
  rotation: 0,
}));

const renderGrid = (props: Partial<React.ComponentProps<typeof PageGrid>>) =>
  render(
    <PageGrid
      doc={doc}
      tiles={tiles}
      renderActions={(tile) => (
        <button type="button">Rotate {tile.pageIndex + 1}</button>
      )}
      {...props}
    />,
  );

describe('PageGrid', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopObserver);
  });

  it('toggles selection with Enter and Space on a tile', () => {
    const onToggle = vi.fn();
    renderGrid({ onToggle, onReorder: () => {} });
    const tile = screen.getAllByRole('listitem')[1];
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenCalledWith('k1', { shift: false, meta: false });
  });

  it('does not toggle from a nested action button', () => {
    const onToggle = vi.fn();
    renderGrid({ onToggle, onReorder: () => {} });
    const action = screen.getByRole('button', { name: 'Rotate 2' });
    fireEvent.keyDown(action, { key: 'Enter' });
    fireEvent.click(action);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('toggles on a click on the tile itself', () => {
    const onToggle = vi.fn();
    renderGrid({ onToggle });
    fireEvent.click(screen.getAllByRole('listitem')[0], { shiftKey: true });
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('k0', {
      shift: true,
      meta: false,
    });
  });

  it('moves a tile with Alt+ArrowRight and announces it', () => {
    const onReorder = vi.fn();
    renderGrid({ onReorder });
    expect(
      screen.getByRole('list', { name: 'Pages (Alt + arrow keys to reorder)' }),
    ).toBeTruthy();
    fireEvent.keyDown(screen.getAllByRole('listitem')[2], {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(onReorder).toHaveBeenCalledExactlyOnceWith([
      tiles[0],
      tiles[2],
      tiles[1],
    ]);
    expect(screen.getByText('Moved page 3 to position 2 of 3')).toBeTruthy();
  });

  it('is not reorderable without onReorder', () => {
    renderGrid({});
    expect(screen.getByRole('list', { name: 'Pages' })).toBeTruthy();
  });
});
