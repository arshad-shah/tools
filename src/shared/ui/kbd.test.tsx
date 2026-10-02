/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findBanned } from '../../../eslint-rules/banned-glyphs.js';
import { Kbd } from './kbd';
import { ShortcutHint } from './shortcut-hint';

const platform = (p: string) =>
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(p);

afterEach(() => vi.restoreAllMocks());

describe('Kbd', () => {
  it('on macOS draws modifiers as key icons and letters as text', () => {
    platform('MacIntel');
    const { container } = render(<Kbd keys="Mod+Shift+Z" />);
    const chips = container.querySelectorAll('kbd');
    expect(chips).toHaveLength(3);
    expect(chips[0].querySelector('svg')).not.toBeNull();
    expect(chips[1].querySelector('svg')).not.toBeNull();
    expect(chips[2].textContent).toBe('Z');
  });

  it('elsewhere modifiers read as words', () => {
    platform('Win32');
    const { container } = render(<Kbd keys="Mod+Shift+Z" />);
    const text = [...container.querySelectorAll('kbd')].map(
      (k) => k.textContent,
    );
    expect(text).toEqual(['Ctrl', 'Shift', 'Z']);
  });

  it('arrow keys are icons on every platform', () => {
    for (const p of ['MacIntel', 'Win32']) {
      platform(p);
      const { container, unmount } = render(<Kbd keys="ArrowUp" />);
      expect(container.querySelector('kbd svg')).not.toBeNull();
      unmount();
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
    expect(container.querySelector('.sr-only')?.textContent).toBe('Command K');
    expect(container.querySelector('[aria-hidden="true"] kbd')).not.toBeNull();
  });

  it('renders no banned glyph as text', () => {
    for (const p of ['MacIntel', 'Win32']) {
      platform(p);
      const { container, unmount } = render(
        <ShortcutHint keys="Mod+Alt+Shift+Enter" />,
      );
      expect(findBanned(container.textContent ?? '')).toBeNull();
      unmount();
      vi.restoreAllMocks();
    }
  });
});
