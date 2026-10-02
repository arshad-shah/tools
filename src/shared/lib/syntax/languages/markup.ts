import { find, isIdPart, Out, skipSpace } from '../scan';
import type { LanguageDef } from '../types';

/**
 * XML and HTML. States: '' text, `C` comment, `D` CDATA, `T` inside a tag,
 * `T"` / `T'` inside a quoted attribute value.
 */
const readName = (line: string, i: number) => {
  let j = i;
  while (
    j < line.length &&
    (isIdPart(line.charCodeAt(j)) || /[-:.]/.test(line[j]))
  )
    j++;
  return j;
};

function closeRun(
  out: Out,
  line: string,
  i: number,
  closer: string,
  kind: 'comment' | 'string',
): { i: number; open: boolean } {
  const at = find(line, closer, i);
  const end = at < 0 ? line.length : at + closer.length;
  out.push(i, end, kind);
  return { i: end, open: at < 0 };
}

export const markup: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    let mode = state;
    let i = 0;
    let expectValue = false; // after '=' inside a tag
    while (i < line.length) {
      if (mode === 'C' || mode === 'D') {
        const r = closeRun(
          out,
          line,
          i,
          mode === 'C' ? '-->' : ']]>',
          mode === 'C' ? 'comment' : 'string',
        );
        i = r.i;
        if (!r.open) mode = '';
        continue;
      }
      if (mode === 'T"' || mode === "T'") {
        const at = line.indexOf(mode[1], i);
        const end = at < 0 ? line.length : at + 1;
        out.push(i, end, 'string');
        i = end;
        if (at >= 0) mode = 'T';
        continue;
      }
      if (mode === 'T') {
        i = skipSpace(line, i);
        if (i >= line.length) break;
        const ch = line[i];
        if (
          ch === '>' ||
          (ch === '/' && line[i + 1] === '>') ||
          (ch === '?' && line[i + 1] === '>')
        ) {
          const end = ch === '>' ? i + 1 : i + 2;
          out.push(i, end, 'punct');
          i = end;
          mode = '';
        } else if (ch === '"' || ch === "'") {
          out.push(i, i + 1, 'string');
          mode = `T${ch}`;
          expectValue = false;
          i++;
        } else if (ch === '=') {
          out.push(i, i + 1, 'punct');
          expectValue = true;
          i++;
        } else {
          let end = expectValue
            ? Math.max(i + 1, line.slice(i).search(/[\s>]|$/) + i)
            : readName(line, i);
          if (end === i) end = i + 1;
          out.push(i, end, expectValue ? 'string' : 'attr');
          expectValue = false;
          i = end;
        }
        continue;
      }
      // Text.
      const lt = line.indexOf('<', i);
      const amp = line.indexOf('&', i);
      const next = lt < 0 ? amp : amp < 0 ? lt : Math.min(lt, amp);
      if (next < 0) break;
      i = next;
      if (line[i] === '&') {
        const semi = line.indexOf(';', i);
        const end = semi > i && semi - i < 12 ? semi + 1 : i + 1;
        out.push(i, end, semi > i && semi - i < 12 ? 'keyword' : 'plain');
        i = end;
      } else if (line.startsWith('<!--', i)) {
        out.push(i, i + 4, 'comment');
        mode = 'C';
        i += 4;
      } else if (line.startsWith('<![CDATA[', i)) {
        out.push(i, i + 9, 'punct');
        mode = 'D';
        i += 9;
      } else if (line.startsWith('<!', i) || line.startsWith('<?', i)) {
        const end = readName(line, i + 2);
        out.push(i, end, 'keyword');
        i = end;
        mode = 'T';
      } else {
        const close = line[i + 1] === '/';
        const start = close ? i + 2 : i + 1;
        const end = readName(line, start);
        if (end === start) {
          out.push(i, i + 1, 'plain');
          i++;
          continue;
        }
        out.push(i, start, 'punct');
        out.push(start, end, 'tag');
        i = end;
        mode = 'T';
      }
    }
    return { tokens: out.tokens, state: mode };
  },
};
