/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnchoredToolbar, DockedToolbar } from './context-bar';
import { revealRect } from './reveal';
import { PageTextInput } from './page-text';
import { Stepper } from './stepper';
import { readVisibleViewport } from './use-visual-viewport';

const anchor = { getBoundingClientRect: () => new DOMRect(100, 300, 160, 20) };

describe('Stepper', () => {
  it('steps, clamps and names its parts', () => {
    const onValueChange = vi.fn();
    render(
      <Stepper
        value={10}
        min={6}
        max={72}
        step={0.5}
        label="Text size in points"
        decrementLabel="Smaller text"
        incrementLabel="Larger text"
        onValueChange={onValueChange}
      />,
    );
    const field = screen.getByRole('spinbutton', {
      name: 'Text size in points',
    });
    expect((field as HTMLInputElement).value).toBe('10');
    fireEvent.click(screen.getByRole('button', { name: 'Larger text' }));
    expect(onValueChange).toHaveBeenLastCalledWith(10.5);
    fireEvent.click(screen.getByRole('button', { name: 'Smaller text' }));
    expect(onValueChange).toHaveBeenLastCalledWith(9.5);
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onValueChange).toHaveBeenLastCalledWith(10.5);
  });

  it('keeps a typed draft until it is in range, and restores on blur', () => {
    const onValueChange = vi.fn();
    render(
      <Stepper
        value={10}
        min={6}
        max={72}
        label="Size"
        onValueChange={onValueChange}
      />,
    );
    const field = screen.getByRole('spinbutton', { name: 'Size' });
    fireEvent.change(field, { target: { value: '1' } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect((field as HTMLInputElement).value).toBe('1');
    fireEvent.change(field, { target: { value: '14' } });
    expect(onValueChange).toHaveBeenLastCalledWith(14);
    fireEvent.change(field, { target: { value: '1' } });
    fireEvent.blur(field);
    expect((field as HTMLInputElement).value).toBe('10');
  });

  it('disables a button at its limit', () => {
    render(
      <Stepper
        value={6}
        min={6}
        max={72}
        label="Size"
        onValueChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Decrease' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});

describe('AnchoredToolbar', () => {
  it('is a named toolbar; Esc calls onEscape and returns focus', () => {
    const onEscape = vi.fn();
    render(
      <>
        <input aria-label="Editor" />
        <AnchoredToolbar
          anchor={anchor}
          label="Text settings"
          onEscape={onEscape}
        >
          <button type="button">Bold</button>
        </AnchoredToolbar>
      </>,
    );
    const bar = screen.getByRole('toolbar', { name: 'Text settings' });
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    const bold = screen.getByRole('button', { name: 'Bold' });
    editor.focus();
    fireEvent.focus(bold, { relatedTarget: editor });
    bold.focus();
    fireEvent.keyDown(bold, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(editor);
    expect(bar.getAttribute('aria-orientation')).toBe('horizontal');
  });
});

describe('DockedToolbar', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
  });

  it('sits above the on-screen keyboard', () => {
    let height = 844;
    const listeners = new Set<() => void>();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 844,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() {
          return height;
        },
        offsetTop: 0,
        addEventListener: (_: string, f: () => void) => listeners.add(f),
        removeEventListener: (_: string, f: () => void) => listeners.delete(f),
      },
    });
    render(
      <DockedToolbar label="Text settings">
        <button type="button">Done</button>
      </DockedToolbar>,
    );
    const bar = screen.getByRole('toolbar', { name: 'Text settings' });
    expect(bar.style.bottom).toBe('0px');
    height = 544;
    act(() => listeners.forEach((f) => f()));
    expect(bar.style.bottom).toBe('300px');
    expect(readVisibleViewport().bottomInset).toBe(300);
  });
});

describe('revealRect', () => {
  it('scrolls the scroll parent so the box clears the bar', () => {
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    Object.defineProperty(scroller, 'scrollHeight', { value: 5000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 800 });
    const child = document.createElement('div');
    scroller.appendChild(child);
    document.body.appendChild(scroller);
    const moved = revealRect(child, new DOMRect(0, 700, 100, 20), 8, 500);
    expect(moved).toBe(220);
    expect(scroller.scrollTop).toBe(220);
    expect(revealRect(child, new DOMRect(0, 100, 100, 20), 8, 500)).toBe(0);
    scroller.remove();
  });
});

describe('PageTextInput', () => {
  it('is a transparent named text field sized to the page text', () => {
    const onChange = vi.fn();
    render(
      <PageTextInput
        aria-label="Surname"
        value="Do"
        fontPx={22}
        spacingPx={3}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Surname' });
    expect(input.style.fontSize).toBe('22px');
    expect(input.style.letterSpacing).toBe('3px');
    expect(input.className).toContain('text-transparent');
    expect(input.className).toContain('bg-transparent');
    fireEvent.change(input, { target: { value: 'Doe' } });
    expect(onChange).toHaveBeenCalledWith('Doe');
  });
});
