/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Calculator from './Tool';
import { useCalculatorStore } from './store';

// Plotly needs a real browser; the graph is covered by e2e.
vi.mock('react-plotly.js', () => ({ default: () => null }));

// Text/label queries, not role queries: role matching walks the whole
// calculator tree and is slow enough to time out in a loaded full run.
const historyHeading = () => screen.queryByText('History', { selector: 'h3' });
const press = (label: string) =>
  fireEvent.click(screen.getByLabelText(label, { selector: 'button' }));

describe('Calculator panels', () => {
  beforeEach(() => {
    useCalculatorStore.getState().setHistory(['1 + 2 = 3']);
    useCalculatorStore.getState().setSaved([]);
  });

  it('starts with the History card open when saved history exists, and the button toggles it', () => {
    render(<Calculator />);
    expect(historyHeading()).not.toBeNull();
    expect(screen.getByText('1 + 2 = 3')).toBeTruthy();

    press('History');
    expect(historyHeading()).toBeNull();

    press('History');
    expect(historyHeading()).not.toBeNull();
  });

  it('starts with the History card closed when there is no history', () => {
    useCalculatorStore.getState().setHistory([]);
    render(<Calculator />);
    expect(historyHeading()).toBeNull();
  });

  it('closes History when Memory or Saved calculations opens, and vice versa', () => {
    useCalculatorStore.getState().setHistory([]);
    render(<Calculator />);
    press('History');
    press('Memory');
    expect(historyHeading()).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Memory registers' }),
    ).toBeTruthy();

    press('History');
    expect(historyHeading()).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Memory registers' })).toBe(
      null,
    );

    press('Saved calculations');
    expect(historyHeading()).toBeNull();
  });

  it('opens to an empty state when there is no history', () => {
    useCalculatorStore.getState().setHistory([]);
    render(<Calculator />);
    press('History');
    expect(historyHeading()).not.toBeNull();
    expect(screen.getByText('No calculations yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
