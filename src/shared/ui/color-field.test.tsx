/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('on a phone the picker opens in a bottom sheet', () => {
    stubPhone(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Ink' }));
    const sheet = screen.getByRole('dialog', { name: 'Ink' });
    expect(sheet.getAttribute('data-side')).toBe('bottom');
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    expect(
      sheet.contains(screen.getByRole('slider', { name: 'Saturation' })),
    ).toBe(true);
  });

  it('on a desktop the picker opens in a scrollable popover', () => {
    stubPhone(false);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Ink' }));
    const pop = screen.getByRole('dialog', { name: 'Ink' });
    expect(pop.getAttribute('aria-modal')).toBeNull();
    const body = pop.querySelector('[data-color-field-body]') as HTMLElement;
    expect(body.className).toContain('overflow-y-auto');
    expect(body.style.maxHeight).toMatch(/px$/);
  });
});

const realMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

function stubPhone(phone: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: phone && q.includes('max-width'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}
