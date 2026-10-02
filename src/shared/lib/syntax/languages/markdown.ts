import { Out, skipSpace } from '../scan';
import type { LanguageDef } from '../types';

/** Inline spans: code, links, emphasis. */
function inline(line: string, from: number, out: Out): void {
  let i = from;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\') {
      i += 2;
    } else if (ch === '`') {
      let ticks = 1;
      while (line[i + ticks] === '`') ticks++;
      const fence = '`'.repeat(ticks);
      const close = line.indexOf(fence, i + ticks);
      if (close < 0) {
        i += ticks;
        continue;
      }
      out.push(i, close + ticks, 'string');
      i = close + ticks;
    } else if (ch === '[' || (ch === '!' && line[i + 1] === '[')) {
      const open = ch === '!' ? i + 1 : i;
      const close = line.indexOf(']', open + 1);
      if (close > 0 && line[close + 1] === '(') {
        const end = line.indexOf(')', close + 2);
        if (end > 0) {
          out.push(i, close + 1, 'tag');
          out.push(close + 1, end + 1, 'attr');
          i = end + 1;
          continue;
        }
      }
      i++;
    } else if ((ch === '*' || ch === '_') && line[i + 1] !== ' ') {
      const strong = line[i + 1] === ch;
      const marker = strong ? ch + ch : ch;
      const close = line.indexOf(marker, i + marker.length + 1);
      if (close < 0) {
        i += marker.length;
        continue;
      }
      out.push(i, close + marker.length, 'keyword');
      i = close + marker.length;
    } else if (
      ch === '<' &&
      /^<https?:\/\/[^>\s]+>/.test(line.slice(i, i + 2048))
    ) {
      const end = line.indexOf('>', i) + 1;
      out.push(i, end, 'attr');
      i = end;
    } else i++;
  }
}

/** Markdown. State `F<marker>` is an open code fence (``` or ~~~, any length). */
export const markdown: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    const at = skipSpace(line, 0);
    if (state.startsWith('F')) {
      const fence = state.slice(1);
      const rest = line.slice(at);
      if (
        at < 4 &&
        rest.startsWith(fence) &&
        rest.slice(fence.length).trim() === ''
      ) {
        out.push(at, line.length, 'punct');
        return { tokens: out.tokens, state: '' };
      }
      out.push(0, line.length, 'string');
      return { tokens: out.tokens, state };
    }
    const fence = /^(`{3,}|~{3,})/.exec(line.slice(at));
    if (at < 4 && fence) {
      const marker = fence[1];
      out.push(at, at + marker.length, 'punct');
      out.push(at + marker.length, line.length, 'attr');
      return { tokens: out.tokens, state: `F${marker}` };
    }
    const heading = /^#{1,6}(\s|$)/.exec(line.slice(at));
    if (at < 4 && heading) {
      out.push(at, line.length, 'keyword');
      return { tokens: out.tokens, state: '' };
    }
    let i = at;
    while (line[i] === '>') {
      out.push(i, i + 1, 'punct');
      i = skipSpace(line, i + 1);
    }
    const list = /^([-*+]|\d{1,9}[.)])(\s|$)/.exec(line.slice(i));
    if (list) {
      out.push(i, i + list[1].length, 'punct');
      i += list[1].length;
    } else if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(line.slice(i))) {
      out.push(i, line.length, 'punct');
      return { tokens: out.tokens, state: '' };
    }
    inline(line, i, out);
    return { tokens: out.tokens, state: '' };
  },
};
