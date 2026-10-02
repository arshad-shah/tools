/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InkField } from './InkField';

describe('InkField', () => {
  it('offers Black, Blue and Dark blue as swatches plus a custom colour', () => {
    const onChange = vi.fn();
    render(<InkField value="#111827" onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Ink colour' });
    expect(group).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Black' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByRole('radio', { name: 'Dark blue' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Custom colour' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Blue' }));
    expect(onChange).toHaveBeenCalledWith('#1d4ed8');
  });

  it('is disabled with the form', () => {
    render(<InkField value="#111827" onChange={() => {}} disabled />);
    expect(
      screen.getByRole('radio', { name: 'Blue' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});
