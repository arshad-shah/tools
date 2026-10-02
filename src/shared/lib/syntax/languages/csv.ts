import { continueQuoted, Out, readQuoted } from '../scan';
import type { LanguageDef } from '../types';

const SEPARATORS = new Set([',', ';', '\t', '|']);

/** CSV and TSV: separators, quoted fields (which may span lines), numbers. */
export const csv: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    let i = 0;
    if (state === 'Q') {
      const { end, closed } = continueQuoted(line, 34, true);
      out.push(0, end, 'string');
      if (!closed) return { tokens: out.tokens, state: 'Q' };
      i = end;
    }
    while (i < line.length) {
      const ch = line[i];
      if (SEPARATORS.has(ch)) {
        out.push(i, i + 1, 'punct');
        i++;
      } else if (ch === '"') {
        const { end, closed } = readQuoted(line, i, 34, true);
        out.push(i, end, 'string');
        if (!closed) return { tokens: out.tokens, state: 'Q' };
        i = end;
      } else {
        let j = i;
        while (j < line.length && !SEPARATORS.has(line[j])) j++;
        const text = line.slice(i, j).trim();
        out.push(
          i,
          j,
          /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(text)
            ? 'number'
            : 'plain',
        );
        i = j;
      }
    }
    return { tokens: out.tokens, state: '' };
  },
};
