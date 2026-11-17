/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OverlayLayer,
  PageBox,
  PagePlaced,
  type OverlayTransform,
} from './overlay-layer';
import { ShapeLayer } from './shape-layer';
import { resolvePaint } from './shape-paint';
import { Positioned } from './positioned';

/** PDF page space (y up, 792pt tall) to CSS px at zoom 1. */
const PDF: OverlayTransform = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };
const BOX = { x: 100, y: 700, width: 50, height: 20 };

describe('OverlayLayer and PageBox', () => {
  it('maps a page-space box through the transform and normalises it', () => {
    render(
      <OverlayLayer width={612} height={792} label="Overlays">
        <PageBox transform={PDF} box={BOX} data-testid="pb" />
      </OverlayLayer>,
    );
    const el = screen.getByTestId('pb');
    expect(el.style.left).toBe('100px');
    expect(el.style.top).toBe('72px');
    expect(el.style.width).toBe('50px');
    expect(el.style.height).toBe('20px');
  });

  it('PagePlaced lays content out in page units, turned with the page', () => {
    // Upright: the content's top-left is the page point (x, y + height).
    const { rerender } = render(
      <PagePlaced
        transform={PDF}
        x={100}
        y={700}
        width={50}
        height={20}
        data-testid="pp"
      />,
    );
    const el = () => screen.getByTestId('pp');
    expect(el().style.width).toBe('50px');
    expect(el().style.height).toBe('20px');
    expect(el().style.transform).toBe('matrix(1, 0, 0, 1, 100, 72)');
    // Turned 90 degrees counter-clockwise about (x, y): the content's left
    // edge now runs up the page from (x, y).
    rerender(
      <PagePlaced
        transform={PDF}
        x={100}
        y={700}
        width={50}
        height={20}
        rotate={90}
        data-testid="pp"
      />,
    );
    const m = el()
      .style.transform.replace(/matrix\(|\)/g, '')
      .split(',')
      .map((v) => Math.round(Number(v) * 1000) / 1000 + 0);
    expect(m).toEqual([0, -1, 1, 0, 80, 92]);
  });

  it('is inert to the pointer unless interactive', () => {
    const { rerender } = render(
      <OverlayLayer width={10} height={10} data-testid="layer" />,
    );
    expect(screen.getByTestId('layer').className).toContain('tools-page-inert');
    rerender(
      <OverlayLayer width={10} height={10} interactive data-testid="layer" />,
    );
    expect(screen.getByTestId('layer').className).not.toContain(
      'tools-page-inert',
    );
  });

  it('Positioned applies a matrix transform from its top-left corner', () => {
    render(
      <Positioned
        x={0}
        y={0}
        transform={{ a: 2, b: 0, c: 0, d: 2, e: 5, f: 6 }}
        data-testid="p"
      />,
    );
    const el = screen.getByTestId('p');
    expect(el.style.transform).toBe('matrix(2, 0, 0, 2, 5, 6)');
    expect(el.style.transformOrigin).toBe('0 0');
  });
});

describe('ShapeLayer', () => {
  it('renders one hidden svg with a marker for arrows and a pattern for hatch', () => {
    const { container } = render(
      <ShapeLayer
        width={612}
        height={792}
        transform={PDF}
        shapes={[
          {
            kind: 'line',
            from: [0, 0],
            to: [100, 100],
            stroke: { token: 'accent' },
            width: 2,
            arrowEnd: true,
          },
          {
            kind: 'rect',
            box: BOX,
            stroke: { token: 'redact' },
            fill: { token: 'redact' },
            hatch: true,
          },
          {
            kind: 'quads',
            quads: [[0, 10, 10, 10, 0, 0, 10, 0]],
            fill: { hex: '#ffcc00', opacity: 0.4 },
            blend: 'multiply',
          },
        ]}
      />,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('marker')).not.toBeNull();
    expect(container.querySelector('pattern')).not.toBeNull();
    expect(container.querySelector('g')?.getAttribute('transform')).toBe(
      'matrix(1 0 0 -1 0 792)',
    );
  });

  it('maps token paints to theme variables and accepts validated hex', () => {
    expect(resolvePaint({ token: 'accent' })).toEqual({
      color: 'var(--cy-color-accent)',
      opacity: undefined,
    });
    expect(resolvePaint({ hex: '#A0b1C2', opacity: 0.5 })).toEqual({
      color: '#A0b1C2',
      opacity: 0.5,
    });
  });

  it('rejects a hex paint that is not #rrggbb', () => {
    expect(() => resolvePaint({ hex: 'red' })).toThrow(/invalid hex/i);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <ShapeLayer
          width={10}
          height={10}
          transform={PDF}
          shapes={[{ kind: 'rect', box: BOX, fill: { hex: 'red' } }]}
        />,
      ),
    ).toThrow(/invalid hex/i);
    spy.mockRestore();
  });
});
