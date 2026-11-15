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

  it('names the Command key on macOS with a text alternative', () => {
    platform('MacIntel');
    render(
      <Tooltip content="Search" shortcut="Mod+K">
        <button type="button">s</button>
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip.querySelector('[aria-hidden="true"]')?.textContent).toContain(
      'Cmd',
    );
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
    const bubble = () => screen.queryByRole('tooltip');
    return { button, wrapper, bubble };
  };

  it('shows on hover and stays while the pointer is over the bubble', () => {
    vi.useFakeTimers();
    const { wrapper, bubble } = setup();
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(wrapper);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()?.textContent).toBe('Undo');
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

  it('Escape dismisses it without moving focus', () => {
    vi.useFakeTimers();
    const { button, wrapper, bubble } = setup();
    act(() => button.focus());
    fireEvent.pointerEnter(wrapper);
    act(() => vi.advanceTimersByTime(500));
    expect(bubble()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(bubble()).toBeNull();
    expect(document.activeElement).toBe(button);
    vi.useRealTimers();
  });

  it('the description stays mounted for assistive tech while hidden', () => {
    const { button } = setup();
    const desc = document.getElementById(
      button.getAttribute('aria-describedby')!,
    );
    expect(desc?.textContent).toBe('Undo');
  });
});
