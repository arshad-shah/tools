import { Out, readQuoted, skipSpace } from '../scan';
import type { LanguageDef, TokenKind } from '../types';

const BOOL = new Set(['true', 'false', 'True', 'False', 'TRUE', 'FALSE']);
const NULL = new Set(['null', 'Null', 'NULL', '~']);

function scalarKind(text: string): TokenKind {
  if (BOOL.has(text)) return 'boolean';
  if (NULL.has(text)) return 'null';
  if (
    /^[-+]?(\d[\d_]*(\.\d*)?([eE][-+]?\d+)?|\.\d+|0x[0-9a-fA-F]+|\.inf|\.nan)$/.test(
      text,
    )
  )
    return 'number';
  return 'string';
}

/** Where a plain scalar ends: before " #", ": " (a key), or a flow character. */
function scalarEnd(line: string, i: number, flow: boolean): number {
  let j = i;
  while (j < line.length) {
    const ch = line[j];
    if (ch === '#' && (line[j - 1] === ' ' || line[j - 1] === '\t')) break;
    if (
      ch === ':' &&
      (j + 1 === line.length ||
        line[j + 1] === ' ' ||
        (flow && /[,\]}]/.test(line[j + 1])))
    )
      break;
    if (flow && /[,\]}[{]/.test(ch)) break;
    j++;
  }
  while (j > i && /\s/.test(line[j - 1])) j--;
  return j;
}

/**
 * YAML. State `S<n>` is a block scalar (| or >) whose header line had
 * indent n: deeper lines are its text.
 */
export const yaml: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    const indent = skipSpace(line, 0);
    if (state.startsWith('S')) {
      const n = Number(state.slice(1));
      if (indent === line.length || indent > n) {
        out.push(indent, line.length, 'string');
        return { tokens: out.tokens, state };
      }
    }
    let next = '';
    let i = indent;
    if (indent === 0 && (line.startsWith('---') || line.startsWith('...'))) {
      out.push(0, 3, 'punct');
      i = 3;
    }
    let flow = 0;
    while (i < line.length) {
      i = skipSpace(line, i);
      if (i >= line.length) break;
      const ch = line[i];
      const c = line.charCodeAt(i);
      if (ch === '#') {
        out.push(i, line.length, 'comment');
        break;
      }
      if (
        ch === '-' &&
        (line[i + 1] === ' ' || i + 1 === line.length) &&
        flow === 0
      ) {
        out.push(i, i + 1, 'punct');
        i++;
      } else if (ch === '"' || ch === "'") {
        const { end } = readQuoted(line, i, c, ch === "'");
        const after = skipSpace(line, end);
        const isKey =
          line[after] === ':' &&
          (after + 1 === line.length || /[\s,\]}]/.test(line[after + 1]));
        out.push(i, end, isKey ? 'key' : 'string');
        i = end;
      } else if (ch === '&' || ch === '*' || ch === '!') {
        let j = i + 1;
        while (j < line.length && !/[\s,\]}]/.test(line[j])) j++;
        out.push(i, j, 'keyword');
        i = j;
      } else if ((ch === '|' || ch === '>') && flow === 0) {
        let j = i + 1;
        while (j < line.length && /[0-9+-]/.test(line[j])) j++;
        out.push(i, j, 'punct');
        next = `S${indent}`;
        i = j;
      } else if (/[[\]{},:?]/.test(ch)) {
        if (ch === '[' || ch === '{') flow++;
        if (ch === ']' || ch === '}') flow = Math.max(0, flow - 1);
        out.push(i, i + 1, 'punct');
        i++;
      } else {
        const end = scalarEnd(line, i, flow > 0);
        if (end === i) {
          out.push(i, i + 1, 'plain');
          i++;
          continue;
        }
        const text = line.slice(i, end);
        const isKey = line[end] === ':';
        out.push(i, end, isKey ? 'key' : scalarKind(text));
        i = end;
      }
    }
    return { tokens: out.tokens, state: next };
  },
};
