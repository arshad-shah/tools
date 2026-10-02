import { find, isDigit, isIdPart, Out, readQuoted, skipSpace } from '../scan';
import type { LanguageDef } from '../types';

const readName = (line: string, i: number) => {
  let j = i;
  while (j < line.length && (isIdPart(line.charCodeAt(j)) || line[j] === '-'))
    j++;
  return j;
};

/** CSS: state is the block depth plus `B` inside a block comment. */
export const css: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    let depth = parseInt(state, 10) || 0;
    let comment = state.endsWith('B');
    let i = 0;
    while (i < line.length) {
      if (comment) {
        const close = find(line, '*/', i);
        const end = close < 0 ? line.length : close + 2;
        out.push(i, end, 'comment');
        comment = close < 0;
        i = end;
        continue;
      }
      const c = line.charCodeAt(i);
      const ch = line[i];
      if (c === 32 || c === 9 || c === 13) {
        i++;
      } else if (ch === '/' && line[i + 1] === '*') {
        const close = find(line, '*/', i + 2);
        const end = close < 0 ? line.length : close + 2;
        out.push(i, end, 'comment');
        comment = close < 0;
        i = end;
      } else if (c === 34 || c === 39) {
        const { end } = readQuoted(line, i, c);
        out.push(i, end, 'string');
        i = end;
      } else if (ch === '@') {
        const end = readName(line, i + 1);
        out.push(i, end, 'keyword');
        i = end;
      } else if (ch === '{' || ch === '}') {
        depth = Math.max(0, depth + (ch === '{' ? 1 : -1));
        out.push(i, i + 1, 'punct');
        i++;
      } else if (depth > 0 && ch === '!') {
        const end = readName(line, i + 1);
        out.push(i, end, 'keyword');
        i = end;
      } else if (depth > 0 && ch === '#') {
        const end = readName(line, i + 1);
        out.push(i, end, 'number');
        i = end;
      } else if (
        isDigit(c) ||
        ((ch === '.' || ch === '-') && isDigit(line.charCodeAt(i + 1)))
      ) {
        let j = i + 1;
        while (
          j < line.length &&
          (isDigit(line.charCodeAt(j)) || line[j] === '.')
        )
          j++;
        while (j < line.length && /[a-z%]/i.test(line[j])) j++;
        out.push(i, j, 'number');
        i = j;
      } else if (depth === 0 && (ch === '.' || ch === '#')) {
        const end = readName(line, i + 1);
        out.push(i, end, 'attr');
        i = end;
      } else if (depth === 0 && ch === ':') {
        let j = i + 1;
        if (line[j] === ':') j++;
        const end = readName(line, j);
        out.push(i, end, 'keyword');
        i = end;
      } else if (isIdPart(c) || ch === '-') {
        const end = readName(line, i);
        const next = line[skipSpace(line, end)];
        let kind: 'attr' | 'fn' | 'tag' | 'plain' = 'plain';
        if (next === '(') kind = 'fn';
        else if (depth > 0 && next === ':') kind = 'attr';
        else if (depth === 0) kind = 'tag';
        out.push(i, end, kind);
        i = end;
      } else {
        out.push(i, i + 1, 'punct');
        i++;
      }
    }
    return { tokens: out.tokens, state: `${depth}${comment ? 'B' : ''}` };
  },
};
