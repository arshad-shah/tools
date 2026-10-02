import { isAlpha, isDigit, Out, readQuoted, skipSpace } from '../scan';
import type { LanguageDef } from '../types';

const PUNCT = new Set(['{', '}', '[', ']', ',', ':']);

/** JSON (and JSON with comments): keys, scalars, punctuation. */
export const json: LanguageDef = {
  tokenizeLine(line) {
    const out = new Out();
    let i = 0;
    while (i < line.length) {
      const c = line.charCodeAt(i);
      if (c === 32 || c === 9 || c === 13) {
        i++;
      } else if (c === 34) {
        const { end } = readQuoted(line, i, 34);
        const after = skipSpace(line, end);
        out.push(i, end, line[after] === ':' ? 'key' : 'string');
        i = end;
      } else if (c === 45 || isDigit(c)) {
        let j = i + 1;
        while (j < line.length && /[0-9.eE+-]/.test(line[j])) j++;
        out.push(i, j, 'number');
        i = j;
      } else if (isAlpha(c)) {
        let j = i + 1;
        while (j < line.length && isAlpha(line.charCodeAt(j))) j++;
        const word = line.slice(i, j);
        out.push(
          i,
          j,
          word === 'true' || word === 'false'
            ? 'boolean'
            : word === 'null'
              ? 'null'
              : 'plain',
        );
        i = j;
      } else if (c === 47 && line.charCodeAt(i + 1) === 47) {
        out.push(i, line.length, 'comment');
        i = line.length;
      } else {
        out.push(i, i + 1, PUNCT.has(line[i]) ? 'punct' : 'plain');
        i++;
      }
    }
    return { tokens: out.tokens, state: '' };
  },
};
