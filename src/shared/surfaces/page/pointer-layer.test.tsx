/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PointerLayer } from './pointer-layer';

/** PDF page space (y up, 792pt tall) to CSS px at zoom 1. */
const PDF = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };

const press = (el: HTMLElement, x: number, y: number, x2 = x, y2 = y) => {
  fireEvent.pointerDown(el, {
    button: 0,
    pointerId: 1,
    clientX: x,
    clientY: y,
  });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: x2, clientY: y2 });
};

describe('PointerLayer', () => {
  it('reports a click in page space', () => {
    const onPoint = vi.fn();
    render(
      <PointerLayer transform={PDF} onPoint={onPoint} data-testid="layer" />,
    );
    press(screen.getByTestId('layer'), 100, 92);
    expect(onPoint).toHaveBeenCalledWith({ x: 100, y: 700 });
  });

  it('reports a drag as a page-space box', () => {
    const onPoint = vi.fn();
    const onDrag = vi.fn();
    render(
      <PointerLayer
        transform={PDF}
        onPoint={onPoint}
        onDrag={onDrag}
        data-testid="layer"
      />,
    );
    press(screen.getByTestId('layer'), 100, 92, 200, 112);
    expect(onPoint).not.toHaveBeenCalled();
    expect(onDrag).toHaveBeenCalledWith({
      x: 100,
      y: 680,
      width: 100,
      height: 20,
    });
  });

  it('reports hover positions and leaving', () => {
    const onMove = vi.fn();
    render(
      <PointerLayer
        transform={PDF}
        onPoint={() => {}}
        onMove={onMove}
        data-testid="layer"
      />,
    );
    const el = screen.getByTestId('layer');
    fireEvent.pointerMove(el, { clientX: 10, clientY: 792 });
    fireEvent.pointerLeave(el);
    expect(onMove.mock.calls).toEqual([[{ x: 10, y: 0 }], [null]]);
  });
});
