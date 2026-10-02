/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { PlaceLayer } from './PlaceLayer';
import { setEditUi } from './ui-store';

afterEach(() => {
  cleanup();
  setEditUi({ image: null });
});

const VIEWPORT = {
  width: 612,
  height: 792,
  transform: [1, 0, 0, -1, 0, 792] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
};

function setup(tool: 'image' | 'shape') {
  const dispatch = vi.fn(() => [{ id: 'op-new' }]);
  const onPlaced = vi.fn();
  const doc = { dispatch, announce: vi.fn(), sources: {} };
  render(
    <PlaceLayer
      doc={doc as unknown as DocumentApi}
      page={{ id: 'p1', blank: true } as unknown as PageRef}
      pageNumber={1}
      tool={tool}
      viewport={VIEWPORT}
      width={612}
      height={792}
      onPlaced={onPlaced}
    />,
  );
  const layer = screen.getByTestId('edit-place-1').firstElementChild!;
  const drag = (x0: number, y0: number, x1: number, y1: number) => {
    Object.assign(layer, { setPointerCapture() {} });
    fireEvent.pointerDown(layer, { button: 0, clientX: x0, clientY: y0 });
    fireEvent.pointerMove(layer, { clientX: x1, clientY: y1 });
    fireEvent.pointerUp(layer, { clientX: x1, clientY: y1 });
  };
  return { dispatch, onPlaced, drag };
}

describe('PlaceLayer', () => {
  it('hands a placed shape back so the mode can select it', () => {
    const { dispatch, onPlaced, drag } = setup('shape');
    drag(100, 100, 200, 160);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onPlaced).toHaveBeenCalledWith('op-new');
  });

  it('hands a placed image back too', () => {
    setEditUi({
      image: { assetId: 'a1', mime: 'image/png', aspect: 2 },
    });
    const { onPlaced, drag } = setup('image');
    drag(100, 100, 100, 100);
    expect(onPlaced).toHaveBeenCalledWith('op-new');
  });

  it('places nothing (and selects nothing) for a shape click', () => {
    const { dispatch, onPlaced, drag } = setup('shape');
    drag(100, 100, 101, 100);
    expect(dispatch).not.toHaveBeenCalled();
    expect(onPlaced).not.toHaveBeenCalled();
  });
});
