/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { shouldHandleCalculatorKey } from './keyboard';

const key = (target: EventTarget, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: '5', ...init });
  Object.defineProperty(e, 'target', { value: target });
  return e;
};

describe('shouldHandleCalculatorKey', () => {
  it('handles keys aimed at the page', () => {
    expect(shouldHandleCalculatorKey(key(document.body))).toBe(true);
  });

  it.each(['textarea', 'input', 'select'])(
    'leaves keys typed into a %s alone',
    (tag) => {
      expect(shouldHandleCalculatorKey(key(document.createElement(tag)))).toBe(
        false,
      );
    },
  );

  it('leaves keys typed into contenteditable alone', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    expect(shouldHandleCalculatorKey(key(div))).toBe(false);
    div.remove();
  });

  it('ignores shortcuts with modifier keys', () => {
    expect(
      shouldHandleCalculatorKey(key(document.body, { ctrlKey: true })),
    ).toBe(false);
    expect(
      shouldHandleCalculatorKey(key(document.body, { metaKey: true })),
    ).toBe(false);
  });
});
