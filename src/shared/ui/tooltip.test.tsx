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
    const bubble = () => utils.container.querySelector('[data-tooltip-bubble]');
    return { button, wrapper, bubble };
  };

  it('shows on hover and stays while the pointer is over the bubble', () => {
    const { wrapper, bubble } = setup();
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(wrapper);
    expect(bubble()).not.toBeNull();
    // The bubble is inside the wrapper and accepts the pointer.
    expect(wrapper.contains(bubble())).toBe(true);
    expect(bubble()!.className).not.toContain('pointer-events-none');
    fireEvent.pointerLeave(wrapper);
    expect(bubble()).toBeNull();
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
