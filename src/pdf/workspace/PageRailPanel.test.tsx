/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ModeProps } from './modes/types';
import { PageRailPanel } from './PageRailPanel';

// The thumbnails need a laid-out list; render every row as an option.
vi.mock('@arshad-shah/cynosure', async (orig) => ({
  ...(await orig<typeof import('@arshad-shah/cynosure')>()),
  VirtualList: <T,>(p: {
    label: string;
    items: readonly T[];
    getKey(item: T, i: number): string;
    renderItem(item: T, s: { index: number }): ReactNode;
  }) => (
    <div role="listbox" aria-label={p.label}>
      {p.items.map((item, i) => (
        <div
          key={p.getKey(item, i)}
          role="option"
          aria-selected="false"
          tabIndex={-1}
          data-index={i}
        >
          {`Row ${i + 1}`}
        </div>
      ))}
    </div>
  ),
}));
vi.mock('@/shared/surfaces/pdf/PageImage', () => ({ PageImage: () => null }));

function setup(selected: string[] = []) {
  const model = makeModel();
  const dispatch = vi.fn(() => [{}]);
  const announce = vi.fn();
  const clear = vi.fn();
  const mode = {
    doc: {
      view: model.getView(),
      state: model.getState(),
      currentPage: 'ckpt0:0',
      dispatch,
      announce,
    },
    selection: {
      pages: new Set<string>(selected),
      selectPages: vi.fn(),
      clear,
    },
  } as unknown as ModeProps;
  render(
    <PageRailPanel
      mode={mode}
      module={null}
      sourceDocs={{ get: () => undefined } as never}
      current="ckpt0:0"
      width={160}
      onActivate={() => {}}
      onCurrent={() => {}}
    />,
  );
  return { dispatch, announce, clear };
}

describe('PageRailPanel', () => {
  it('Delete keeps at least one page and says why', () => {
    const { dispatch, announce } = setup(['ckpt0:0', 'ckpt0:1', 'ckpt0:2']);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Row 1' }), {
      key: 'Delete',
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(
      'The document must keep at least one page',
    );
  });

  it('Delete removes the given pages and clears the selection', () => {
    // Nothing selected: Delete removes the focused page.
    const { dispatch, clear } = setup();
    fireEvent.keyDown(screen.getByRole('option', { name: 'Row 2' }), {
      key: 'Backspace',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.delete',
      params: { pageIds: ['ckpt0:1'] },
    });
    expect(clear).toHaveBeenCalled();
  });
});
