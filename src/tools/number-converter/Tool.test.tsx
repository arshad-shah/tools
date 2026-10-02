/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const field = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLInputElement;

async function setup() {
  const { default: NumberConverter } = await import('./Tool');
  const { numberSettings } = await import('./settings');
  render(<NumberConverter />);
  return numberSettings;
}

describe('NumberConverter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('updates every other field from the one typed in', async () => {
    await setup();
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FF' } });
    expect(field('Decimal').value).toBe('255');
    expect(field('Binary').value).toBe('11111111');
    expect(field('Octal').value).toBe('377');
    expect(field('Hexadecimal').value).toBe('FF');
  });

  it('clears the other fields and shows the error under the edited one', async () => {
    await setup();
    fireEvent.change(field('Decimal'), { target: { value: '42' } });
    expect(field('Binary').value).toBe('101010');
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FG' } });
    expect(
      screen.getByText('Digit G is not valid in base 16 at position 2'),
    ).toBeTruthy();
    expect(field('Decimal').value).toBe('');
    expect(field('Binary').value).toBe('');
    expect(field('Octal').value).toBe('');
    expect(field('Hexadecimal').value).toBe('FG');
  });

  it('toggling bit 0 updates the decimal field', async () => {
    await setup();
    fireEvent.change(field('Decimal'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bit 0, clear' }));
    expect(field('Decimal').value).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: 'Bit 0, set' }));
    expect(field('Decimal').value).toBe('4');
  });

  it('reads the pattern as signed at the chosen width', async () => {
    const settings = await setup();
    fireEvent.click(screen.getByRole('radio', { name: '8-bit' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Signed' }));
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FF' } });
    expect(field('Decimal').value).toBe('-1');
    expect(settings.getSettings()).toMatchObject({ bits: 8, signed: true });
  });

  it('warns when the value does not fit the width', async () => {
    await setup();
    fireEvent.click(screen.getByRole('radio', { name: '8-bit' }));
    fireEvent.change(field('Decimal'), { target: { value: '300' } });
    expect(screen.getByText(/does not fit in 8 bits/)).toBeTruthy();
  });

  it('the permission matrix edits the value both ways', async () => {
    await setup();
    fireEvent.change(field('Octal'), { target: { value: '750' } });
    expect(screen.getByText('rwxr-x---')).toBeTruthy();
    const otherRead = screen.getByRole('checkbox', { name: 'Others read' });
    expect(otherRead.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(otherRead);
    expect(field('Octal').value).toBe('754');
  });
});
