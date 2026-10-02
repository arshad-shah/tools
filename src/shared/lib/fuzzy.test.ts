import { describe, expect, it } from 'vitest';
import { fuzzyScore, rankCommands } from './fuzzy';

const items = [
  { label: 'Image optimizer' },
  { label: 'Merge PDFs' },
  { label: 'Edit PDF' },
  { label: 'PDF to text', keywords: ['extract'] },
];

describe('fuzzyScore', () => {
  it('no match is null', () => {
    expect(fuzzyScore('xyz', 'Merge PDFs')).toBeNull();
  });
  it('is case-insensitive', () => {
    expect(fuzzyScore('MERGE', 'merge pdfs')).not.toBeNull();
  });
  it('a prefix beats a match in the middle', () => {
    expect(fuzzyScore('pdf', 'PDF to text')!).toBeGreaterThan(
      fuzzyScore('pdf', 'Merge PDFs')!,
    );
  });
});

describe('rankCommands', () => {
  it('"mrg" puts Merge PDFs above Image optimizer', () => {
    const ranked = rankCommands('mrg', items).map((i) => i.label);
    expect(ranked[0]).toBe('Merge PDFs');
    const img = ranked.indexOf('Image optimizer');
    expect(img === -1 || img > 0).toBe(true);
  });

  it('space means AND across words, in any order', () => {
    expect(rankCommands('pdf edit', items).map((i) => i.label)[0]).toBe(
      'Edit PDF',
    );
  });

  it('matches keywords', () => {
    expect(rankCommands('extract', items).map((i) => i.label)).toEqual([
      'PDF to text',
    ]);
  });

  it('empty query keeps order; limit applies', () => {
    expect(rankCommands('', items, 2).map((i) => i.label)).toEqual([
      'Image optimizer',
      'Merge PDFs',
    ]);
  });
});

describe('word-start matches later in the text (review M30)', () => {
  it('"ed" scores the "Ed" of "Merge Edit" as a word start', () => {
    expect(fuzzyScore('ed', 'Merge Edit')!).toBeGreaterThanOrEqual(10);
  });
  it('"ed" ranks "Merge Edit" above "Merged it"', () => {
    expect(fuzzyScore('ed', 'Merge Edit')!).toBeGreaterThan(
      fuzzyScore('ed', 'Merged it')!,
    );
  });
});
