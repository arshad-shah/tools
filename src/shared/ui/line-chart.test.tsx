/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart } from './line-chart';

describe('LineChart', () => {
  it('plots finite values with labelled ticks', () => {
    const { container } = render(
      <LineChart
        label="Revenue"
        values={[1, Number.NaN, 3, 5]}
        formatTick={(v) => `v${v}`}
      />,
    );
    expect(screen.getByRole('img', { name: 'Revenue' })).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    const ticks = [...container.querySelectorAll('text')].map(
      (t) => t.textContent,
    );
    expect(ticks).toEqual(['v1', 'v2', 'v3', 'v4', 'v5']);
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M /);
  });
  it('shows the empty text at the chart height when nothing is plottable', () => {
    render(<LineChart label="Empty" values={[Number.NaN]} height={120} />);
    const empty = screen.getByText('No numeric data to plot');
    expect(empty.style.height).toBe('120px');
  });
});
