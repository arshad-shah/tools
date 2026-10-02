/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { drawFaviconRing } from './favicon-ring';

const fake = () => {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 0,
    lineCap: '',
    strokeStyle: '',
  };
  const render = vi.fn(
    (_size: number, paint: (c: CanvasRenderingContext2D) => void) => {
      paint(ctx as unknown as CanvasRenderingContext2D);
      return 'data:image/png;base64,AAAA';
    },
  );
  return { ctx, render };
};

describe('drawFaviconRing', () => {
  it('draws the track and the elapsed arc as a PNG data URL', () => {
    const { ctx, render } = fake();
    const url = drawFaviconRing(0.5, { track: 'grey', fill: 'green' }, render);
    expect(url).toMatch(/^data:image\/png/);
    expect(render).toHaveBeenCalledWith(64, expect.any(Function));
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    const [, , , start, end] = ctx.arc.mock.calls[1] as number[];
    expect(end - start).toBeCloseTo(Math.PI, 10);
  });
  it('draws only the track at zero and clamps over one', () => {
    const a = fake();
    drawFaviconRing(0, { track: 't', fill: 'f' }, a.render);
    expect(a.ctx.arc).toHaveBeenCalledTimes(1);
    const b = fake();
    drawFaviconRing(3, { track: 't', fill: 'f' }, b.render);
    const [, , , start, end] = b.ctx.arc.mock.calls[1] as number[];
    expect(end - start).toBeCloseTo(Math.PI * 2, 10);
  });
});
