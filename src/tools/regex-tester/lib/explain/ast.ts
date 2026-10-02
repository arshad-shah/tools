import { ToolError } from '@/shared/lib/errors';

/** Half-open source range `[start, end)` in the pattern. */
export interface Span {
  start: number;
  end: number;
}

export type GroupKind =
  | 'capture'
  | 'named'
  | 'noncapture'
  | 'lookahead'
  | 'negative-lookahead'
  | 'lookbehind'
  | 'negative-lookbehind'
  | 'modifiers';

export type EscapeClassKind = 'd' | 'D' | 'w' | 'W' | 's' | 'S';

export interface CharNode extends Span {
  type: 'char';
  /** The character (a whole code point in Unicode mode). */
  value: string;
}
export interface DotNode extends Span {
  type: 'dot';
}
export interface AnchorNode extends Span {
  type: 'anchor';
  kind: 'start' | 'end';
}
export interface BoundaryNode extends Span {
  type: 'boundary';
  negated: boolean;
}
export interface EscapeClassNode extends Span {
  type: 'escape-class';
  kind: EscapeClassKind;
}
export interface PropertyNode extends Span {
  type: 'property';
  negated: boolean;
  name: string;
  value?: string;
}
export interface BackreferenceNode extends Span {
  type: 'backreference';
  ref: number | string;
}
export interface RangeNode extends Span {
  type: 'range';
  from: CharNode;
  to: CharNode;
}
export interface StringsNode extends Span {
  type: 'strings';
  strings: string[];
}
export type ClassItem =
  | CharNode
  | RangeNode
  | EscapeClassNode
  | PropertyNode
  | ClassNode
  | StringsNode;
export interface ClassNode extends Span {
  type: 'class';
  negated: boolean;
  /** `union` lists members; the others list their operands in order. */
  op: 'union' | 'intersection' | 'subtraction';
  items: ClassItem[];
}
export interface SequenceNode extends Span {
  type: 'sequence';
  items: RegexNode[];
}
export interface AlternationNode extends Span {
  type: 'alternation';
  alternatives: SequenceNode[];
}
export interface GroupNode extends Span {
  type: 'group';
  kind: GroupKind;
  /** Capture number (capture and named groups). */
  index?: number;
  name?: string;
  modifiers?: { add: string; remove: string };
  body: AlternationNode;
}
export interface QuantifierNode extends Span {
  type: 'quantifier';
  min: number;
  /** `Infinity` when unbounded. */
  max: number;
  lazy: boolean;
  target: RegexNode;
}

export type RegexNode =
  | CharNode
  | DotNode
  | AnchorNode
  | BoundaryNode
  | EscapeClassNode
  | PropertyNode
  | BackreferenceNode
  | ClassNode
  | SequenceNode
  | AlternationNode
  | GroupNode
  | QuantifierNode;

export interface RegexAst {
  pattern: string;
  flags: string;
  body: AlternationNode;
  groupCount: number;
  groupNames: string[];
}

/** A syntax error with the 1-based column it points at. */
export class RegexSyntaxError extends ToolError {
  readonly column: number;
  constructor(message: string, column: number) {
    super('INVALID_INPUT', `${message} (column ${column})`);
    this.column = column;
  }
}
