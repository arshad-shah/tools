/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ColorRail, type ColorRailProps } from './color-picker-rail';

function Harness({
  start = 50,
  spy,
  ...rest
}: Partial<ColorRailProps> & { start?: number; spy?: (v: number) => void }) {
  const [v, setV] = useState(start);
  const set = (n: number) => {
    setV(n);
    spy?.(n);
  };
  return (
    <ColorRail
      label="Hue"
      min={0}
      max={359}
      value={v}
      valueText={`Hue ${v} degrees`}
      track="linear-gradient(to right, red, blue)"
      thumb="#ff0000"
      onChange={set}
      {...rest}
    />
  );
}

const rail = () => screen.getByRole('slider', { name: 'Hue' });

describe('ColorRail', () => {
  it('is a focusable slider with range and aria-valuetext', () => {
    render(<Harness />);
    const r = rail();
    expect(r.tabIndex).toBe(0);
    expect(r.getAttribute('aria-valuemin')).toBe('0');
    expect(r.getAttribute('aria-valuemax')).toBe('359');
    expect(r.getAttribute('aria-valuenow')).toBe('50');
    expect(r.getAttribute('aria-valuetext')).toBe('Hue 50 degrees');
    expect(r.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('arrow keys move one step; Shift and Page keys move ten', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const r = rail();
    fireEvent.keyDown(r, { key: 'ArrowRight' });
    expect(r.getAttribute('aria-valuenow')).toBe('51');
    fireEvent.keyDown(r, { key: 'ArrowUp' });
    expect(r.getAttribute('aria-valuenow')).toBe('52');
    fireEvent.keyDown(r, { key: 'ArrowLeft' });
    fireEvent.keyDown(r, { key: 'ArrowDown' });
    expect(r.getAttribute('aria-valuenow')).toBe('50');
    fireEvent.keyDown(r, { key: 'ArrowRight', shiftKey: true });
    expect(r.getAttribute('aria-valuenow')).toBe('60');
    fireEvent.keyDown(r, { key: 'PageDown' });
    fireEvent.keyDown(r, { key: 'PageDown' });
    expect(r.getAttribute('aria-valuenow')).toBe('40');
    fireEvent.keyDown(r, { key: 'PageUp' });
    expect(r.getAttribute('aria-valuenow')).toBe('50');
    expect(r.getAttribute('aria-valuetext')).toBe('Hue 50 degrees');
    expect(spy).toHaveBeenCalledTimes(8);
  });

  it('Home and End jump to the ends and steps clamp', () => {
    render(<Harness start={355} />);
    const r = rail();
    fireEvent.keyDown(r, { key: 'PageUp' });
    expect(r.getAttribute('aria-valuenow')).toBe('359');
    fireEvent.keyDown(r, { key: 'Home' });
    expect(r.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(r, { key: 'ArrowLeft' });
    expect(r.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(r, { key: 'End' });
    expect(r.getAttribute('aria-valuenow')).toBe('359');
  });

  it('ignores other keys and reports a keystroke once through onCommit', () => {
    const change = vi.fn();
    const commit = vi.fn();
    render(
      <ColorRail
        label="Alpha"
        min={0}
        max={100}
        value={100}
        valueText="Alpha 100 percent"
        track="none"
        thumb="#000"
        checker
        onChange={change}
        onCommit={commit}
      />,
    );
    const r = screen.getByRole('slider', { name: 'Alpha' });
    fireEvent.keyDown(r, { key: 'a' });
    expect(commit).not.toHaveBeenCalled();
    fireEvent.keyDown(r, { key: 'ArrowLeft' });
    expect(commit).toHaveBeenCalledWith(99);
    expect(change).not.toHaveBeenCalled();
  });

  it('a pointer press sets the value from its position on the track', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} min={0} max={100} />);
    const r = rail();
    r.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 112,
        height: 12,
        right: 112,
        bottom: 12,
      }) as DOMRect;
    // The usable track runs from 6 px to 106 px (the thumb stays inside).
    fireEvent.pointerDown(r, { button: 0, clientX: 31, pointerId: 1 });
    expect(spy).toHaveBeenLastCalledWith(25);
    fireEvent.pointerMove(r, { clientX: 200, pointerId: 1 });
    expect(spy).toHaveBeenLastCalledWith(100);
    fireEvent.pointerUp(r, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(r, { clientX: 6, pointerId: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
