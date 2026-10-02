import { RegexSyntaxError } from './ast';
import { ID_CONTINUE, ID_START, prescan } from './lexical';

/**
 * The parser's position in the pattern and the flag-derived facts every
 * sub-parser reads (escapes, classes, groups).
 */
export class Cursor {
  pos = 0;
  readonly u: boolean;
  readonly v: boolean;
  /** The pattern has named groups (so a k escape is a reference). */
  readonly named: boolean;
  readonly totalGroups: number;
  readonly names: string[];

  constructor(
    readonly src: string,
    flags: string,
  ) {
    this.v = flags.includes('v');
    this.u = this.v || flags.includes('u');
    const pre = prescan(src, this.v);
    this.totalGroups = pre.count;
    this.names = pre.names;
    this.named = pre.names.length > 0;
  }

  fail(message: string, at = this.pos): never {
    throw new RegexSyntaxError(message, at + 1);
  }

  peek(offset = 0): string | undefined {
    return this.src[this.pos + offset];
  }

  eat(s: string): boolean {
    if (this.src.startsWith(s, this.pos)) {
      this.pos += s.length;
      return true;
    }
    return false;
  }

  /** The next source character, a whole code point in Unicode mode. */
  nextChar(): string {
    if (this.u) {
      const cp = this.src.codePointAt(this.pos)!;
      return String.fromCodePoint(cp);
    }
    return this.src[this.pos];
  }

  groupName(): string {
    const start = this.pos;
    const close = this.src.indexOf('>', this.pos);
    if (close === -1) this.fail('Invalid capture group name');
    const name = this.src.slice(this.pos, close);
    const chars = [...name];
    if (
      chars.length === 0 ||
      !ID_START.test(chars[0]) ||
      !chars.every((ch) => ID_CONTINUE.test(ch) || ch === '$')
    )
      this.fail('Invalid capture group name', start);
    this.pos = close + 1;
    return name;
  }
}
