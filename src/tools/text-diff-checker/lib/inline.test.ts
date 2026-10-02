import { describe, expect, it } from 'vitest';
import type { DiffSegment } from '../types';
import { pairInlineRows } from './inline';

const same = (text: string): DiffSegment => ({ text });
const del = (text: string): DiffSegment => ({ text, removed: true });
const add = (text: string): DiffSegment => ({ text, added: true });

describe('pairInlineRows', () => {
  it('pairs a run of removed lines with the added run after it, in order', () => {
    const rows = pairInlineRows([
      same('a'),
      del('b'),
      del('c'),
      add('B'),
      add('C'),
      same('d'),
    ]);
    expect(rows).toEqual([
      { kind: 'single', segment: same('a') },
      { kind: 'pair', original: del('b'), modified: add('B') },
      { kind: 'pair', original: del('c'), modified: add('C') },
      { kind: 'single', segment: same('d') },
    ]);
  });

  it('keeps leftover removed or added lines as single rows', () => {
    expect(pairInlineRows([del('x'), del('y'), add('X')])).toEqual([
      { kind: 'pair', original: del('x'), modified: add('X') },
      { kind: 'single', segment: del('y') },
    ]);
    expect(pairInlineRows([del('x'), add('X'), add('Y')])).toEqual([
      { kind: 'pair', original: del('x'), modified: add('X') },
      { kind: 'single', segment: add('Y') },
    ]);
  });

  it('leaves an added run with no removed run before it unpaired', () => {
    expect(pairInlineRows([add('n'), same('a')])).toEqual([
      { kind: 'single', segment: add('n') },
      { kind: 'single', segment: same('a') },
    ]);
  });
});
