/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DateCalculator from './Tool';

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
});
