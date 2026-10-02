/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BitGrid } from './bit-grid';

const bit = (i: number, state: 'set' | 'clear') =>
  screen.getByRole('button', { name: `Bit ${i}, ${state}` });

describe('BitGrid', () => {
  it('is a labelled group of bits, MSB first, with correct labels', () => {
    render(<BitGrid bits={8} value={0b1000_0101n} label="Flags" />);
    const group = screen.getByRole('group', { name: 'Flags' });
    const names = within(group)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual([
      'Bit 7, set',
      'Bit 6, clear',
      'Bit 5, clear',
      'Bit 4, clear',
      'Bit 3, clear',
      'Bit 2, set',
      'Bit 1, clear',
      'Bit 0, set',
    ]);
    expect(bit(7, 'set').getAttribute('aria-pressed')).toBe('true');
    expect(bit(6, 'clear').getAttribute('aria-pressed')).toBe('false');
  });

  it('groups by nibble and byte', () => {
    const { container } = render(<BitGrid bits={16} value={0n} />);
    expect(container.querySelectorAll('[data-byte]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-nibble]')).toHaveLength(4);
    expect(screen.getAllByRole('button')).toHaveLength(16);
  });

  it('toggling bit 0 of 0n emits onToggle(0)', () => {
    const onToggle = vi.fn();
    render(<BitGrid bits={8} value={0n} onToggle={onToggle} />);
    fireEvent.click(bit(0, 'clear'));
    expect(onToggle).toHaveBeenCalledWith(0);
  });

  it('handles 64-bit values', () => {
    render(<BitGrid bits={64} value={1n << 63n} />);
    expect(bit(63, 'set')).toBeTruthy();
    expect(bit(0, 'clear')).toBeTruthy();
  });

  it('Arrow keys, Home and End move a single tab stop', () => {
    render(<BitGrid bits={8} value={0n} onToggle={() => {}} />);
    const tabbable = () =>
      screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabbable()).toEqual([bit(7, 'clear')]);
    bit(7, 'clear').focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bit(6, 'clear'));
    expect(tabbable()).toEqual([bit(6, 'clear')]);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bit(7, 'clear'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bit(7, 'clear'));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(bit(0, 'clear'));
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(bit(7, 'clear'));
  });

  it('read-only bits do not toggle', () => {
    const onToggle = vi.fn();
    render(<BitGrid bits={8} value={1n} onToggle={onToggle} readOnly />);
    fireEvent.click(bit(0, 'set'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(bit(0, 'set').getAttribute('aria-disabled')).toBe('true');
  });
});
