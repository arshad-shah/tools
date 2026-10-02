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
    fireEvent.click(screen.getByLabelText('Bit 0, clear'));
    expect(field('Decimal').value).toBe('5');
    fireEvent.click(screen.getByLabelText('Bit 0, set'));
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
    const otherRead = screen.getByLabelText('Others read');
    expect(otherRead.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(otherRead);
    expect(field('Octal').value).toBe('754');
  });

  it('each base field has a kit copy button', () => {
    setup();
    fireEvent.change(field('Decimal'), { target: { value: '7' } });
    const copy = screen.getByLabelText('Copy Binary') as HTMLButtonElement;
    expect(copy.disabled).toBe(false);
  });
});
