import { compile } from './match';

const isDigit = (c: string | undefined) =>
  c !== undefined && c >= '0' && c <= '9';

/**
 * Expands a replacement template for one match, with the semantics of
 * `String.prototype.replace` (GetSubstitution): `$1`..`$99`, `$<name>`,
 * `$&`, `` $` ``, `$'` and `$$`. Anything else stays literal.
 */
export function expandReplacement(
  match: RegExpExecArray,
  replacement: string,
): string {
  const input = match.input;
  const position = match.index;
  const matched = match[0];
  const groupCount = match.length - 1;
  let out = '';
  let i = 0;
  while (i < replacement.length) {
    const c = replacement[i];
    const next = replacement[i + 1];
    if (c !== '$' || next === undefined) {
      out += c;
      i++;
      continue;
    }
    if (next === '$') {
      out += '$';
      i += 2;
    } else if (next === '&') {
      out += matched;
      i += 2;
    } else if (next === '`') {
      out += input.slice(0, position);
      i += 2;
    } else if (next === "'") {
      out += input.slice(Math.min(position + matched.length, input.length));
      i += 2;
    } else if (isDigit(next)) {
      const two = replacement[i + 2];
      const twoIndex = isDigit(two) ? Number(next + two) : 0;
      if (twoIndex >= 1 && twoIndex <= groupCount) {
        out += match[twoIndex] ?? '';
        i += 3;
      } else {
        const oneIndex = Number(next);
        if (oneIndex >= 1 && oneIndex <= groupCount) {
          out += match[oneIndex] ?? '';
          i += 2;
        } else {
          out += '$';
          i++;
        }
      }
    } else if (next === '<') {
      const close = replacement.indexOf('>', i + 2);
      if (match.groups === undefined || close === -1) {
        out += '$<';
        i += 2;
      } else {
        const name = replacement.slice(i + 2, close);
        out += match.groups[name] ?? '';
        i = close + 1;
      }
    } else {
      out += '$';
      i++;
    }
  }
  return out;
}

/** Steps over an empty match by one code point when the flags are Unicode. */
function advance(text: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= text.length) return index + 1;
  const code = text.charCodeAt(index);
  if (code < 0xd800 || code > 0xdbff) return index + 1;
  const low = text.charCodeAt(index + 1);
  return low >= 0xdc00 && low <= 0xdfff ? index + 2 : index + 1;
}

/**
 * Replaces like `text.replace(new RegExp(pattern, flags), replacement)` and
 * also counts the replacements. Can backtrack for a long time, so the UI
 * only runs it in a killable worker.
 */
export function replaceText(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): { output: string; count: number } {
  const regex = compile(pattern, flags);
  const unicode = regex.unicode || regex.flags.includes('v');
  let out = '';
  let last = 0;
  let count = 0;
  regex.lastIndex = 0;
  for (;;) {
    const m = regex.exec(text);
    if (m === null) break;
    out += text.slice(last, m.index) + expandReplacement(m, replacement);
    last = m.index + m[0].length;
    count++;
    if (!regex.global) break;
    if (m[0].length === 0)
      regex.lastIndex = advance(text, regex.lastIndex, unicode);
  }
  return { output: out + text.slice(last), count };
}

/** `text.split(regex, limit)`, captures included like the native split. */
export function splitText(
  pattern: string,
  flags: string,
  text: string,
  limit = 10_000,
): string[] {
  return text.split(compile(pattern, flags), limit);
}
