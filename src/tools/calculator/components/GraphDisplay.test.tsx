/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COLORS,
  contextOf,
  installChartStubs,
  resetChartStubs,
} from '@/shared/ui/chart/test-utils';
import { GraphDisplay } from './GraphDisplay';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

const strokes = (el: HTMLElement) =>
  contextOf(el).calls.filter(
    (c) => c.strokeStyle === COLORS['--chart-1'] && c.name === 'lineTo',
  );

describe('GraphDisplay', () => {
  it('plots the compiled expression as a function chart', () => {
    render(<GraphDisplay expression="sin(x)" angleUnit="rad" />);
    const chart = screen.getByRole('img', { name: 'Graph of f(x) = sin(x)' });
    expect(strokes(chart).length).toBeGreaterThan(20);
    expect(screen.getByText('f(x) = sin(x)')).toBeTruthy();
  });

  it('leaves a gap where the expression is undefined', () => {
    render(<GraphDisplay expression="1 / x" angleUnit="rad" />);
    const chart = screen.getByRole('img', { name: 'Graph of f(x) = 1 / x' });
    const moves = contextOf(chart).calls.filter(
      (c) => c.strokeStyle === COLORS['--chart-1'] && c.name === 'moveTo',
    );
    expect(moves).toHaveLength(2);
  });

  it('replots over a new x range', () => {
    render(<GraphDisplay expression="x^2" angleUnit="rad" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Show data table' }));
    const first = () =>
      screen.getAllByRole('row')[1].querySelector('th')!.textContent;
    expect(first()).toBe('-10');
    fireEvent.change(screen.getByLabelText('Minimum X value'), {
      target: { value: '-2' },
    });
    fireEvent.blur(screen.getByLabelText('Minimum X value'));
    expect(first()).toBe('-2');
  });

  it('reports an expression it cannot plot', () => {
    render(<GraphDisplay expression="2 +" angleUnit="rad" />);
    expect(screen.getByText(/Cannot plot/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
