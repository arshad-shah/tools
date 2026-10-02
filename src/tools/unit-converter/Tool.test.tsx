/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UnitConverter from './Tool';

const fromUnit = () =>
  screen.getByRole('combobox', { name: 'From unit' }) as HTMLSelectElement;
const toUnit = () =>
  screen.getByRole('combobox', { name: 'To unit' }) as HTMLSelectElement;
const fromValue = () =>
  screen.getByRole('textbox', { name: 'From value' }) as HTMLInputElement;
const category = (name: string) => fireEvent.click(screen.getByText(name));
const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }));

describe('UnitConverter', () => {
  it('resets the units to the first two of a newly chosen category', () => {
    render(<UnitConverter />);
    expect(fromUnit().value).toBe('Kilometers');
    expect(toUnit().value).toBe('Meters');

    category('Temperature');
    // Temperature lists Kelvin, Celsius, Fahrenheit: units[0] -> units[1].
    expect(fromUnit().value).toBe('Kelvin');
    expect(toUnit().value).toBe('Celsius');
  });

  it('keeps the chosen units when the selected category is clicked again', () => {
    render(<UnitConverter />);
    category('Temperature');
    fireEvent.change(fromUnit(), { target: { value: 'Celsius' } });
    fireEvent.change(toUnit(), { target: { value: 'Fahrenheit' } });

    category('Temperature');
    expect(fromUnit().value).toBe('Celsius');
    expect(toUnit().value).toBe('Fahrenheit');
  });

  it('reusing a history entry from another category keeps its units (B11)', () => {
    render(<UnitConverter />);
    fireEvent.change(fromUnit(), { target: { value: 'Miles' } });
    fireEvent.change(toUnit(), { target: { value: 'Feet' } });
    fireEvent.change(fromValue(), { target: { value: '2' } });
    fireEvent.blur(fromValue());

    category('Weight');
    expect(fromUnit().value).toBe('Tonnes');

    tab('History');
    fireEvent.click(screen.getByRole('button', { name: 'Reuse conversion' }));

    expect(fromUnit().value).toBe('Miles');
    expect(toUnit().value).toBe('Feet');
    expect(fromValue().value).toBe('2');
  });

  it('removes only the chosen entry when two are saved in the same millisecond', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    render(<UnitConverter />);
    fireEvent.change(fromValue(), { target: { value: '3' } });
    fireEvent.blur(fromValue());
    fireEvent.change(fromValue(), { target: { value: '4' } });
    fireEvent.blur(fromValue());

    tab('History');
    const removes = screen.getAllByRole('button', {
      name: 'Remove conversion',
    });
    expect(removes).toHaveLength(2);
    fireEvent.click(removes[0]);

    expect(
      screen.getAllByRole('button', { name: 'Remove conversion' }),
    ).toHaveLength(1);
    expect(screen.getByText('3 km')).toBeTruthy();
  });
});
