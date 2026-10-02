/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InkStroke } from '@/shared/lib/ink';
import { SignaturePad } from './signature-pad';

const ctx = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  fillStyle: '',
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    'Path2D',
    class {
      constructor(public d: string) {}
    },
  );
  Object.values(ctx).forEach((v) => typeof v === 'function' && v.mockClear());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pad = (props: Partial<React.ComponentProps<typeof SignaturePad>> = {}) =>
  render(
    <SignaturePad
      value={[]}
      onChange={() => {}}
      label="Draw"
      ink="#111827"
      weight="medium"
      {...props}
    />,
  );

const stroke: InkStroke = [0, 10, 20, 30, 40].map((x, i) => ({
  x,
  y: 10,
  pressure: 0.5,
  tiltX: 0,
  tiltY: 0,
  t: i * 16,
}));

describe('SignaturePad', () => {
  it('emits one stroke of timed pressure samples per pointer gesture', () => {
    const onChange = vi.fn();
    pad({ onChange });
    const el = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(el, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerMove(el, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(el, { clientX: 20, clientY: 15 });
    fireEvent.pointerUp(el);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [strokes] = onChange.mock.calls[0];
    expect(strokes).toHaveLength(1);
    expect(strokes[0].length).toBeGreaterThanOrEqual(2);
    for (const p of strokes[0]) {
      expect(p.pressure).toBeGreaterThanOrEqual(0.2);
      expect(p.pressure).toBeLessThanOrEqual(1);
      expect(typeof p.t).toBe('number');
    }
  });

  it('adds to the strokes it was given (the parent owns undo)', () => {
    const onChange = vi.fn();
    pad({ onChange, value: [stroke] });
    const el = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(el, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerMove(el, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(el);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
    expect(onChange.mock.calls[0][0][0]).toBe(stroke);
  });

  it('fills one tapered outline per stroke with the ink', () => {
    pad({ value: [stroke, stroke], width: 200, height: 80 });
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(ctx.fillStyle).toBe('#111827');
    const path = ctx.fill.mock.calls[0][0] as { d: string };
    expect(path.d).toMatch(/^M.*C.*Z$/);
  });

  it('ignores input while disabled', () => {
    const onChange = vi.fn();
    pad({ onChange, disabled: true });
    const el = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(el, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(el);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores the secondary mouse button', () => {
    const onChange = vi.fn();
    pad({ onChange });
    const el = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(el, {
      clientX: 1,
      clientY: 1,
      button: 2,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(el);
    expect(onChange).not.toHaveBeenCalled();
  });
});
