/**
 * A minimal content-stream tokenizer: enough to follow the graphics state
 * (q/Q/cm) and find XObject draws (Do). Operands are simplified — names come
 * without the slash; strings, arrays and dictionaries collapse to `null`.
 */
export type Operand = number | string | null;

export interface Op {
  op: string;
  operands: Operand[];
}

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([
  0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25,
]);
const isRegular = (c: number) => !WS.has(c) && !DELIM.has(c);
/** Bytes as a latin1 string, in chunks: spreading a huge run would throw. */
function text(b: Uint8Array, s: number, e: number): string {
  let out = '';
  for (let i = s; i < e; i += 8192)
    out += String.fromCharCode(...b.subarray(i, Math.min(e, i + 8192)));
  return out;
}
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function skipString(b: Uint8Array, i: number): number {
  let depth = 0;
  for (; i < b.length; i++) {
    const c = b[i];
    if (c === 0x5c) {
      i++;
      continue;
    }
    if (c === 0x28) depth++;
    else if (c === 0x29 && --depth === 0) return i + 1;
  }
  return b.length;
}

function skipDict(b: Uint8Array, i: number): number {
  let depth = 0;
  while (i < b.length) {
    if (b[i] === 0x28) {
      i = skipString(b, i);
    } else if (b[i] === 0x3c && b[i + 1] === 0x3c) {
      depth++;
      i += 2;
    } else if (b[i] === 0x3e && b[i + 1] === 0x3e) {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else i++;
  }
  return b.length;
}

/** Inline image data ends at whitespace + "EI" + whitespace (or end). */
function skipInlineImage(b: Uint8Array, i: number): number {
  for (let j = i; j < b.length - 2; j++) {
    if (
      WS.has(b[j]) &&
      b[j + 1] === 0x45 &&
      b[j + 2] === 0x49 &&
      (j + 3 >= b.length || WS.has(b[j + 3]))
    )
      return j + 3;
  }
  return b.length;
}

/** Tokenises a content stream into operators with their (simplified) operands. */
export function* contentOps(b: Uint8Array): Generator<Op> {
  let i = 0;
  let operands: Operand[] = [];
  const arrays: number[] = [];
  while (i < b.length) {
    const c = b[i];
    if (WS.has(c)) {
      i++;
    } else if (c === 0x25) {
      while (i < b.length && b[i] !== 0x0a && b[i] !== 0x0d) i++;
    } else if (c === 0x2f) {
      let j = i + 1;
      while (j < b.length && isRegular(b[j])) j++;
      operands.push(text(b, i + 1, j));
      i = j;
    } else if (c === 0x28) {
      i = skipString(b, i);
      operands.push(null);
    } else if (c === 0x3c) {
      if (b[i + 1] === 0x3c) i = skipDict(b, i);
      else {
        while (i < b.length && b[i] !== 0x3e) i++;
        i++;
      }
      operands.push(null);
    } else if (c === 0x5b) {
      arrays.push(operands.length);
      i++;
    } else if (c === 0x5d) {
      // A stray "]" (no matching "[") is ignored.
      if (arrays.length > 0) {
        operands.length = arrays.pop() as number;
        operands.push(null);
      }
      i++;
    } else if (!isRegular(c)) {
      i++; // stray ) > { }
    } else {
      let j = i;
      while (j < b.length && isRegular(b[j])) j++;
      const token = text(b, i, j);
      i = j;
      if (NUMBER.test(token)) operands.push(Number(token));
      else if (token === 'true' || token === 'false' || token === 'null')
        operands.push(null);
      else if (token === 'ID') {
        i = skipInlineImage(b, i);
        operands = [];
      } else {
        yield { op: token, operands };
        operands = [];
        arrays.length = 0;
      }
    }
  }
}
