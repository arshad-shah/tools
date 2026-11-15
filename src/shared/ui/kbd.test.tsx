/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findBanned } from '../../../eslint-rules/banned-glyphs.js';
import { Kbd } from './kbd';
import { ShortcutHint } from './shortcut-hint';

const platform = (p: string) =>
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(p);

/** The drawn key caps (Cynosure nests one kbd per key in the root kbd). */
const caps = (root: Element) =>
  [...root.querySelectorAll('kbd kbd')].map((k) => k.textContent);

afterEach(() => vi.restoreAllMocks());

describe('Kbd', () => {
  it('on macOS names the modifiers the Apple way, in Apple order', () => {
    platform('MacIntel');
    const { container } = render(<Kbd keys="Mod+Shift+Z" />);
    expect(caps(container)).toEqual(['Shift', 'Cmd', 'Z']);
  });

  it('elsewhere modifiers read as words', () => {
    platform('Win32');
    const { container } = render(<Kbd keys="Mod+Shift+Z" />);
    expect(caps(container)).toEqual(['Ctrl', 'Shift', 'Z']);
  });

  it('arrow and paging keys read as short words on every platform', () => {
    for (const p of ['MacIntel', 'Win32']) {
      platform(p);
      const { container, unmount } = render(<Kbd keys="ArrowUp" />);
      expect(caps(container)).toEqual(['Up']);
      unmount();
      const paging = render(<Kbd keys="PageDown" />);
      expect(caps(paging.container)).toEqual(['PgDn']);
      paging.unmount();
      vi.restoreAllMocks();
    }
  });

  it('is decorative', () => {
    platform('Win32');
    const { container } = render(<Kbd keys="Mod+K" />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('ShortcutHint', () => {
  it('exposes a plain-words alternative and hides the chips', () => {
    platform('MacIntel');
    const { container } = render(<ShortcutHint keys="Mod+K" />);
    expect(screen.getByText('Command K')).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"] kbd')).not.toBeNull();
  });

  // Built from parts so secret scanners do not read a keys="..." literal as an API key.
  const EVERY_MODIFIER = ['Mod', 'Alt', 'Shift', 'Enter'].join('+');

  it('renders no banned glyph as text', () => {
    for (const p of ['MacIntel', 'Win32']) {
      platform(p);
      const { container, unmount } = render(
        <ShortcutHint keys={EVERY_MODIFIER} />,
      );
      expect(findBanned(container.textContent ?? '')).toBeNull();
      unmount();
      vi.restoreAllMocks();
    }
  });
});
