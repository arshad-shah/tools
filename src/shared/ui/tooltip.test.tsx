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
    const utils = render(
      <Tooltip content="Undo">
        <button type="button">u</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button');
    const wrapper = button.parentElement!;
    const bubble = () => document.querySelector('[data-tooltip-bubble]');
    return { button, wrapper, bubble, utils };
  };

  it('shows on hover and stays while the pointer is over the bubble', () => {
    vi.useFakeTimers();
    const { wrapper, bubble, utils } = setup();
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(wrapper);
    expect(bubble()).not.toBeNull();
    // Portalled out of the trigger (scrolling bars never clip it) and
    // accepts the pointer.
    expect(utils.container.contains(bubble())).toBe(false);
    expect(bubble()!.className).not.toContain('pointer-events-none');
    // Crossing the gap to the bubble keeps it open.
    fireEvent.pointerLeave(wrapper);
    fireEvent.pointerEnter(bubble()!);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()).not.toBeNull();
    // Leaving the bubble closes it after the grace period.
    fireEvent.pointerLeave(bubble()!);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()).toBeNull();
    vi.useRealTimers();
  });

  it('flips and shifts inside the viewport, with the arrow on the trigger', () => {
    const { wrapper, bubble } = setup();
    // A trigger in the top-left corner: no room above, none to the left.
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 32, 32),
    );
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(24);
    fireEvent.pointerEnter(wrapper);
    const b = bubble() as HTMLElement;
    expect(b.dataset.side).toBe('bottom');
    expect(parseFloat(b.style.left)).toBe(8);
    expect(parseFloat(b.style.top)).toBeGreaterThanOrEqual(32);
    const arrow = b.querySelector<HTMLElement>('[data-tooltip-arrow]')!;
    // The trigger's centre (16px) sits 8px into the shifted bubble.
    expect(parseFloat(arrow.style.left)).toBe(8);
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
