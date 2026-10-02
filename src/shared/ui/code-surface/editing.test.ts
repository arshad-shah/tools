import { describe, expect, it } from 'vitest';
import {
  autoPairEdit,
  indentLines,
  newlineEdit,
  outdentLines,
  tabEdit,
  toggleCommentEdit,
  type Edit,
} from './editing';

const apply = (value: string, edit: Edit | null) =>
  edit ? value.slice(0, edit.start) + edit.text + value.slice(edit.end) : value;

describe('editing', () => {
  it('indents and outdents every selected line', () => {
    const v = 'a\nb\nc';
    const ind = indentLines(v, 0, v.length, 2);
    const indented = apply(v, ind);
    expect(indented).toBe('  a\n  b\n  c');
    expect([ind.selStart, ind.selEnd]).toEqual([0, indented.length]);
    const out = outdentLines(indented, ind.selStart, ind.selEnd, 2);
    expect(apply(indented, out)).toBe(v);
  });

  it('a selection ending at a line start leaves that line alone', () => {
    const v = 'a\nb\nc';
    expect(apply(v, indentLines(v, 0, 2, 2))).toBe('  a\nb\nc');
  });

  it('outdent removes a leading tab and does nothing without indentation', () => {
    expect(apply('\tx', outdentLines('\tx', 0, 0, 2))).toBe('x');
    expect(outdentLines('x', 0, 0, 2)).toBeNull();
  });

  it('Tab without a multi-line selection pads to the next tab stop', () => {
    expect(apply('a', tabEdit('a', 1, 1, 4))).toBe('a   ');
    expect(apply('a\nb', tabEdit('a\nb', 0, 3, 2))).toBe('  a\n  b');
  });

  it('Enter keeps the indentation and opens bracket pairs', () => {
    const e = newlineEdit('  foo', 5, 5, 2);
    expect(e.text).toBe('\n  ');
    expect(e.selStart).toBe(8);
    const b = newlineEdit('{}', 1, 1, 2);
    expect(apply('{}', b)).toBe('{\n  \n}');
    expect(b.selStart).toBe(4);
  });

  it('pairs only before whitespace or the end', () => {
    expect(apply('', autoPairEdit('', 0, 0, '('))).toBe('()');
    expect(apply('a b', autoPairEdit('a b', 1, 1, '['))).toBe('a[] b');
    expect(autoPairEdit('ab', 1, 1, '(')).toBeNull();
    expect(autoPairEdit('don', 3, 3, "'")).toBeNull();
    expect(autoPairEdit('ab', 0, 1, '(')).toBeNull();
  });

  it('toggles line comments on and off', () => {
    const v = '  a\n  b';
    const on = apply(v, toggleCommentEdit(v, 0, v.length, '//'));
    expect(on).toBe('  // a\n  // b');
    expect(apply(on, toggleCommentEdit(on, 0, on.length, '//'))).toBe(v);
  });
});
