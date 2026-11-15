/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './date-input';
import { Input } from './input';

describe('Input', () => {
  it('is named by a separate label, exactly once', () => {
    render(
      <>
        <label htmlFor="n">Name</label>
        <Input id="n" value="" onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    expect(screen.getByLabelText('Name').id).toBe('n');
  });

  it('is named by aria-label and reports edits as text', () => {
    const onChange = vi.fn();
    render(<Input aria-label="Request URL" value="" onChange={onChange} />);
    const field = screen.getByRole('textbox', { name: 'Request URL' });
    fireEvent.change(field, { target: { value: 'https://a' } });
    expect(onChange).toHaveBeenLastCalledWith('https://a');
  });

  it('keeps the call site description and marks invalid', () => {
    render(
      <>
        <Input
          aria-label="Time"
          value="x"
          onChange={() => {}}
          invalid
          aria-describedby="why"
        />
        <p id="why">Not a time</p>
      </>,
    );
    const field = screen.getByRole('textbox', { name: 'Time' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('why');
  });

  it('clears when clearable', () => {
    const onChange = vi.fn();
    render(
      <Input aria-label="Find" value="abc" onChange={onChange} clearable />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('maps the compact size, also through DateInput', () => {
    render(
      <>
        <Input aria-label="Normal" value="" onChange={() => {}} />
        <Input aria-label="Compact" value="" onChange={() => {}} size="sm" />
        <DateInput label="Date" value="" onChange={() => {}} size="sm" />
      </>,
    );
    const size = (name: string) =>
      screen
        .getByLabelText(name)
        .closest('[data-size]')!
        .getAttribute('data-size');
    expect(size('Normal')).toBe('md');
    expect(size('Compact')).toBe('xs');
    expect(size('Date')).toBe('xs');
  });

  it('forwards the ref to the input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="R" value="" onChange={() => {}} />);
    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'R' }));
  });
});
