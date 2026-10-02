import { Out } from '../scan';
import type { LanguageDef } from '../types';

/**
 * Regular expression patterns: escapes and anchors, character classes,
 * group openers and closers, quantifiers and alternation.
 */
export const regex: LanguageDef = {
  tokenizeLine(line) {
    const out = new Out();
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '\\') {
        let end = i + 2;
        const e = line[i + 1];
        if (e === 'u' && line[i + 2] === '{')
          end = line.indexOf('}', i) + 1 || line.length;
        else if (e === 'u') end = i + 6;
        else if (e === 'x') end = i + 4;
        else if ((e === 'p' || e === 'P') && line[i + 2] === '{')
          end = line.indexOf('}', i) + 1 || line.length;
        else if (e === 'k' && line[i + 2] === '<')
          end = line.indexOf('>', i) + 1 || line.length;
        else if (e === 'c') end = i + 3;
        out.push(i, Math.min(end, line.length), 'keyword');
        i = Math.min(end, line.length);
      } else if (ch === '[') {
        let j = i + 1;
        if (line[j] === '^') j++;
        if (line[j] === ']') j++;
        while (j < line.length && line[j] !== ']')
          j += line[j] === '\\' ? 2 : 1;
        const end = Math.min(j + 1, line.length);
        out.push(i, end, 'string');
        i = end;
      } else if (ch === '(') {
        let end = i + 1;
        if (line[i + 1] === '?') {
          const m =
            /^\?(?::|=|!|<=|<!|<[A-Za-z_$][\w$]*>|[a-z]*-?[a-z]*:)/.exec(
              line.slice(i + 1, i + 40),
            );
          end = i + 1 + (m ? m[0].length : 1);
        }
        out.push(i, end, 'punct');
        i = end;
      } else if (ch === ')' || ch === '|') {
        out.push(i, i + 1, 'punct');
        i++;
      } else if (ch === '*' || ch === '+' || ch === '?') {
        const end = line[i + 1] === '?' ? i + 2 : i + 1;
        out.push(i, end, 'number');
        i = end;
      } else if (ch === '{') {
        const m = /^\{\d+(,\d*)?\}\??/.exec(line.slice(i, i + 24));
        if (m) {
          out.push(i, i + m[0].length, 'number');
          i += m[0].length;
        } else i++;
      } else if (ch === '^' || ch === '$' || ch === '.') {
        out.push(i, i + 1, 'keyword');
        i++;
      } else i++;
    }
    return { tokens: out.tokens, state: '' };
  },
};
