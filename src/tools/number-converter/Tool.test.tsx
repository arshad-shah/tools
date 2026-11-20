/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import NumberConverter from './Tool';
import { numberSettings } from './settings';

// Cheap queries (P6-H): label and text lookups, scoped where a name repeats,
// instead of page-wide role scans; one module load for the whole file.
const field = (name: string) =>
  screen.getByLabelText(name, { selector: 'input' }) as HTMLInputElement;
const inGroup = (label: string) => within(screen.getByLabelText(label));

function setup() {
  render(<NumberConverter />);
  return numberSettings;
}

describe('NumberConverter', () => {
  beforeEach(() => {
    localStorage.clear();
    const { result, unmount } = renderHook(() => numberSettings.useSettings());
    act(() => result.current[2]());
    unmount();
  });

  it('updates every other field from the one typed in', () => {
    setup();
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FF' } });
    expect(field('Decimal').value).toBe('255');
    expect(field('Binary').value).toBe('11111111');
    expect(field('Octal').value).toBe('377');
    expect(field('Hexadecimal').value).toBe('FF');
  });

  it('clears the other fields and shows the error under the edited one', () => {
    setup();
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

  it('toggling bit 0 updates the decimal field', () => {
    setup();
    fireEvent.change(field('Decimal'), { target: { value: '4' } });
    const bit0 = screen.getByRole('button', { name: 'Bit 0' });
    expect(bit0.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(bit0);
    expect(field('Decimal').value).toBe('5');
    expect(bit0.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(bit0);
    expect(field('Decimal').value).toBe('4');
  });

  it('reads the pattern as signed at the chosen width', () => {
    const settings = setup();
    fireEvent.click(inGroup('Word size').getByText('8-bit'));
    fireEvent.click(inGroup('Signedness').getByText('Signed'));
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FF' } });
    expect(field('Decimal').value).toBe('-1');
    expect(settings.getSettings()).toMatchObject({ bits: 8, signed: true });
  });

  it('warns when the value does not fit the width', () => {
    setup();
    fireEvent.click(inGroup('Word size').getByText('8-bit'));
    fireEvent.change(field('Decimal'), { target: { value: '300' } });
    expect(screen.getByText(/does not fit in 8 bits/)).toBeTruthy();
  });

  it('the permission matrix edits the value both ways', () => {
    setup();
    fireEvent.change(field('Octal'), { target: { value: '750' } });
    expect(screen.getByText('rwxr-x---')).toBeTruthy();
    const otherRead = screen.getByLabelText('Others read') as HTMLInputElement;
    expect(otherRead.checked).toBe(false);
    fireEvent.click(otherRead);
    expect(field('Octal').value).toBe('754');
  });

  it('arrow keys move between bits with one tab stop', () => {
    setup();
    const top = screen.getByRole('button', { name: 'Bit 31' });
    top.focus();
    fireEvent.keyDown(top, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Bit 0' }),
    );
  });

  it('each base field has a copy button once it has a value', () => {
    setup();
    expect(screen.queryByLabelText('Copy Binary')).toBeNull();
    fireEvent.change(field('Decimal'), { target: { value: '7' } });
    const copy = screen.getByLabelText('Copy Binary') as HTMLButtonElement;
    expect(copy.disabled).toBe(false);
  });

  it('offers an example while empty and Clear once filled', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(field('Hexadecimal').value).toBe('0xCAFE');
    expect(field('Decimal').value).toBe('51966');
    expect(screen.queryByRole('button', { name: 'Try an example' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(field('Decimal').value).toBe('');
  });

  it('keeps the custom base and byte encodings under More bases', () => {
    setup();
    fireEvent.change(field('Decimal'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'More bases' }));
    expect(field('Base 36').value).toBe('Z');
    const base = field('Custom base (2 to 36)');
    fireEvent.change(base, { target: { value: '16' } });
    fireEvent.blur(base);
    expect(field('Base 16').value).toBe('23');
    expect(field('Base58 (bytes, Bitcoin alphabet)').value).not.toBe('');
  });
});
