/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ColorField } from './color-field';

function Harness({ spy }: { spy?: (css: string) => void }) {
  const [v, setV] = useState('#336699');
  return (
    <ColorField
      label="Ink"
      value={v}
      recent={[]}
      onChange={(css) => {
        setV(css);
        spy?.(css);
      }}
    />
  );
}

describe('ColorField', () => {
  it('reports valid text in any format and shows parse errors inline', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const field = screen.getByRole('textbox', { name: 'Ink' });
    fireEvent.change(field, { target: { value: 'hsl(0 100% 50%)' } });
    expect(spy).toHaveBeenLastCalledWith('hsl(0 100% 50%)');
    fireEvent.change(field, { target: { value: 'hsl(0 100%' } });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/is not a colour/)).toBeTruthy();
  });

  it('the swatch button opens the picker and picks update the text', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const trigger = screen.getByRole('button', { name: 'Choose Ink' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const dialog = screen.getByRole('dialog', { name: 'Ink' });
    const sat = screen.getByRole('slider', { name: 'Saturation' });
    expect(dialog.contains(sat)).toBe(true);
    fireEvent.keyDown(sat, { key: 'End' });
    const css = spy.mock.calls.at(-1)?.[0] as string;
    expect(css).toMatch(/^#[0-9a-f]{6}$/);
    expect(
      (screen.getByRole('textbox', { name: 'Ink' }) as HTMLInputElement).value,
    ).toBe(css);
  });
});
