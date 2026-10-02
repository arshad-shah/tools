/**
 * Content-stream tokens (PDF 32000-1 §7.2, §7.8). Strings keep their bytes;
 * names keep their decoded bytes as a latin1 string (`#xx` resolved).
 */
export type Tok =
  | { t: 'num'; v: number; raw: string }
  | { t: 'str'; v: Uint8Array; hex: boolean }
  | { t: 'name'; v: string }
  | { t: 'arr'; v: Tok[] }
  | { t: 'dict'; v: Map<string, Tok> }
  | { t: 'bool'; v: boolean }
  | { t: 'null' };

export interface ContentOp {
  op: string;
  operands: Tok[];
  /**
   * Original bytes from the end of the previous op to the end of this op
   * (whitespace and comments included); absent once the op is modified.
   */
  raw?: Uint8Array;
  /** `BI ... ID data EI` collapsed into one op 'BI'. */
  inline?: { dict: Map<string, Tok>; data: Uint8Array };
}

export interface ParsedContent {
  ops: ContentOp[];
  /** Bytes after the last op (trailing whitespace and comments). */
  tail: Uint8Array;
}

export class ContentParseError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
    this.name = 'ContentParseError';
  }
}

/** PDF white-space characters (§7.2.2). */
export const isWs = (c: number) =>
  c === 0x00 ||
  c === 0x09 ||
  c === 0x0a ||
  c === 0x0c ||
  c === 0x0d ||
  c === 0x20;

/** PDF delimiters: ( ) < > [ ] { } / % */
export const isDelim = (c: number) =>
  c === 0x28 ||
  c === 0x29 ||
  c === 0x3c ||
  c === 0x3e ||
  c === 0x5b ||
  c === 0x5d ||
  c === 0x7b ||
  c === 0x7d ||
  c === 0x2f ||
  c === 0x25;

export const isRegular = (c: number) => !isWs(c) && !isDelim(c);

/** Every operator of PDF 32000-1 Annex A (used to validate inline-image ends). */
export const KNOWN_OPERATORS: ReadonlySet<string> = new Set(
  (
    'b B b* B* BDC BI BMC BT BX c cm CS cs d d0 d1 Do DP EI EMC ET EX f F f* ' +
    'G g gs h i ID j J K k l m M MP n q Q re RG rg ri s S SC sc SCN scn sh ' +
    'T* Tc Td TD Tf Tj TJ TL Tm Tr Ts Tw Tz v w W W* y \' "'
  ).split(' '),
);

/** Bytes as a latin1 string, in chunks (spreading a huge run would throw). */
export function latin1(b: Uint8Array, s = 0, e = b.length): string {
  let out = '';
  for (let i = s; i < e; i += 8192)
    out += String.fromCharCode(...b.subarray(i, Math.min(e, i + 8192)));
  return out;
}

export function fromLatin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

export const num = (v: number): Tok => ({ t: 'num', v, raw: '' });
export const name = (v: string): Tok => ({ t: 'name', v });
