/**
 * A small JSON scanner that finds where one value ends, or where and why it
 * is invalid. JSON.parse does the real parsing; engines differ in whether
 * their errors carry a position, so the position comes from here. It keeps
 * its own stack (no recursion), so deep nesting cannot overflow.
 */

export type ScanResult =
  | { ok: true; end: number }
  | { ok: false; offset: number; message: string };

type Expect =
  | 'value'
  | 'value-or-close'
  | 'key'
  | 'key-or-close'
  | 'colon'
  | 'comma-or-close';

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const ESCAPES = '"\\/bfnrt';
const HEX = /^[0-9a-fA-F]{4}$/;

const isSpace = (c: string) =>
  c === ' ' || c === '\n' || c === '\r' || c === '\t';

const fail = (offset: number, message: string): ScanResult => ({
  ok: false,
  offset,
  message,
});

/** The end of the string starting at `i` (a quote), or an error. */
function scanString(text: string, i: number): ScanResult {
  for (let j = i + 1; j < text.length; j++) {
    const c = text.charCodeAt(j);
    if (c === 34) return { ok: true, end: j + 1 };
    if (c < 0x20) return fail(j, 'Control character inside a string');
    if (c === 92) {
      const e = text[j + 1] ?? '';
      if (e === 'u') {
        if (!HEX.test(text.slice(j + 2, j + 6)))
          return fail(j, 'Invalid unicode escape');
        j += 5;
      } else if (ESCAPES.includes(e) && e) j++;
      else return fail(j, 'Invalid escape in a string');
    }
  }
  return fail(i, 'Unterminated string');
}

/** Scans the JSON value that starts at or after `start` (after spaces). */
export function scanValue(text: string, start = 0): ScanResult {
  const stack: string[] = [];
  let expect: Expect = 'value';
  let i = start;
  const after = (): Expect | null => (stack.length ? 'comma-or-close' : null);

  for (;;) {
    while (i < text.length && isSpace(text[i])) i++;
    if (i >= text.length) return fail(i, 'Unexpected end of the JSON');
    const c = text[i];
    let next: Expect | null;

    if (expect === 'value' || expect === 'value-or-close') {
      if (c === ']' && expect === 'value-or-close') {
        stack.pop();
        i++;
        next = after();
      } else if (c === '{' || c === '[') {
        stack.push(c);
        i++;
        next = c === '{' ? 'key-or-close' : 'value-or-close';
      } else if (c === '"') {
        const s = scanString(text, i);
        if (!s.ok) return s;
        i = s.end;
        next = after();
      } else if (c === '-' || (c >= '0' && c <= '9')) {
        NUMBER.lastIndex = i;
        const m = NUMBER.exec(text);
        if (!m) return fail(i, 'Invalid number');
        i += m[0].length;
        next = after();
      } else {
        const word = ['true', 'false', 'null'].find((w) =>
          text.startsWith(w, i),
        );
        if (!word)
          return fail(
            i,
            c === ',' || c === '}' || c === ']'
              ? `Expected a value before '${c}'`
              : `Unexpected '${c}', expected a value`,
          );
        i += word.length;
        next = after();
      }
    } else if (expect === 'key' || expect === 'key-or-close') {
      if (c === '}' && expect === 'key-or-close') {
        stack.pop();
        i++;
        next = after();
      } else if (c === '"') {
        const s = scanString(text, i);
        if (!s.ok) return s;
        i = s.end;
        next = 'colon';
      } else
        return fail(
          i,
          c === '}'
            ? `Trailing comma before '}'`
            : 'Expected a property name in double quotes',
        );
    } else if (expect === 'colon') {
      if (c !== ':') return fail(i, `Expected ':' after the property name`);
      i++;
      next = 'value';
    } else {
      const top = stack[stack.length - 1];
      const close = top === '{' ? '}' : ']';
      if (c === ',') {
        i++;
        next = top === '{' ? 'key' : 'value';
      } else if (c === close) {
        stack.pop();
        i++;
        next = after();
      } else return fail(i, `Expected ',' or '${close}'`);
    }
    if (next === null) return { ok: true, end: i };
    expect = next;
  }
}
