/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';
import { CropTool } from './CropTool';

// A 600 x 800 point page drawn at 1 px per point, y down.
function setup({
  crop,
  tool = 'crop',
  current = 'p0',
}: { crop?: Box; tool?: string | null; current?: string } = {}) {
  const dispatch = vi.fn(() => [{}]);
  const page = { id: 'p0', ...(crop ? { crop } : {}) };
  const props = {
    page,
    pageNumber: 1,
    width: 600,
    height: 800,
    viewport: { transform: [1, 0, 0, 1, 0, 0] },
    tool: { id: tool, set: vi.fn() },
    doc: {
      currentPage: current,
      dispatch,
      pageGeom: () => ({ view: [0, 0, 600, 800] }),
    },
  } as unknown as PageOverlayProps;
  const view = render(<CropTool {...props} />);
  return { dispatch, view };
}

const frame = () => screen.getByRole('group', { name: 'Crop area of page 1' });
const press = (key: string, init: KeyboardEventInit = {}) => {
  fireEvent.keyDown(frame(), { key, ...init });
  fireEvent.keyUp(frame(), { key, ...init });
};
const lastBox = (dispatch: ReturnType<typeof vi.fn>) =>
  (dispatch.mock.calls.at(-1)![0] as { params: { box: Box | null } }).params
    .box;

describe('CropTool', () => {
  it('shows only with the crop tool on the current page', () => {
    setup({ tool: 'rotate' });
    expect(screen.queryByRole('group', { name: 'Crop page 1' })).toBeNull();
    setup({ current: 'p9' }).view.unmount();
    expect(screen.queryByRole('group', { name: 'Crop page 1' })).toBeNull();
  });

  it('a keyboard nudge is one page.crop step from the pending crop', () => {
    const { dispatch } = setup({
      crop: { x: 100, y: 100, width: 200, height: 300 },
    });
    press('ArrowRight', { shiftKey: true });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.crop',
      params: {
        pageIds: ['p0'],
        box: { x: 110, y: 100, width: 200, height: 300 },
      },
    });
  });

  it('starts from the full page when there is no crop', () => {
    const { dispatch } = setup();
    expect(screen.queryByRole('button', { name: 'Reset crop' })).toBeNull();
    press('ArrowLeft', { altKey: true });
    expect(lastBox(dispatch)).toEqual({ x: 0, y: 0, width: 599, height: 800 });
  });

  it('Esc while adjusting goes back to the start without a step', () => {
    const { dispatch } = setup({
      crop: { x: 100, y: 100, width: 200, height: 300 },
    });
    const left = () => frame().style.left;
    const before = left();
    fireEvent.keyDown(frame(), { key: 'ArrowRight', shiftKey: true });
    expect(left()).not.toBe(before);
    fireEvent.keyDown(frame(), { key: 'Escape' });
    expect(left()).toBe(before);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('Reset crop clears the pending crop', () => {
    const { dispatch } = setup({
      crop: { x: 10, y: 10, width: 20, height: 20 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset crop' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'page.crop',
      params: { pageIds: ['p0'], box: null },
    });
  });

  it('moving the area stops at the page edge, keeping its size', () => {
    const { dispatch } = setup({
      crop: { x: 0, y: 100, width: 200, height: 300 },
    });
    press('ArrowLeft', { shiftKey: true });
    expect(lastBox(dispatch)).toEqual({
      x: 0,
      y: 100,
      width: 200,
      height: 300,
    });
  });

  it('resizing cannot grow the area past the page', () => {
    const { dispatch } = setup({
      crop: { x: 500, y: 700, width: 100, height: 100 },
    });
    press('ArrowRight', { altKey: true, shiftKey: true });
    expect(lastBox(dispatch)).toEqual({
      x: 500,
      y: 700,
      width: 100,
      height: 100,
    });
    press('ArrowDown', { altKey: true });
    expect(lastBox(dispatch)).toEqual({
      x: 500,
      y: 700,
      width: 100,
      height: 100,
    });
  });
});
