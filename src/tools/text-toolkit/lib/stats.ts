export interface TextStats {
  chars: number;
  charsNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  bytes: number;
  readingMinutes: number;
  speakingMinutes: number;
  topWords: [string, number][];
  charFreq: [string, number][];
}

export const READING_WPM = 238;
export const SPEAKING_WPM = 150;

/** Common English words left out of the top-words list when asked. */
export const STOP_WORDS = new Set(
  'a an and are as at be but by for from had has have he her his i if in into is it its of on or our she so that the their them then there they this to was we were what when which who will with you your'.split(
    ' ',
  ),
);

const segmenter = (
  locale: string,
  granularity: 'word' | 'sentence' | 'grapheme',
) => new Intl.Segmenter(locale, { granularity });

const top = (m: Map<string, number>, n: number): [string, number][] =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n);

/**
 * Live text statistics (spec §9.1). Words come from `Intl.Segmenter`
 * (word-like segments), so they work for scripts without spaces; characters
 * are grapheme clusters; bytes are UTF-8.
 */
export function textStats(
  text: string,
  locale = 'en',
  { stopWords = false, topN = 10 }: { stopWords?: boolean; topN?: number } = {},
): TextStats {
  const words: string[] = [];
  for (const s of segmenter(locale, 'word').segment(text))
    if (s.isWordLike) words.push(s.segment);
  let sentences = 0;
  for (const s of segmenter(locale, 'sentence').segment(text))
    if (/[\p{L}\p{N}]/u.test(s.segment)) sentences++;
  const graphemes = [...segmenter(locale, 'grapheme').segment(text)].map(
    (g) => g.segment,
  );
  const wordCounts = new Map<string, number>();
  for (const w of words) {
    const k = w.toLocaleLowerCase(locale);
    if (stopWords && STOP_WORDS.has(k)) continue;
    wordCounts.set(k, (wordCounts.get(k) ?? 0) + 1);
  }
  const charCounts = new Map<string, number>();
  for (const g of graphemes)
    if (!/^\s+$/u.test(g)) charCounts.set(g, (charCounts.get(g) ?? 0) + 1);
  return {
    chars: graphemes.length,
    charsNoSpaces: graphemes.filter((g) => !/^\s+$/u.test(g)).length,
    words: words.length,
    sentences,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length,
    lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
    bytes: new TextEncoder().encode(text).length,
    readingMinutes: words.length / READING_WPM,
    speakingMinutes: words.length / SPEAKING_WPM,
    topWords: top(wordCounts, topN),
    charFreq: top(charCounts, Number.MAX_SAFE_INTEGER),
  };
}
