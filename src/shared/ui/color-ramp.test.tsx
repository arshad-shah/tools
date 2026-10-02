/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatColor, parseColor, scale } from '@/shared/lib/colour';
import { ColorRamp } from './color-ramp';

describe('ColorRamp', () => {
  it('renders the OKLCH scale as selectable steps', () => {
    const onSelect = vi.fn();
    render(<ColorRamp base="#3b82f6" label="Blue ramp" onSelect={onSelect} />);
    const group = screen.getByRole('group', { name: 'Blue ramp' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(11);
    const s500 = formatColor(scale(parseColor('#3b82f6'))[500], 'hex');
    fireEvent.click(screen.getByRole('button', { name: `500 ${s500}` }));
    expect(onSelect).toHaveBeenCalledWith(s500, expect.any(Object), 500);
  });

  it('marks the selected step and is read-only without onSelect', () => {
    const s300 = formatColor(scale(parseColor('#3b82f6'))[300], 'hex');
    render(<ColorRamp base="#3b82f6" label="Ramp" value={s300} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('img')).toHaveLength(11);
    expect(
      screen.getByRole('img', { name: `300 ${s300}` }).className,
    ).toContain('outline-focus');
  });

  it('shows the parse error for an invalid base', () => {
    render(<ColorRamp base="#12" label="Ramp" />);
    expect(screen.getByRole('alert').textContent).toMatch(/hex digits/);
  });
});
