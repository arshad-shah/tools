/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LineContent, sameLine } from './render-line';
import type { Token } from '@/shared/lib/syntax/tokenize';

const tokens: Token[] = [];

describe('LineContent memo', () => {
  it('skips a re-render when a line looks the same', () => {
    const a = { text: 'x', tokens, ranges: [], markers: [] };
    expect(sameLine(a, { ...a, ranges: [] })).toBe(true);
    expect(
      sameLine(
        { ...a, ranges: [{ start: 0, end: 1, kind: 'search' }] },
        { ...a, ranges: [{ start: 0, end: 1, kind: 'search' }] },
      ),
    ).toBe(true);
  });

  it('re-renders when text, tokens, ranges or markers change', () => {
    const a = { text: 'x', tokens, ranges: [], markers: [] };
    expect(sameLine(a, { ...a, text: 'y' })).toBe(false);
    expect(sameLine(a, { ...a, tokens: [] })).toBe(false);
    expect(sameLine(a, { ...a, markers: [] })).toBe(false);
    expect(
      sameLine(a, { ...a, ranges: [{ start: 0, end: 1, kind: 'search' }] }),
    ).toBe(false);
    expect(
      sameLine(
        { ...a, ranges: [{ start: 0, end: 1, kind: 'search' }] },
        { ...a, ranges: [{ start: 0, end: 1, kind: 'match-active' }] },
      ),
    ).toBe(false);
  });

  it('still renders the text', () => {
    const { container } = render(
      <LineContent text="hello" tokens={tokens} ranges={[]} markers={[]} />,
    );
    expect(container.textContent).toBe('hello');
  });
});
