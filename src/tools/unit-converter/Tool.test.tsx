/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const row = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLInputElement;

async function setup() {
  const { default: UnitConverter } = await import('./Tool');
  const { unitSettings } = await import('./settings');
  render(<UnitConverter />);
  return unitSettings;
}

// Each test re-imports the tool (fresh store); the first import is slow
// under a full parallel run, so the budget is wider than the default.
describe('UnitConverter', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('converts from whichever row is typed in', async () => {
    await setup();
    fireEvent.change(row('Kilometres'), { target: { value: '5' } });
    expect(row('Miles').value).toBe('3.106855961');
    expect(row('Metres').value).toBe('5000');
    fireEvent.change(row('Miles'), { target: { value: '1' } });
    expect(row('Metres').value).toBe('1609.344');
    expect(row('Miles').value).toBe('1');
  });

  it('adds to history after 800 ms of no typing, not on blur', async () => {
    vi.useFakeTimers();
    const settings = await setup();
    fireEvent.change(row('Kilometres'), { target: { value: '2' } });
    fireEvent.blur(row('Kilometres'));
    act(() => vi.advanceTimersByTime(500));
    expect(settings.getSettings().history).toHaveLength(0);
    fireEvent.change(row('Kilometres'), { target: { value: '3' } });
    act(() => vi.advanceTimersByTime(799));
    expect(settings.getSettings().history).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1));
    expect(settings.getSettings().history).toMatchObject([
      { category: 'length', from: 'km', amount: 3 },
    ]);
  });

  it('jumps to the category a free-text quantity names', async () => {
    await setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Convert' }), {
      target: { value: '72F' },
    });
    expect(row('Fahrenheit').value).toBe('72');
    expect(row('Celsius').value).toBe('22.22222222');
    fireEvent.change(screen.getByRole('textbox', { name: 'Convert' }), {
      target: { value: '5 ft 3 in to cm' },
    });
    expect(screen.getByText('160.02 cm')).toBeTruthy();
  });

  it('shows tiny values with an exponent', async () => {
    await setup();
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'energy' },
    });
    fireEvent.change(row('Electronvolts'), { target: { value: '1' } });
    expect(row('Joules').value).toBe('1.602176634e-19');
  });

  it('pins a unit to the top and persists it', async () => {
    const settings = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pin Miles' }));
    const inputs = screen.getAllByRole('textbox');
    // The free-text box comes first, then the pinned row.
    expect(inputs[1]).toBe(row('Miles'));
    expect(settings.getSettings().favourites).toEqual(['length:mi']);
  });

  it('marks text that is not a number as invalid', async () => {
    await setup();
    fireEvent.change(row('Metres'), { target: { value: 'abc' } });
    expect(row('Metres').getAttribute('aria-invalid')).toBe('true');
    expect(row('Miles').value).toBe('');
  });
});

describe('UnitConverter history', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.useRealTimers());

  it('does not record the untouched default value', async () => {
    vi.useFakeTimers();
    const settings = await setup();
    act(() => vi.advanceTimersByTime(2000));
    expect(settings.getSettings().history).toHaveLength(0);
  });
});
