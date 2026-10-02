/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OverlayLayer,
  PageBox,
  PagePlaced,
  type OverlayTransform,
} from './overlay-layer';
import { ShapeLayer } from './shape-layer';
import { resolvePaint } from './shape-paint';
import { SelectionFrame } from './selection-frame';
import { HitArea } from './hit-area';
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
    expect(screen.getByTestId('layer').className).toContain(
      'pointer-events-none',
    );
    rerender(
      <OverlayLayer width={10} height={10} interactive data-testid="layer" />,
    );
    expect(screen.getByTestId('layer').className).not.toContain(
      'pointer-events-none',
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
      color: 'var(--color-accent)',
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

function frame(
  over: Partial<React.ComponentProps<typeof SelectionFrame>> = {},
) {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  render(
    <SelectionFrame
      transform={PDF}
      box={BOX}
      onChange={onChange}
      onCommit={onCommit}
      label="Text box: Hello"
      resizable
      rotatable
      {...over}
    />,
  );
  return {
    onChange,
    onCommit,
    el: screen.getByRole('group', { name: 'Text box: Hello' }),
  };
}

describe('SelectionFrame keyboard', () => {
  it('ArrowRight nudges 1pt: onChange on keydown, onCommit on keyup', () => {
    const { el, onChange, onCommit } = frame();
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ ...BOX, x: 101 }, 0);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(el, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenCalledWith({ ...BOX, x: 101 }, 0);
  });

  it('Shift+ArrowRight nudges 10pt and ArrowUp moves up the page', () => {
    const { el, onChange } = frame();
    fireEvent.keyDown(el, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ ...BOX, x: 110 }, 0);
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ ...BOX, x: 110, y: 701 }, 0);
  });

  it('Alt+arrows resize from the screen top-left corner', () => {
    const { el, onChange } = frame();
    fireEvent.keyDown(el, { key: 'ArrowRight', altKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ ...BOX, width: 51 }, 0);
    fireEvent.keyDown(el, { key: 'ArrowDown', altKey: true, shiftKey: true });
    // The bottom edge moves down the screen: y (page bottom) drops by 10.
    expect(onChange).toHaveBeenLastCalledWith(
      { x: 100, y: 690, width: 51, height: 30 },
      0,
    );
  });

  it('[ and ] rotate by 15 degrees', () => {
    const { el, onChange } = frame();
    fireEvent.keyDown(el, { key: ']' });
    expect(onChange).toHaveBeenLastCalledWith(BOX, 15);
    fireEvent.keyDown(el, { key: '[' });
    fireEvent.keyDown(el, { key: '[' });
    expect(onChange).toHaveBeenLastCalledWith(BOX, -15);
  });

  it('Esc restores the start box without committing', () => {
    const { el, onChange, onCommit } = frame();
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    fireEvent.keyDown(el, { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith(BOX, 0);
    fireEvent.keyUp(el, { key: 'ArrowRight' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('Enter commits the current box', () => {
    const { el, onCommit } = frame();
    fireEvent.keyDown(el, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith({ ...BOX, x: 90 }, 0);
  });

  it('applies snap to every change', () => {
    const snap = (b: typeof BOX) => ({ ...b, x: Math.round(b.x / 5) * 5 });
    const { el, onChange } = frame({ snap });
    fireEvent.keyDown(el, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ ...BOX, x: 110 }, 0);
  });

  it('ignores resize keys when not resizable', () => {
    const { el, onChange } = frame({ resizable: false });
    fireEvent.keyDown(el, { key: 'ArrowRight', altKey: true });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('HitArea', () => {
  it('is a button with the label that activates', () => {
    const onActivate = vi.fn();
    render(
      <HitArea
        transform={PDF}
        box={BOX}
        label="Signature field 1"
        pressed
        onActivate={onActivate}
      />,
    );
    const b = screen.getByRole('button', { name: 'Signature field 1' });
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(b.style.top).toBe('72px');
    fireEvent.click(b);
    expect(onActivate).toHaveBeenCalledOnce();
  });
});
