/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { keyToAction } from './keys';

const ev = (
  key: string,
  target: unknown = { tagName: 'BODY' },
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
) =>
  ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target,
    ...mods,
  }) as Parameters<typeof keyToAction>[0];

describe('keyToAction', () => {
  it('maps digits, operators, decimal, enter, backspace, delete, escape, percent', () => {
    expect(keyToAction(ev('7'))).toEqual({ type: 'digit', digit: 7 });
    expect(keyToAction(ev('+'))).toEqual({ type: 'operator', op: '+' });
    expect(keyToAction(ev('-'))).toEqual({ type: 'operator', op: '-' });
    expect(keyToAction(ev('*'))).toEqual({ type: 'operator', op: '×' });
    expect(keyToAction(ev('/'))).toEqual({ type: 'operator', op: '÷' });
    expect(keyToAction(ev('^'))).toEqual({ type: 'operator', op: 'pow' });
    expect(keyToAction(ev('.'))).toEqual({ type: 'decimal' });
    expect(keyToAction(ev(','))).toEqual({ type: 'decimal' });
    expect(keyToAction(ev('Enter'))).toEqual({ type: 'equals' });
    expect(keyToAction(ev('='))).toEqual({ type: 'equals' });
    expect(keyToAction(ev('Backspace'))).toEqual({ type: 'backspace' });
    expect(keyToAction(ev('Delete'))).toEqual({ type: 'clear-entry' });
    expect(keyToAction(ev('Escape'))).toEqual({ type: 'clear' });
    expect(keyToAction(ev('%'))).toEqual({ type: 'percent' });
    expect(keyToAction(ev('a'))).toBeNull();
  });

  it('ignores keys typed into editable fields', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(keyToAction(ev('7', { tagName }))).toBeNull();
      expect(keyToAction(ev('Escape', { tagName }))).toBeNull();
    }
    expect(
      keyToAction(ev('7', { tagName: 'DIV', isContentEditable: true })),
    ).toBeNull();
    // Real DOM elements too.
    expect(keyToAction(ev('7', document.createElement('textarea')))).toBeNull();
  });

  it('lets a focused button handle Enter and Space itself', () => {
    expect(keyToAction(ev('Enter', { tagName: 'BUTTON' }))).toBeNull();
    expect(keyToAction(ev(' ', { tagName: 'BUTTON' }))).toBeNull();
    expect(keyToAction(ev('7', { tagName: 'BUTTON' }))).toEqual({
      type: 'digit',
      digit: 7,
    });
  });

  it('leaves shortcuts with modifiers to the browser', () => {
    expect(keyToAction(ev('c', undefined, { ctrlKey: true }))).toBeNull();
    expect(keyToAction(ev('1', undefined, { metaKey: true }))).toBeNull();
    expect(keyToAction(ev('1', undefined, { altKey: true }))).toBeNull();
  });
});
