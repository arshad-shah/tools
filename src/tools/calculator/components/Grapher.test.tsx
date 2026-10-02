/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COLORS,
  contextOf,
  installChartStubs,
  resetChartStubs,
} from '@/shared/ui/chart/test-utils';
import { Grapher } from './Grapher';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

const chart = () => screen.getByRole('img', { name: 'Graph of the functions' });
const strokes = (colour: string) =>
  contextOf(chart()).calls.filter(
    (c) => c.strokeStyle === colour && c.name === 'lineTo',
  );
const fn = (n: number) => screen.getByLabelText(`f${n}(x) =`);

describe('Grapher', () => {
  it('plots the first function on the kit chart', () => {
    render(<Grapher angle="rad" />);
    expect(fn(1)).toHaveProperty('value', 'sin(x)');
    expect(strokes(COLORS['--chart-1']).length).toBeGreaterThan(20);
  });

  it('lists the two roots of x^2 - 2 and centres the range on a click', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: 'x^2 - 2' } });
    expect(screen.getByText('f1 root at x = -1.414213562')).toBeTruthy();
    const root = screen.getByText('f1 root at x = 1.414213562');
    fireEvent.click(root);
    expect(screen.getByLabelText('Minimum X value')).toHaveProperty(
      'value',
      String(1.4142135623730951 - 10),
    );
  });

  it('adds a second colour-coded function and lists intersections', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Add function'));
    fireEvent.change(fn(2), { target: { value: 'x^2' } });
    expect(strokes(COLORS['--chart-2']).length).toBeGreaterThan(5);
    expect(screen.getByText('f1 meets f2 at (0, 0)')).toBeTruthy();
    expect(screen.getByText('f1 meets f2 at (1, 1)')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove f2'));
    expect(screen.queryByLabelText('f2(x) =')).toBeNull();
  });

  it('caps the list at six functions', () => {
    render(<Grapher angle="rad" />);
    const add = screen.getByText('Add function').closest('button')!;
    for (let i = 0; i < 6; i++) fireEvent.click(add);
    expect(screen.getAllByLabelText(/^Remove f/)).toHaveLength(6);
    expect(add.disabled).toBe(true);
  });

  it('reports a function it cannot plot', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: '2 +' } });
    expect(screen.getByText(/Cannot plot/)).toBeTruthy();
    expect(screen.getByText('None in this range')).toBeTruthy();
  });
});
