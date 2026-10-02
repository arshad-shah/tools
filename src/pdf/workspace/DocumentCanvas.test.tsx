/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel, makeSource, makeState } from '@/pdf/doc/test-helpers';
import type { PageRef } from '@/pdf/doc/types';
import { DocumentCanvas } from './DocumentCanvas';
import { displayViewport, pageGeom } from './page-display';
import type { ModeModule, ModeProps, PageOverlayProps } from './modes/types';

type Slot = { width: number; height: number };
let viewport: {
  pages: Slot[];
  renderPage(a: { index: number; scale: number; visible: boolean }): ReactNode;
} | null = null;
vi.mock('@/shared/ui', async (orig) => ({
  ...(await orig<typeof import('@/shared/ui')>()),
  DocumentViewport: (p: NonNullable<typeof viewport>) => {
    viewport = p;
    return null;
  },
}));
vi.mock('./PageImage', () => ({ PageImage: () => null }));

beforeAll(() => registerCoreOperations());

const crop = { x: 100, y: 100, width: 200, height: 300 };

function setup(tool: string | null) {
  const model = makeModel(
    makeState(2, { sources: { s0: makeSource('s0', 2) } }),
  );
  model.dispatch({
    type: 'page.crop',
    params: { pageIds: ['ckpt0:0'], box: crop },
  });
  const state = model.getState();
  const overlay = vi.fn<(p: PageOverlayProps) => null>(() => null);
  const mode = {
    doc: {
      view: model.getView(),
      state,
      currentPage: 'ckpt0:0',
      pageGeom: (p: PageRef) => pageGeom(p, state.sources),
      viewport: (p: PageRef, s: number) => displayViewport(p, state.sources, s),
    },
    tool: { id: tool, set: () => {} },
  } as unknown as ModeProps;
  render(
    <DocumentCanvas
      mode={mode}
      module={{ PageOverlay: overlay } as unknown as ModeModule}
      sourceDocs={{ get: () => undefined } as never}
      zoom={{ kind: 'fit-width' }}
      onZoomChange={() => {}}
    />,
  );
  render(<>{viewport!.renderPage({ index: 0, scale: 1, visible: true })}</>);
  return { overlay };
}

describe('DocumentCanvas', () => {
  it('shows a cropped page cropped', () => {
    const { overlay } = setup(null);
    expect(viewport!.pages[0]).toMatchObject({ width: 200, height: 300 });
    expect(overlay.mock.calls[0][0].width).toBe(200);
  });

  it('shows the whole page while the crop tool adjusts it', () => {
    const { overlay } = setup('crop');
    const full = viewport!.pages[0];
    expect(full).toMatchObject({ width: 612, height: 792 });
    // The page next to it keeps its own size; the frame starts at the crop.
    const props = overlay.mock.calls[0][0];
    expect(props.width).toBe(612);
    expect(props.page.crop).toEqual(crop);
  });
});
