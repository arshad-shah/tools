/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter } from './meter';

describe('Meter', () => {
  it('is a labelled meter with value and value text', () => {
    render(<Meter value={0.62} label="Password strength" valueText="Fair" />);
    const m = screen.getByRole('meter', { name: 'Password strength' });
    expect(m.getAttribute('aria-valuenow')).toBe('0.62');
    expect(m.getAttribute('aria-valuemin')).toBe('0');
    expect(m.getAttribute('aria-valuemax')).toBe('1');
    expect(m.getAttribute('aria-valuetext')).toBe('Fair');
    expect(screen.getByText('Fair')).toBeTruthy();
  });

  it('auto tone: below 0.4 danger, below 0.7 warning, else ok', () => {
    const { rerender } = render(<Meter value={0} label="M" valueText="w" />);
    const tone = (value: number) => {
      rerender(<Meter value={value} label="M" valueText="w" />);
      return screen.getByRole('meter').dataset.tone;
    };
    expect(tone(0)).toBe('danger');
    expect(tone(0.39)).toBe('danger');
    expect(tone(0.4)).toBe('warning');
    expect(tone(0.69)).toBe('warning');
    expect(tone(0.7)).toBe('ok');
    expect(tone(1)).toBe('ok');
    rerender(<Meter value={0.9} tone="danger" label="M" valueText="w" />);
    expect(screen.getByRole('meter').dataset.tone).toBe('danger');
  });

  it('clamps the value and fills segments', () => {
    const { container } = render(
      <Meter value={1.4} segments={4} label="M" valueText="Full" />,
    );
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1');
    expect(container.querySelectorAll('[data-segment]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-segment="on"]')).toHaveLength(4);
  });

  it('fills partial segments by rounding', () => {
    const { container } = render(
      <Meter value={0.5} segments={4} label="M" valueText="Half" />,
    );
    expect(container.querySelectorAll('[data-segment="on"]')).toHaveLength(2);
  });
});
