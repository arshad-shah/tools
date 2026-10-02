/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ColorSwatchPicker } from './color-swatch-picker';

const OPTIONS = [
  { value: '#ffd400', label: 'Yellow' },
  { value: '#5fd068', label: 'Green' },
  { value: '#4aa8ff', label: 'Blue' },
];

function Harness({ onChange = () => {} }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('#ffd400');
  return (
    <ColorSwatchPicker
      label="Colour"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={OPTIONS}
      allowCustom
    />
  );
}

describe('ColorSwatchPicker', () => {
  it('is a radiogroup with one tab stop on the checked swatch', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Colour' });
    const radios = screen.getAllByRole('radio');
    expect(group).toBeTruthy();
    expect(radios).toHaveLength(4);
    expect(
      screen
        .getByRole('radio', { name: 'Yellow' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it('arrow keys move and select, wrapping; Home and End jump', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const yellow = screen.getByRole('radio', { name: 'Yellow' });
    yellow.focus();
    fireEvent.keyDown(yellow, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('#5fd068');
    const green = screen.getByRole('radio', { name: 'Green' });
    expect(document.activeElement).toBe(green);
    expect(green.tabIndex).toBe(0);
    fireEvent.keyDown(green, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('#ffd400');
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    // End lands on the custom choice: focus only, no change.
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'Custom colour' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('#ffd400');
  });

  it('custom opens a hex field and checks the custom choice', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom colour' }));
    const hex = screen.getByRole('textbox', { name: 'Colour hex' });
    fireEvent.change(hex, { target: { value: '#123456' } });
    expect(
      screen
        .getByRole('radio', { name: 'Custom colour #123456' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('can show its label and is named by it', () => {
    render(
      <ColorSwatchPicker
        label="Ink colour"
        showLabel
        value="#ffd400"
        onChange={() => {}}
        options={OPTIONS}
      />,
    );
    expect(screen.getByText('Ink colour')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Ink colour' })).toBeTruthy();
  });

  it('disabled: no choice can be made', () => {
    const onChange = vi.fn();
    render(
      <ColorSwatchPicker
        label="Colour"
        value="#ffd400"
        onChange={onChange}
        options={OPTIONS}
        allowCustom
        disabled
      />,
    );
    const green = screen.getByRole('radio', { name: 'Green' });
    expect(green.hasAttribute('disabled')).toBe(true);
    fireEvent.click(green);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Yellow' }), {
      key: 'ArrowRight',
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
