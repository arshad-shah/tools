/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrawRectLayer } from './draw-rect-layer';
import { Highlight } from './highlight';

// Half size, y flipped: page (0, 792) is the top-left corner.
const T = { a: 0.5, b: 0, c: 0, d: -0.5, e: 0, f: 396 };

describe('DrawRectLayer', () => {
  it('reports the dragged rectangle in page space', () => {
    const onDraw = vi.fn();
    render(
      <DrawRectLayer
        width={306}
        height={396}
        transform={T}
        label="Draw area"
        onDraw={onDraw}
      />,
    );
    const el = screen.getByRole('application', { name: 'Draw area' });
    fireEvent.pointerDown(el, {
      clientX: 10,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(el, { clientX: 60, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 110, clientY: 60, pointerId: 1 });
    expect(onDraw).toHaveBeenCalledWith({
      x: 20,
      y: 672,
      width: 200,
      height: 80,
    });
  });

  it('ignores clicks and tiny drags', () => {
    const onDraw = vi.fn();
    render(
      <DrawRectLayer
        width={306}
        height={396}
        transform={T}
        label="Draw area"
        onDraw={onDraw}
      />,
    );
    const el = screen.getByRole('application');
    fireEvent.pointerDown(el, {
      clientX: 10,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerUp(el, { clientX: 12, clientY: 21, pointerId: 1 });
    expect(onDraw).not.toHaveBeenCalled();
  });
});

describe('Highlight', () => {
  it('marks one run of the text', () => {
    const { container } = render(
      <Highlight text="My Secret plan" start={3} length={6} />,
    );
    expect(container.querySelector('mark')?.textContent).toBe('Secret');
    expect(container.textContent).toBe('My Secret plan');
  });
});
