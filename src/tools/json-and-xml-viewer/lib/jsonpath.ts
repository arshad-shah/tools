import { ToolError } from '@/shared/lib/errors';
import type { PathSeg } from './paths';

/**
 * JSONPath, a hand-written subset of RFC 9535: `$`, `.name`, `['name']`,
 * `.*`, `[*]`, `..`, `[n]` (negative from the end), `[start:end:step]`,
 * unions and filters (`[?(@.price < 10 && @.tag == 'x')]`, also without the
 * parentheses) with `== != < <= > >= && || !`, literals, `@` and `$` paths
 * and `length()`. Nothing is evaluated as script.
 */

export type Selector =
  | { t: 'name'; name: string }
  | { t: 'wild' }
  | { t: 'index'; i: number }
  | { t: 'slice'; start?: number; end?: number; step?: number }
  | { t: 'filter'; expr: Expr };

export interface Segment {
  descendant: boolean;
  selectors: Selector[];
}

export interface JsonPathAst {
  segments: Segment[];
}

export type CompareOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

export type Expr =
  | { t: 'or' | 'and'; a: Expr; b: Expr }
  | { t: 'not'; a: Expr }
  | { t: 'cmp'; op: CompareOp; a: Operand; b: Operand }
  | { t: 'exists'; q: Query };

export type Operand =
  | { t: 'lit'; v: unknown }
  | { t: 'query'; q: Query }
  | { t: 'length'; arg: Operand };

export interface Query {
  root: '@' | '$';
  segments: Segment[];
}

export type JsonPathError = ToolError & { column: number };

function fail(message: string, at: number): never {
  const column = at + 1;
  throw Object.assign(
    new ToolError('INVALID_INPUT', `${message} at column ${column}`),
    { column },
  );
}

const NAME_START = /[A-Za-z_\u0080-￿]/;
const NAME_CHAR = /[A-Za-z0-9_\u0080-￿]/;
const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const INT_RE = /-?(?:0|[1-9]\d*)/y;

const ESC: Record<string, string> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  '/': '/',
  '\\': '\\',
  "'": "'",
  '"': '"',
};

class Parser {
  i = 0;
  constructor(readonly s: string) {}

  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }

  peek(n = 0) {
    return this.s[this.i + n];
  }

  eat(token: string): boolean {
    if (this.s.startsWith(token, this.i)) {
      this.i += token.length;
      return true;
    }
    return false;
  }

  expect(token: string) {
    if (!this.eat(token)) fail(`Expected '${token}'`, this.i);
  }

  query(): JsonPathAst {
    this.ws();
    this.expect('$');
    const segments = this.segments();
    this.ws();
    if (this.i < this.s.length) fail(`Unexpected '${this.s[this.i]}'`, this.i);
    return { segments };
  }

  segments(): Segment[] {
    const out: Segment[] = [];
    for (;;) {
      const save = this.i;
      this.ws();
      const c = this.peek();
      if (c === '.' && this.peek(1) === '.') {
        this.i += 2;
        if (this.peek() === '[')
          out.push({ descendant: true, selectors: this.bracket() });
        else out.push({ descendant: true, selectors: [this.dotted()] });
      } else if (c === '.') {
        this.i++;
        out.push({ descendant: false, selectors: [this.dotted()] });
      } else if (c === '[') {
        out.push({ descendant: false, selectors: this.bracket() });
      } else {
        this.i = save;
        return out;
      }
    }
  }

  dotted(): Selector {
    if (this.eat('*')) return { t: 'wild' };
    const start = this.i;
    if (!NAME_START.test(this.peek() ?? ''))
      fail('Expected a member name', this.i);
    while (this.i < this.s.length && NAME_CHAR.test(this.s[this.i])) this.i++;
    return { t: 'name', name: this.s.slice(start, this.i) };
  }

  bracket(): Selector[] {
    this.expect('[');
    const out: Selector[] = [];
    for (;;) {
      this.ws();
      if (this.i >= this.s.length) fail("Expected ']'", this.i);
      out.push(this.selector());
      this.ws();
      if (this.eat(',')) continue;
      if (this.eat(']')) return out;
      fail("Expected ']'", this.i);
    }
  }

  int(): number | undefined {
    INT_RE.lastIndex = this.i;
    const m = INT_RE.exec(this.s);
    if (!m) return undefined;
    this.i += m[0].length;
    return Number(m[0]);
  }

  selector(): Selector {
    const c = this.peek();
    if (c === "'" || c === '"') return { t: 'name', name: this.string() };
    if (c === '*') {
      this.i++;
      return { t: 'wild' };
    }
    if (c === '?') {
      this.i++;
      this.ws();
      return { t: 'filter', expr: this.or() };
    }
    const at = this.i;
    const first = this.int();
    this.ws();
    if (this.peek() !== ':') {
      if (first === undefined) fail('Expected a selector', at);
      return { t: 'index', i: first };
    }
    const parts: (number | undefined)[] = [first];
    while (parts.length < 3 && this.eat(':')) {
      this.ws();
      parts.push(this.int());
      this.ws();
    }
    const [start, end, step] = parts;
    return { t: 'slice', start, end, step };
  }

  string(): string {
    const q = this.s[this.i++];
    let out = '';
    for (;;) {
      if (this.i >= this.s.length)
        fail(`Expected ${q === "'" ? "'" : '"'} to close the string`, this.i);
      const c = this.s[this.i++];
      if (c === q) return out;
      if (c !== '\\') {
        out += c;
        continue;
      }
      const e = this.s[this.i++];
      if (e === 'u') {
        const hex = this.s.slice(this.i, this.i + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('Invalid \\u escape', this.i);
        out += String.fromCharCode(parseInt(hex, 16));
        this.i += 4;
      } else if (e !== undefined && ESC[e] !== undefined) out += ESC[e];
      else fail('Invalid escape', this.i - 1);
    }
  }

  or(): Expr {
    let a = this.and();
    for (;;) {
      this.ws();
      if (!this.eat('||')) return a;
      a = { t: 'or', a, b: this.and() };
    }
  }

  and(): Expr {
    let a = this.not();
    for (;;) {
      this.ws();
      if (!this.eat('&&')) return a;
      a = { t: 'and', a, b: this.not() };
    }
  }

  not(): Expr {
    this.ws();
    if (this.peek() === '!' && this.peek(1) !== '=') {
      this.i++;
      return { t: 'not', a: this.not() };
    }
    return this.comparison();
  }

  comparison(): Expr {
    this.ws();
    if (this.peek() === '(') {
      this.i++;
      const inner = this.or();
      this.ws();
      this.expect(')');
      return inner;
    }
    const at = this.i;
    const a = this.operand();
    this.ws();
    const op = (['==', '!=', '<=', '>=', '<', '>'] as const).find((o) =>
      this.s.startsWith(o, this.i),
    );
    if (!op) {
      if (a.t === 'query') return { t: 'exists', q: a.q };
      if (a.t === 'length')
        fail('Expected a comparison after length()', this.i);
      fail('Expected a comparison', at);
    }
    this.i += op.length;
    this.ws();
    return { t: 'cmp', op, a, b: this.operand() };
  }

  operand(): Operand {
    this.ws();
    const c = this.peek();
    if (c === '@' || c === '$') {
      this.i++;
      return { t: 'query', q: { root: c, segments: this.segments() } };
    }
    if (c === "'" || c === '"') return { t: 'lit', v: this.string() };
    if (this.eat('true')) return { t: 'lit', v: true };
    if (this.eat('false')) return { t: 'lit', v: false };
    if (this.eat('null')) return { t: 'lit', v: null };
    if (this.eat('length')) {
      this.ws();
      this.expect('(');
      const arg = this.operand();
      this.ws();
      this.expect(')');
      return { t: 'length', arg };
    }
    NUMBER_RE.lastIndex = this.i;
    const m = NUMBER_RE.exec(this.s);
    if (m) {
      this.i += m[0].length;
      return { t: 'lit', v: Number(m[0]) };
    }
    return fail('Expected a value', this.i);
  }
}

/** Parses an expression; errors are INVALID_INPUT with a 1-based column. */
export function parseJsonPath(expr: string): JsonPathAst {
  return new Parser(expr).query();
}

// Evaluation

/** A matched value with a parent link; paths are built only for results. */
interface Hit {
  value: unknown;
  seg?: PathSeg;
  parent?: Hit;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function children(h: Hit, out: Hit[]) {
  const v = h.value;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++)
      out.push({ value: v[i], seg: { t: 'index', i }, parent: h });
  } else if (isObject(v)) {
    for (const k of Object.keys(v))
      out.push({ value: v[k], seg: { t: 'key', k }, parent: h });
  }
}

function sliceIndexes(
  len: number,
  s: Extract<Selector, { t: 'slice' }>,
): number[] {
  const step = s.step ?? 1;
  if (step === 0) return [];
  const norm = (i: number) => (i >= 0 ? i : len + i);
  const out: number[] = [];
  if (step > 0) {
    const lo = Math.min(Math.max(norm(s.start ?? 0), 0), len);
    const hi = Math.min(Math.max(norm(s.end ?? len), 0), len);
    for (let i = lo; i < hi; i += step) out.push(i);
  } else {
    const hi = Math.min(Math.max(norm(s.start ?? len - 1), -1), len - 1);
    const lo = Math.min(Math.max(norm(s.end ?? -len - 1), -1), len - 1);
    for (let i = hi; i > lo; i += step) out.push(i);
  }
  return out;
}

function select(h: Hit, sel: Selector, root: unknown, out: Hit[]) {
  const v = h.value;
  switch (sel.t) {
    case 'name':
      if (isObject(v) && Object.hasOwn(v, sel.name))
        out.push({
          value: v[sel.name],
          seg: { t: 'key', k: sel.name },
          parent: h,
        });
      return;
    case 'wild':
      children(h, out);
      return;
    case 'index':
      if (Array.isArray(v)) {
        const i = sel.i < 0 ? v.length + sel.i : sel.i;
        if (i >= 0 && i < v.length)
          out.push({ value: v[i], seg: { t: 'index', i }, parent: h });
      }
      return;
    case 'slice':
      if (Array.isArray(v))
        for (const i of sliceIndexes(v.length, sel))
          out.push({ value: v[i], seg: { t: 'index', i }, parent: h });
      return;
    case 'filter': {
      const kids: Hit[] = [];
      children(h, kids);
      for (const k of kids) if (test(sel.expr, k.value, root)) out.push(k);
    }
  }
}

function run(start: Hit[], segments: Segment[], root: unknown): Hit[] {
  let current = start;
  for (const seg of segments) {
    const next: Hit[] = [];
    for (const h of current) {
      if (!seg.descendant) {
        for (const sel of seg.selectors) select(h, sel, root, next);
        continue;
      }
      // Pre-order walk: a node, then its descendants, in document order.
      const stack: Hit[] = [h];
      while (stack.length) {
        const n = stack.pop()!;
        for (const sel of seg.selectors) select(n, sel, root, next);
        const kids: Hit[] = [];
        children(n, kids);
        for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
      }
    }
    current = next;
  }
  return current;
}

const NOTHING = Symbol('nothing');

function valueOf(o: Operand, at: unknown, root: unknown): unknown {
  if (o.t === 'lit') return o.v;
  if (o.t === 'length') {
    const v = valueOf(o.arg, at, root);
    if (typeof v === 'string') return [...v].length;
    if (Array.isArray(v)) return v.length;
    if (isObject(v)) return Object.keys(v).length;
    return NOTHING;
  }
  const hits = run(
    [{ value: o.q.root === '@' ? at : root }],
    o.q.segments,
    root,
  );
  return hits.length === 1 ? hits[0].value : NOTHING;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a);
    return (
      ka.length === Object.keys(b).length &&
      ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]))
    );
  }
  return false;
}

function less(a: unknown, b: unknown): boolean {
  return (typeof a === 'number' && typeof b === 'number') ||
    (typeof a === 'string' && typeof b === 'string')
    ? (a as number) < (b as number)
    : false;
}

function compare(op: CompareOp, a: unknown, b: unknown): boolean {
  const eq = () => deepEqual(a, b);
  switch (op) {
    case '==':
      return eq();
    case '!=':
      return !eq();
    case '<':
      return less(a, b);
    case '>':
      return less(b, a);
    case '<=':
      return less(a, b) || eq();
    case '>=':
      return less(b, a) || eq();
  }
}

function test(e: Expr, at: unknown, root: unknown): boolean {
  switch (e.t) {
    case 'or':
      return test(e.a, at, root) || test(e.b, at, root);
    case 'and':
      return test(e.a, at, root) && test(e.b, at, root);
    case 'not':
      return !test(e.a, at, root);
    case 'exists':
      return (
        run([{ value: e.q.root === '@' ? at : root }], e.q.segments, root)
          .length > 0
      );
    case 'cmp':
      return compare(e.op, valueOf(e.a, at, root), valueOf(e.b, at, root));
  }
}

function pathOf(h: Hit): PathSeg[] {
  const out: PathSeg[] = [];
  for (let n: Hit | undefined = h; n?.seg; n = n.parent) out.push(n.seg);
  return out.reverse();
}

/** Every node `expr` selects, in document order where defined. */
export function queryJsonPath(
  value: unknown,
  expr: string | JsonPathAst,
): { path: PathSeg[]; value: unknown }[] {
  const ast = typeof expr === 'string' ? parseJsonPath(expr) : expr;
  return run([{ value }], ast.segments, value).map((h) => ({
    path: pathOf(h),
    value: h.value,
  }));
}
