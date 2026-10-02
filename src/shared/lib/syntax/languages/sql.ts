import {
  continueQuoted,
  find,
  isDigit,
  isIdStart,
  Out,
  readIdent,
  readNumber,
  readQuoted,
  skipSpace,
} from '../scan';
import type { LanguageDef } from '../types';

const KEYWORDS = new Set(
  'add all alter and any as asc begin between bigint by case cast char check collate column commit constraint create cross database date decimal default delete desc distinct drop else end escape except exists fetch first float for foreign from full grant group having if in index inner insert int integer intersect interval into is join key left like limit merge natural next not numeric of offset on only or order outer over partition primary real recursive references replace returning revoke right rollback row rows schema select serial set smallint table text then time timestamp to top transaction union unique update using values varchar view when where window with'.split(
    ' ',
  ),
);

/** SQL (keywords case-insensitive). States: `B` block comment, `S` string. */
export const sql: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    let i = 0;
    let mode = state;
    while (i < line.length) {
      if (mode === 'B') {
        const close = find(line, '*/', i);
        const end = close < 0 ? line.length : close + 2;
        out.push(i, end, 'comment');
        if (close >= 0) mode = '';
        i = end;
        continue;
      }
      if (mode === 'S') {
        const { end, closed } = continueQuoted(line.slice(i), 39, true);
        out.push(i, i + end, 'string');
        i += end;
        if (closed) mode = '';
        continue;
      }
      const c = line.charCodeAt(i);
      const ch = line[i];
      if (c === 32 || c === 9 || c === 13) {
        i++;
      } else if (ch === '-' && line[i + 1] === '-') {
        out.push(i, line.length, 'comment');
        break;
      } else if (ch === '/' && line[i + 1] === '*') {
        out.push(i, i + 2, 'comment');
        mode = 'B';
        i += 2;
      } else if (ch === "'") {
        const { end, closed } = readQuoted(line, i, 39, true);
        out.push(i, end, 'string');
        if (!closed) mode = 'S';
        i = end;
      } else if (ch === '"' || ch === '`') {
        const { end } = readQuoted(line, i, c, true);
        out.push(i, end, 'key');
        i = end;
      } else if (ch === '[') {
        const close = line.indexOf(']', i);
        const end = close < 0 ? line.length : close + 1;
        out.push(i, end, 'key');
        i = end;
      } else if (isDigit(c)) {
        const end = readNumber(line, i);
        out.push(i, end, 'number');
        i = end;
      } else if (
        (ch === ':' || ch === '@' || ch === '$') &&
        isIdStart(line.charCodeAt(i + 1) || 0)
      ) {
        const end = readIdent(line, i + 1);
        out.push(i, end, 'attr');
        i = end;
      } else if (
        ch === '?' ||
        (ch === '$' && isDigit(line.charCodeAt(i + 1) || 0))
      ) {
        let j = i + 1;
        while (isDigit(line.charCodeAt(j) || 0)) j++;
        out.push(i, j, 'attr');
        i = j;
      } else if (isIdStart(c)) {
        const end = readIdent(line, i);
        const word = line.slice(i, end).toLowerCase();
        if (word === 'true' || word === 'false') out.push(i, end, 'boolean');
        else if (word === 'null') out.push(i, end, 'null');
        else if (KEYWORDS.has(word)) out.push(i, end, 'keyword');
        else if (line[skipSpace(line, end)] === '(') out.push(i, end, 'fn');
        else out.push(i, end, 'plain');
        i = end;
      } else {
        out.push(i, i + 1, 'punct');
        i++;
      }
    }
    return { tokens: out.tokens, state: mode };
  },
};
