import { describe, expect, it } from 'vitest';
import { computeDiff } from './engine';
import { applyChoices } from './merge';

const left = 'a\nb\nc\nd\ne\n';
const right = 'a\nB\nc\nd\nE\nf\n';
const texts = { left, right };
const result = computeDiff(left, right);
// Hunks: equal a, change b, equal c d, change e plus add f.
const changeIndexes = result.hunks
  .map((h, i) => (h.kind === 'equal' ? -1 : i))
  .filter((i) => i >= 0);

describe('applyChoices', () => {
  it('keeps the left text when nothing is chosen', () => {
    expect(applyChoices(result, texts, new Map())).toBe(left);
  });

  it('replaces only the hunk taken from the right', () => {
    const second = changeIndexes[1];
    expect(applyChoices(result, texts, new Map([[second, 'right']]))).toBe(
      'a\nb\nc\nd\nE\nf\n',
    );
  });

  it('gives the right text when every hunk is taken from the right', () => {
    const all = new Map(changeIndexes.map((i) => [i, 'right' as const]));
    expect(applyChoices(result, texts, all)).toBe(right);
  });

  it('handles pure additions and deletions', () => {
    const r = computeDiff('a\nc', 'a\nb\nc');
    const add = r.hunks.findIndex((h) => h.kind === 'add');
    expect(
      applyChoices(
        r,
        { left: 'a\nc', right: 'a\nb\nc' },
        new Map([[add, 'right']]),
      ),
    ).toBe('a\nb\nc');
    const d = computeDiff('a\nb\nc', 'a\nc');
    const del = d.hunks.findIndex((h) => h.kind === 'del');
    expect(
      applyChoices(
        d,
        { left: 'a\nb\nc', right: 'a\nc' },
        new Map([[del, 'right']]),
      ),
    ).toBe('a\nc');
  });

  it('keeps CRLF line endings', () => {
    const l = 'a\r\nb\r\n';
    const r = computeDiff(l, 'a\nc\n');
    const i = r.hunks.findIndex((h) => h.kind === 'change');
    expect(
      applyChoices(r, { left: l, right: 'a\nc\n' }, new Map([[i, 'right']])),
    ).toBe('a\r\nc\r\n');
  });
});
