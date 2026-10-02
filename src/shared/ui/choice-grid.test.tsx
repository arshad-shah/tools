/** @vitest-environment jsdom */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChoiceGrid } from './choice-grid';

const OPTIONS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((v) => ({
  value: v,
  label: `Option ${v.toUpperCase()}`,
  render: () => <span>{v}</span>,
}));

function Harness({
  onChange = () => {},
  initial = 'a',
}: {
  onChange?: (v: string) => void;
  initial?: string | null;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <ChoiceGrid
      label="Font"
      value={value}
      columns={3}
      options={OPTIONS}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('ChoiceGrid', () => {
  it('is a named radiogroup of cards with visible labels', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Font' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(radio('Option A').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Option B')).toBeTruthy();
  });

  it('has one tab stop: the checked card, or the first', () => {
    const { unmount } = render(<Harness initial="e" />);
    expect(
      screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex')),
    ).toEqual(['-1', '-1', '-1', '-1', '0', '-1', '-1']);
    unmount();
    render(<Harness initial={null} />);
    expect(radio('Option A').getAttribute('tabindex')).toBe('0');
  });

  it('moves and selects with arrows in two dimensions', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const key = (k: string) =>
      fireEvent.keyDown(document.activeElement!, { key: k });
    const at = (name: string) => {
      expect(screen.getByRole('radio', { checked: true })).toBe(radio(name));
      expect(document.activeElement).toBe(radio(name));
    };
    radio('Option A').focus();
    key('ArrowDown');
    at('Option D');
    key('ArrowRight');
    at('Option E');
    key('ArrowDown');
    // Row 3 has only G: down from E stays put rather than leave the grid.
    at('Option E');
    key('ArrowLeft');
    key('ArrowDown');
    at('Option G');
    key('ArrowUp');
    at('Option D');
    key('End');
    at('Option G');
    key('Home');
    at('Option A');
    key('ArrowLeft');
    at('Option G');
    expect(onChange).toHaveBeenLastCalledWith('g');
  });

  it('selects on click and ignores input while disabled', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChoiceGrid
        label="Font"
        value="a"
        options={OPTIONS}
        onChange={onChange}
      />,
    );
    fireEvent.click(radio('Option C'));
    expect(onChange).toHaveBeenCalledWith('c');
    onChange.mockClear();
    rerender(
      <ChoiceGrid
        label="Font"
        value="a"
        options={OPTIONS}
        onChange={onChange}
        disabled
      />,
    );
    fireEvent.click(radio('Option C'));
    fireEvent.keyDown(radio('Option A'), { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
