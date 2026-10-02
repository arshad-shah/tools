import { describe, expect, it } from 'vitest';
import { textStats } from './stats';

describe('textStats', () => {
  it('counts words, sentences and characters', () => {
    const s = textStats('Hello world. Bye!');
    expect(s.words).toBe(3);
    expect(s.sentences).toBe(2);
    expect(s.chars).toBe(17);
    expect(s.charsNoSpaces).toBe(15);
    expect(s.lines).toBe(1);
    expect(s.paragraphs).toBe(1);
  });

  it('counts UTF-8 bytes and graphemes for multi-byte text', () => {
    const e = String.fromCodePoint(0xe9);
    const face = String.fromCodePoint(0x1f600);
    const s = textStats(`caf${e} ${face}`);
    expect(s.bytes).toBe(4 + 1 + 1 + 4);
    expect(s.chars).toBe(6);
  });

  it('gives reading and speaking time and paragraphs', () => {
    const text = Array.from({ length: 476 }, () => 'word').join(' ');
    const s = textStats(`${text}\n\nsecond para`);
    expect(s.readingMinutes).toBeCloseTo(478 / 238);
    expect(s.speakingMinutes).toBeCloseTo(478 / 150);
    expect(s.paragraphs).toBe(2);
  });

  it('ranks top words with an optional stop-word filter', () => {
    const s = textStats('the cat and the hat and the bat');
    expect(s.topWords[0]).toEqual(['the', 3]);
    const f = textStats('the cat and the hat and the cat', 'en', {
      stopWords: true,
    });
    expect(f.topWords).toEqual([
      ['cat', 2],
      ['hat', 1],
    ]);
    expect(textStats('aab').charFreq).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('handles empty text', () => {
    expect(textStats('')).toMatchObject({
      words: 0,
      lines: 0,
      sentences: 0,
      bytes: 0,
    });
  });
});
