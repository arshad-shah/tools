import {
  find,
  isDigit,
  isIdStart,
  Out,
  readIdent,
  readNumber,
  readQuoted,
  skipSpace,
} from '../scan';
import type { LanguageDef, TokenKind } from '../types';

const KEYWORDS = new Set(
  'abstract as async await break case catch class const continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let namespace new of private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield'.split(
    ' ',
  ),
);

/**
 * State frames (outermost first): `T` template text, `E<n>` a `${}`
 * expression at brace depth n, and a trailing `B` for an open block comment.
 */
type Frame = 'T' | `E${number}` | 'B';

const parse = (s: string): Frame[] => (s.match(/T|E\d+|B/g) as Frame[]) ?? [];

/** JavaScript and TypeScript. */
export const js: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    const stack = parse(state);
    let i = 0;
    // The last significant token decides whether "/" starts a regex.
    let prev: TokenKind | 'close' | null = null;
    while (i < line.length) {
      const top = stack[stack.length - 1];
      if (top === 'B') {
        const close = find(line, '*/', i);
        const end = close < 0 ? line.length : close + 2;
        out.push(i, end, 'comment');
        if (close >= 0) stack.pop();
        i = end;
        continue;
      }
      if (top === 'T') {
        let j = i;
        while (j < line.length) {
          const c = line.charCodeAt(j);
          if (c === 92) j += 2;
          else if (c === 96 || (c === 36 && line[j + 1] === '{')) break;
          else j++;
        }
        j = Math.min(j, line.length);
        if (line.charCodeAt(j) === 96) {
          out.push(i, j + 1, 'string');
          stack.pop();
          i = j + 1;
          prev = 'string';
        } else if (j < line.length) {
          out.push(i, j, 'string');
          out.push(j, j + 2, 'punct');
          stack.push('E0');
          i = j + 2;
          prev = null;
        } else {
          out.push(i, j, 'string');
          i = j;
        }
        continue;
      }
      const c = line.charCodeAt(i);
      if (c === 32 || c === 9 || c === 13) {
        i++;
        continue;
      }
      const two = line.slice(i, i + 2);
      if (two === '//') {
        out.push(i, line.length, 'comment');
        break;
      }
      if (two === '/*') {
        stack.push('B');
        out.push(i, i + 2, 'comment');
        i += 2;
        continue;
      }
      if (c === 34 || c === 39) {
        const { end } = readQuoted(line, i, c);
        out.push(i, end, 'string');
        i = end;
        prev = 'string';
        continue;
      }
      if (c === 96) {
        out.push(i, i + 1, 'string');
        stack.push('T');
        i++;
        continue;
      }
      if (isDigit(c) || (c === 46 && isDigit(line.charCodeAt(i + 1)))) {
        const end = readNumber(line, i);
        out.push(i, end, 'number');
        i = end;
        prev = 'number';
        continue;
      }
      if (isIdStart(c)) {
        const end = readIdent(line, i);
        const word = line.slice(i, end);
        const afterDot = line[i - 1] === '.';
        let kind: TokenKind = 'plain';
        if (!afterDot && KEYWORDS.has(word)) kind = 'keyword';
        else if (word === 'true' || word === 'false') kind = 'boolean';
        else if (word === 'null' || word === 'undefined') kind = 'null';
        else if (line[skipSpace(line, end)] === '(') kind = 'fn';
        out.push(i, end, kind);
        i = end;
        // `this` and `super` are values: a "/" after them divides.
        prev =
          kind === 'keyword' && (word === 'this' || word === 'super')
            ? 'close'
            : kind;
        continue;
      }
      if (c === 47) {
        const division =
          prev === 'plain' ||
          prev === 'number' ||
          prev === 'string' ||
          prev === 'close' ||
          prev === 'null' ||
          prev === 'boolean';
        if (!division) {
          let j = i + 1;
          let inClass = false;
          while (j < line.length) {
            const d = line[j];
            if (d === '\\') j += 2;
            else if (d === '/' && !inClass) break;
            else {
              if (d === '[') inClass = true;
              else if (d === ']') inClass = false;
              j++;
            }
          }
          if (j < line.length) {
            j++;
            while (j < line.length && /[a-z]/.test(line[j])) j++;
            out.push(i, j, 'regex');
            i = j;
            prev = 'regex';
            continue;
          }
        }
      }
      const top2 = stack[stack.length - 1];
      if (top2?.startsWith('E') && (c === 123 || c === 125)) {
        const depth = Number(top2.slice(1));
        if (c === 125 && depth === 0) {
          stack.pop(); // back to the template text
          out.push(i, i + 1, 'punct');
          i++;
          continue;
        }
        stack[stack.length - 1] = `E${depth + (c === 123 ? 1 : -1)}`;
      }
      out.push(i, i + 1, 'punct');
      prev = c === 41 || c === 93 || c === 125 ? 'close' : 'punct';
      i++;
    }
    return { tokens: out.tokens, state: stack.join('') };
  },
};
