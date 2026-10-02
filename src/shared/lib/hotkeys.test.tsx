/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hotkeyLabel,
  hotkeyParts,
  isTypingTarget,
  listShortcuts,
  matchesHotkey,
  parseHotkey,
  registerShortcuts,
  useShortcuts,
} from './hotkeys';

const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('parseHotkey', () => {
  it('reads modifiers and lower-cases the key', () => {
    expect(parseHotkey('Mod+Shift+Z')).toEqual({
      mod: true,
      shift: true,
      alt: false,
      ctrl: false,
      key: 'z',
    });
    expect(parseHotkey('Alt+ArrowUp').key).toBe('ArrowUp');
    expect(parseHotkey('Mod++').key).toBe('+');
    expect(parseHotkey('+').key).toBe('+');
    expect(parseHotkey('Shift++').shift).toBe(true);
  });
});

describe('matchesHotkey', () => {
  it('Mod is Command on macOS and Control elsewhere', () => {
    expect(matchesHotkey(key({ metaKey: true, key: 'z' }), 'Mod+Z', true)).toBe(
      true,
    );
    expect(
      matchesHotkey(key({ metaKey: true, key: 'z' }), 'Mod+Z', false),
    ).toBe(false);
    expect(
      matchesHotkey(key({ ctrlKey: true, key: 'z' }), 'Mod+Z', false),
    ).toBe(true);
    expect(matchesHotkey(key({ ctrlKey: true, key: 'z' }), 'Mod+Z', true)).toBe(
      false,
    );
  });

  it('shift must match for letters', () => {
    expect(
      matchesHotkey(
        key({ metaKey: true, shiftKey: true, key: 'Z' }),
        'Mod+Shift+Z',
        true,
      ),
    ).toBe(true);
    expect(
      matchesHotkey(
        key({ metaKey: true, shiftKey: true, key: 'Z' }),
        'Mod+Z',
        true,
      ),
    ).toBe(false);
  });

  it('? implies its own shift', () => {
    expect(matchesHotkey(key({ key: '?', shiftKey: true }), '?', false)).toBe(
      true,
    );
  });

  it('Option-modified letters match by code on macOS', () => {
    expect(
      matchesHotkey(
        key({ altKey: true, key: String.fromCodePoint(0x3c0), code: 'KeyP' }),
        'Alt+P',
        true,
      ),
    ).toBe(true);
  });
});

describe('labels', () => {
  it('hotkeyLabel uses plain words', () => {
    expect(hotkeyLabel('Mod+K', true)).toBe('Command K');
    expect(hotkeyLabel('Mod+K', false)).toBe('Ctrl K');
    // macOS order: Control, Option, Shift, Command.
    expect(hotkeyLabel('Mod+Shift+Z', true)).toBe('Shift Command Z');
    expect(hotkeyLabel('Alt+ArrowUp', false)).toBe('Alt Up arrow');
  });

  it('hotkeyParts lists modifiers in display order', () => {
    expect(hotkeyParts('Alt+ArrowUp', true)).toEqual(['Alt', 'ArrowUp']);
    expect(hotkeyParts('Mod+Shift+Z', true)).toEqual(['Shift', 'Mod', 'Z']);
    expect(hotkeyParts('Mod+Shift+Z', false)).toEqual(['Mod', 'Shift', 'Z']);
    expect(hotkeyLabel('Mod+Shift+Z', false)).toBe('Ctrl Shift Z');
  });
});

describe('isTypingTarget', () => {
  it('detects fields', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    const box = document.createElement('input');
    box.type = 'checkbox';
    expect(isTypingTarget(box)).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('registerShortcuts', () => {
  let dispose: (() => void)[] = [];
  afterEach(() => {
    dispose.forEach((d) => d());
    dispose = [];
  });
  const reg = (...args: Parameters<typeof registerShortcuts>) => {
    const d = registerShortcuts(...args);
    dispose.push(d);
    return d;
  };

  it('single-letter shortcuts do not fire while typing', () => {
    const run = vi.fn();
    reg([{ id: 'p', combo: 'p', description: 'Pen', group: 'Tools', run }]);
    const input = document.createElement('input');
    document.body.append(input);
    input.dispatchEvent(key({ key: 'p', bubbles: true }));
    expect(run).not.toHaveBeenCalled();
    document.body.dispatchEvent(key({ key: 'p', bubbles: true }));
    expect(run).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('the disposer removes the shortcuts', () => {
    const run = vi.fn();
    const d = reg([
      { id: 'p', combo: 'p', description: 'Pen', group: 'Tools', run },
    ]);
    expect(listShortcuts().map((s) => s.id)).toContain('p');
    d();
    expect(listShortcuts().map((s) => s.id)).not.toContain('p');
    document.body.dispatchEvent(key({ key: 'p', bubbles: true }));
    expect(run).not.toHaveBeenCalled();
  });

  it('the latest registration whose when() holds wins', () => {
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    reg([{ id: 'a', combo: 'x', description: 'A', group: 'G', run: first }]);
    reg([{ id: 'b', combo: 'x', description: 'B', group: 'G', run: second }]);
    reg([
      {
        id: 'c',
        combo: 'x',
        description: 'C',
        group: 'G',
        when: () => false,
        run: third,
      },
    ]);
    document.body.dispatchEvent(key({ key: 'x', bubbles: true }));
    expect(third).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('registry policy (review M17)', () => {
  let dispose: (() => void)[] = [];
  afterEach(() => {
    dispose.forEach((d) => d());
    dispose = [];
  });
  const field = () => {
    const input = document.createElement('input');
    document.body.append(input);
    return input;
  };

  it('modified shortcuts leave text fields alone unless allowInFields', () => {
    const undo = vi.fn();
    const palette = vi.fn();
    dispose.push(
      registerShortcuts([
        {
          id: 'undo',
          combo: 'Mod+Z',
          description: 'Undo',
          group: 'G',
          run: undo,
        },
        {
          id: 'k',
          combo: 'Mod+K',
          description: 'Palette',
          group: 'G',
          allowInFields: true,
          run: palette,
        },
      ]),
    );
    const input = field();
    input.dispatchEvent(
      key({ key: 'z', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    expect(undo).not.toHaveBeenCalled();
    input.dispatchEvent(
      key({ key: 'k', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    expect(palette).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('ignores keys while an IME composes', () => {
    const run = vi.fn();
    dispose.push(
      registerShortcuts([
        { id: 'p', combo: 'p', description: 'P', group: 'G', run },
      ]),
    );
    document.body.dispatchEvent(
      key({ key: 'p', isComposing: true, bubbles: true }),
    );
    document.body.dispatchEvent(key({ key: 'Process', bubbles: true }));
    expect(run).not.toHaveBeenCalled();
  });

  it('re-rendering an owner keeps its place in the stack', () => {
    const a = vi.fn();
    const b = vi.fn();
    const A = ({ n }: { n: number }) => {
      useShortcuts(
        [
          {
            id: 'a',
            combo: 'x',
            description: 'A',
            group: 'G',
            run: () => a(n),
          },
        ],
        [n],
      );
      return null;
    };
    const B = () => {
      useShortcuts(
        [{ id: 'b', combo: 'x', description: 'B', group: 'G', run: b }],
        [],
      );
      return null;
    };
    const { rerender } = render(
      <>
        <A n={1} />
        <B />
      </>,
    );
    rerender(
      <>
        <A n={2} />
        <B />
      </>,
    );
    document.body.dispatchEvent(key({ key: 'x', bubbles: true }));
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });
});
