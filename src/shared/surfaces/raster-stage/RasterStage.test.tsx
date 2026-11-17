/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RasterStage, type StagePointer } from './RasterStage';

const base = {
  label: 'Image being edited',
  width: 200,
  height: 100,
  scale: 2,
  paint: () => {},
};

describe('RasterStage surface', () => {
  it('shows a labelled canvas at its own resolution, sized by the zoom', () => {
    render(<RasterStage {...base} description="Arrow keys move" />);
    const canvas = screen.getByRole('img', { name: 'Image being edited' });
    expect(canvas.getAttribute('width')).toBe('200');
    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('200px');
    expect(canvas.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('paints through the context and repaints when paint changes', () => {
    const ctx = {} as CanvasRenderingContext2D;
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as never);
    const paint = vi.fn();
    const { rerender } = render(<RasterStage {...base} paint={paint} />);
    expect(paint).toHaveBeenCalledWith(ctx);
    const next = vi.fn();
    rerender(<RasterStage {...base} paint={next} />);
    expect(next).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('reports pointer gestures in canvas pixels', () => {
    const events: StagePointer[] = [];
    render(<RasterStage {...base} onPointer={(e) => events.push(e)} />);
    const canvas = screen.getByRole('img');
    canvas.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 400, height: 200 }) as DOMRect;
    fireEvent.pointerDown(canvas, {
      button: 0,
      pointerId: 1,
      clientX: 30,
      clientY: 40,
    });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 50, clientY: 60 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 110, clientY: 120 });
    expect(events.map((e) => [e.phase, e.x, e.y])).toEqual([
      ['start', 10, 10],
      ['move', 20, 20],
      ['end', 50, 50],
    ]);
    expect(events[0].pressure).toBe(0.5);
  });

  it('hosts the selection frame; keys move it and Delete removes', () => {
    const onCommit = vi.fn();
    const onDelete = vi.fn();
    render(
      <RasterStage
        {...base}
        onDelete={onDelete}
        frame={{
          label: 'Arrow 1',
          box: { x: 10, y: 10, width: 20, height: 20 },
          bounded: true,
          onCommit,
        }}
      />,
    );
    const frame = screen.getByRole('group', { name: 'Arrow 1' });
    fireEvent.keyDown(frame, { key: 'ArrowRight' });
    fireEvent.keyUp(frame, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenCalled();
    expect(onCommit.mock.calls.at(-1)?.[0]).toMatchObject({ x: 11, y: 10 });
    fireEvent.keyDown(frame, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
