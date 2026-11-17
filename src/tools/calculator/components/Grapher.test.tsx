/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { useCynosureTheme } from '@arshad-shah/cynosure';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  contextOf,
  installChartStubs,
  resetChartStubs,
} from '@/shared/charts/testing';
import { Grapher } from './Grapher';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

const chart = () => screen.getByRole('img', { name: 'Graph of the functions' });
/** The theme's series colours (swift-chart draws series in them). */
const series = () =>
  renderHook(() => useCynosureTheme()).result.current.colors.seriesColors;
const strokes = (colour: string) =>
  contextOf(chart()).calls.filter(
    (c) => c.strokeStyle === colour && c.name === 'lineTo',
  );
const fn = (n: number) => screen.getByLabelText(`f${n}(x) =`);

describe('Grapher', () => {
  it('plots the first function in the first series colour', () => {
    const [first] = series();
    render(<Grapher angle="rad" />);
    expect(fn(1)).toHaveProperty('value', 'sin(x)');
    expect(strokes(first).length).toBeGreaterThan(20);
  });

  it('pans and zooms with the Cynosure controls, and resets', () => {
    render(<Grapher angle="rad" />);
    const min = () => screen.getByLabelText('Min X');
    const max = () => screen.getByLabelText('Max X');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(Number((min() as HTMLInputElement).value)).toBeCloseTo(-10 / 1.5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pan right' }));
    expect(min()).toHaveProperty('value', '-5');
    expect(max()).toHaveProperty('value', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(Number((max() as HTMLInputElement).value)).toBeCloseTo(20);
  });

  it('reads out the functions under the pointer', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: '2x' } });
    const c = chart();
    // The middle of the plot area is x = 0.
    const box = c.getBoundingClientRect();
    fireEvent.mouseMove(c, { clientX: box.width / 2 + 25 });
    expect(screen.getByText(/^x = -?\d/).textContent).toMatch(
      /^x = (-?[\d.]+): f1 = (-?[\d.]+)$/,
    );
    const [, x, y] = /x = (-?[\d.]+): f1 = (-?[\d.]+)/.exec(
      screen.getByText(/^x = /).textContent!,
    )!;
    expect(Number(y)).toBeCloseTo(2 * Number(x));
  });

  it('shows sampled values as a data table', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: 'x^2' } });
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const rows = within(
      screen.getByRole('table', { name: 'Values of the functions' }),
    ).getAllByRole('row');
    expect(rows[0].textContent).toBe('xf1(x)');
    expect(rows[1].textContent).toBe('-10100');
    expect(rows[11].textContent).toBe('00');
  });

  it('lists the two roots of x^2 - 2 and centres the range on a click', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: 'x^2 - 2' } });
    expect(screen.getByText('f1 root at x = -1.414213562')).toBeTruthy();
    const root = screen.getByText('f1 root at x = 1.414213562');
    fireEvent.click(root);
    expect(screen.getByLabelText('Min X')).toHaveProperty(
      'value',
      String(1.4142135623730951 - 10),
    );
  });

  it('adds a second colour-coded function and lists intersections', () => {
    render(<Grapher angle="rad" />);
    fireEvent.change(fn(1), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Add function'));
    fireEvent.change(fn(2), { target: { value: 'x^2' } });
    expect(strokes(series()[1]).length).toBeGreaterThan(5);
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
