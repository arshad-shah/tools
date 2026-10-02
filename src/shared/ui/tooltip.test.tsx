/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './tooltip';

const platform = (p: string) =>
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(p);
afterEach(() => vi.restoreAllMocks());

describe('Tooltip', () => {
  it('describes its trigger', () => {
    render(
      <Tooltip content="Undo">
        <button type="button">u</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('shows the shortcut as words on Windows and Linux', () => {
    platform('Win32');
    render(
      <Tooltip content="Search" shortcut="Mod+K">
        <button type="button">s</button>
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.textContent).toContain('Ctrl');
    expect(tip.textContent).toContain('K');
  });

  it('shows the Command key icon on macOS with a text alternative', () => {
    platform('MacIntel');
    render(
      <Tooltip content="Search" shortcut="Mod+K">
        <button type="button">s</button>
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(
      tip.querySelectorAll('[aria-hidden="true"] svg').length,
    ).toBeGreaterThanOrEqual(1);
    expect(tip.textContent).toContain('Command K');
  });
});

describe('Tooltip, WCAG 1.4.13 (review M16)', () => {
  const setup = () => {
    render(
      <Tooltip content="Undo">
        <button type="button">u</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button');
    const wrapper = button.parentElement!;
    // The bubble is portaled to body.
    const bubble = () => document.querySelector('[data-tooltip-bubble]');
    return { button, wrapper, bubble };
  };

  it('shows on hover and stays while the pointer is over the bubble', () => {
    vi.useFakeTimers();
    const { wrapper, bubble } = setup();
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(wrapper);
    expect(bubble()).not.toBeNull();
    // Portaled out of any clipping ancestor, and it accepts the pointer.
    expect(bubble()!.parentElement).toBe(document.body);
    expect(bubble()!.className).not.toContain('pointer-events-none');
    // Crossing the gap from the trigger onto the bubble keeps it open.
    fireEvent.pointerLeave(wrapper);
    fireEvent.pointerEnter(bubble()!);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()).not.toBeNull();
    fireEvent.pointerLeave(bubble()!);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()).toBeNull();
    vi.useRealTimers();
  });

  it('carries an arrow and is placed with a fixed strategy', () => {
    const { wrapper, bubble } = setup();
    fireEvent.pointerEnter(wrapper);
    expect(bubble()!.querySelector('[data-tooltip-arrow]')).not.toBeNull();
    expect((bubble() as HTMLElement).style.position).toBe('fixed');
  });

  it('shows on focus and Escape dismisses it without moving focus', () => {
    const { button, bubble } = setup();
    act(() => button.focus());
    expect(bubble()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(bubble()).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('the description stays mounted for assistive tech while hidden', () => {
    const { button } = setup();
    const desc = document.getElementById(
      button.getAttribute('aria-describedby')!,
    );
    expect(desc?.textContent).toBe('Undo');
  });
});
