import { describe, expect, it } from 'vitest';
import { fileBase, offsetOfLine } from './caret';

describe('offsetOfLine', () => {
  it('finds the start of each line', () => {
    const text = 'ab\ncd\n\nef';
    expect(offsetOfLine(text, 1)).toBe(0);
    expect(offsetOfLine(text, 2)).toBe(3);
    expect(offsetOfLine(text, 4)).toBe(7);
    expect(offsetOfLine(text, 9)).toBe(text.length);
  });
});

describe('fileBase', () => {
  it('slugs the title and falls back to document', () => {
    expect(fileBase('My Notes: Part 2')).toBe('my-notes-part-2');
    expect(fileBase('  ')).toBe('document');
  });
});
