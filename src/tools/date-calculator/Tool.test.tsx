/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DateCalculator from './Tool';

const renderTool = () =>
  render(
    <MemoryRouter>
      <DateCalculator />
    </MemoryRouter>,
  );

describe('DateCalculator', () => {
  it('renders and recomputes without a render loop', () => {
    render(
      <MemoryRouter>
        <DateCalculator />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Start', { selector: 'input' }), {
      target: { value: '2023-01-15' },
    });
    fireEvent.change(screen.getByLabelText('End', { selector: 'input' }), {
      target: { value: '2024-02-19' },
    });
    expect(
      screen.getByRole('heading', { name: '1 year, 1 month and 4 days' }),
    ).toBeTruthy();
  });

  it('keeps Now in the field and the zone under More about', () => {
    renderTool();
    const start = screen.getByLabelText('Start', { selector: 'input' });
    fireEvent.click(screen.getByRole('button', { name: 'Start: now' }));
    expect(start).toHaveProperty('value', 'now');
    const more = screen.getByRole('button', { name: /More about start/ });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen.getByRole('combobox', { name: 'Start time zone' }),
    ).toBeTruthy();
  });

  it('asks about month ends only when a step can reach one', () => {
    renderTool();
    fireEvent.click(screen.getByRole('radio', { name: 'Add or subtract' }));
    // The default step adds a month.
    expect(
      screen.getByRole('radio', { name: 'Roll into next month' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('combobox', { name: 'Step 1 unit' }));
    fireEvent.click(screen.getByRole('option', { name: 'Days' }));
    expect(
      screen.queryByRole('radio', { name: 'Roll into next month' }),
    ).toBeNull();
  });

  it('keeps holidays in a closed section with their count', () => {
    renderTool();
    fireEvent.click(screen.getByRole('radio', { name: 'Business days' }));
    const section = screen.getByRole('button', { name: /^Holidays/ });
    expect(section.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(section);
    fireEvent.change(screen.getByLabelText('Holidays (one date per line)'), {
      target: { value: '2024-12-25' },
    });
    expect(screen.getByText(/^1 holiday\./)).toBeTruthy();
  });
});
