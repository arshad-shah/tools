/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PageRailProps } from '@/shared/ui';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { ModeProps } from './modes/types';
import { PageRailPanel } from './PageRailPanel';

let rail: PageRailProps | null = null;
vi.mock('@/shared/ui', async (orig) => ({
  ...(await orig<typeof import('@/shared/ui')>()),
  PageRail: (p: PageRailProps) => {
    rail = p;
    return null;
  },
}));

function setup() {
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
    selection: { pages: new Set<string>(), selectPages: vi.fn(), clear },
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
    const { dispatch, announce } = setup();
    rail!.onDelete!(['ckpt0:0', 'ckpt0:1', 'ckpt0:2']);
    expect(dispatch).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(
      'The document must keep at least one page',
    );
  });

  it('Delete removes the given pages and clears the selection', () => {
    const { dispatch, clear } = setup();
    rail!.onDelete!(['ckpt0:1']);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.delete',
      params: { pageIds: ['ckpt0:1'] },
    });
    expect(clear).toHaveBeenCalled();
  });
});
