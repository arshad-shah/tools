import { ToolError } from '@/shared/lib/errors';

export type CodecId =
  | 'url-component'
  | 'url-full'
  | 'form'
  | 'html'
  | 'unicode'
  | 'js-string'
  | 'json-string'
  | 'punycode'
  | 'hex'
  | 'base32'
  | 'quoted-printable';

export interface Codec {
  id: CodecId;
  label: string;
  /** How the codec works, for the disclosure under the editor. */
  about: string;
  encode(s: string): string;
  /** Throws CodecError (INVALID_INPUT) naming the position. */
  decode(s: string): string;
}

/** A decode error at a 0-based offset; the message says it 1-based. */
export class CodecError extends ToolError {
  readonly position: number;

  constructor(message: string, position: number) {
    super('INVALID_INPUT', `${message} at position ${position + 1}`);
    this.name = 'CodecError';
    this.position = position;
  }
}

/** UTF-8 bytes to text; an invalid sequence names its source position. */
export function decodeUtf8At(
  bytes: number[],
  positions: number[],
  what: string,
): string {
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    const need =
      b < 0x80
        ? 0
        : b >= 0xf0 && b < 0xf5
          ? 3
          : b >= 0xe0
            ? 2
            : b >= 0xc2 && b < 0xe0
              ? 1
              : -1;
    if (need < 0 || b >= 0xf5)
      throw new CodecError(`Invalid UTF-8 byte in ${what}`, positions[i]);
    for (let k = 1; k <= need; k++) {
      if (i + k >= bytes.length)
        throw new CodecError(`Incomplete ${what}`, positions[i]);
      if ((bytes[i + k] & 0xc0) !== 0x80)
        throw new CodecError(`Invalid UTF-8 sequence in ${what}`, positions[i]);
    }
    i += need + 1;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(bytes),
    );
  } catch {
    // Overlong forms and surrogates pass the shape check above.
    throw new CodecError(
      `Invalid UTF-8 sequence in ${what}`,
      positions[0] ?? 0,
    );
  }
}

/** Applies `fn` to each line; an error names its line. */
export function perLine(fn: (s: string) => string): (s: string) => string {
  return (s) =>
    s
      .split(/\r?\n/)
      .map((line, i) => {
        try {
          return fn(line);
        } catch (e) {
          if (e instanceof ToolError)
            throw new ToolError(e.code, `Line ${i + 1}: ${e.message}`, {
              cause: e,
            });
          throw e;
        }
      })
      .join('\n');
}

/**
 * Decodes repeatedly until the text stops changing (double or triple
 * encoding), at most `max` rounds. A later round that fails stops at the
 * last good output; a failing first round throws.
 */
export function decodeUntilStable(
  codec: Pick<Codec, 'decode'>,
  s: string,
  max = 10,
): { output: string; rounds: number } {
  let output = s;
  let rounds = 0;
  while (rounds < max) {
    let next: string;
    try {
      next = codec.decode(output);
    } catch (e) {
      if (rounds === 0) throw e;
      break;
    }
    if (next === output) break;
    output = next;
    rounds++;
  }
  return { output, rounds };
}
