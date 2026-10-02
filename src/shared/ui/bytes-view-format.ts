import type { Token, TokenKind } from '@/shared/lib/syntax/tokenize';
import type { LineSource } from './code-surface';

/** ASCII control character names, 0x00 to 0x1f; 0x7f is DEL. */
export const CONTROL_NAMES = [
  'NUL',
  'SOH',
  'STX',
  'ETX',
  'EOT',
  'ENQ',
  'ACK',
  'BEL',
  'BS',
  'HT',
  'LF',
  'VT',
  'FF',
  'CR',
  'SO',
  'SI',
  'DLE',
  'DC1',
  'DC2',
  'DC3',
  'DC4',
  'NAK',
  'SYN',
  'ETB',
  'CAN',
  'EM',
  'SUB',
  'ESC',
  'FS',
  'GS',
  'RS',
  'US',
] as const;

/** A byte as ASCII: printable as itself, controls by name, high bytes as '.'. */
export function asciiCell(b: number): { text: string; control: boolean } {
  if (b < 0x20) return { text: CONTROL_NAMES[b], control: true };
  if (b === 0x7f) return { text: 'DEL', control: true };
  if (b > 0x7f) return { text: '.', control: false };
  return { text: String.fromCharCode(b), control: false };
}

export type BytesMode = 'hex' | 'binary';

const cell = (b: number, mode: BytesMode) =>
  mode === 'hex'
    ? b.toString(16).toUpperCase().padStart(2, '0')
    : b.toString(2).padStart(8, '0');

/**
 * One dump row and its colour tokens: an 8-digit hex offset, the byte
 * cells (hex, with an extra gap after every 8, or binary), then the ASCII
 * column where control names stand apart by a space. A short last row is
 * padded so its ASCII column lines up.
 */
export function formatRow(
  bytes: Uint8Array,
  row: number,
  mode: BytesMode,
  perRow: number,
): { text: string; tokens: Token[] } {
  const tokens: Token[] = [];
  const push = (start: number, end: number, kind: TokenKind) => {
    if (end > start) tokens.push({ start, end, kind });
  };
  const from = row * perRow;
  const to = Math.min(bytes.length, from + perRow);
  let text = from.toString(16).toUpperCase().padStart(8, '0');
  push(0, 8, 'comment');
  text += '  ';
  const width = mode === 'hex' ? 2 : 8;
  for (let i = 0; i < perRow; i++) {
    if (i > 0) text += mode === 'hex' && i % 8 === 0 ? '  ' : ' ';
    const at = text.length;
    if (from + i < to) {
      text += cell(bytes[from + i], mode);
      push(at, text.length, 'number');
    } else text += ' '.repeat(width);
  }
  text += '  ';
  let prevControl = false;
  for (let i = from; i < to; i++) {
    const c = asciiCell(bytes[i]);
    if (i > from && (c.control || prevControl)) text += ' ';
    const at = text.length;
    text += c.text;
    push(at, text.length, c.control ? 'keyword' : 'string');
    prevControl = c.control;
  }
  return { text, tokens };
}

/** Widest possible row, for the horizontal extent. */
export function rowWidth(mode: BytesMode, perRow: number): number {
  const cells =
    mode === 'hex'
      ? perRow * 3 - 1 + Math.floor((perRow - 1) / 8)
      : perRow * 9 - 1;
  return 8 + 2 + cells + 2 + perRow * 4;
}

/** Dump rows on demand for CodeSurface: nothing is formatted up front. */
export function createBytesSource(
  bytes: Uint8Array,
  mode: BytesMode,
  perRow: number,
): LineSource {
  const count = Math.max(1, Math.ceil(bytes.length / perRow));
  // line() and tokens() ask for the same row in turn: keep the last one.
  let last = -1;
  let lastRow: { text: string; tokens: Token[] } = { text: '', tokens: [] };
  const row = (i: number) => {
    if (i !== last && bytes.length) {
      last = i;
      lastRow = formatRow(bytes, i, mode, perRow);
    }
    return lastRow;
  };
  return {
    count,
    line: (i) => row(i).text,
    tokens: (i) => row(i).tokens,
    maxLength: rowWidth(mode, perRow),
    text: () => Array.from({ length: count }, (_, i) => row(i).text).join('\n'),
  };
}
