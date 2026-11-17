import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  type EditorState,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import type { Diagnostic } from '@codemirror/lint';
import type {
  CodeFold,
  CodeRange,
  EditorDiagnostic,
  LineDecoration,
} from './types';

/*
 * Tools' marks as CodeMirror decorations: whole-line tints (diff rows, the
 * active match row), character ranges (regex matches, word-level diff
 * marks, search hits) and folds (collapsed unchanged diff hunks). They live
 * in state fields, so an edit maps them until the next props replace them.
 */

const lineMark = (kind: string) =>
  Decoration.line({ class: `cm-tl-line-${kind}` });
const rangeMark = (kind: string) =>
  Decoration.mark({ class: `cm-tl-range-${kind}` });

/** Where a fold's button is drawn: the editor portals a Cynosure Button in. */
export interface FoldSlots {
  attach(index: number, el: HTMLElement): void;
  detach(el: HTMLElement): void;
}

class FoldWidget extends WidgetType {
  constructor(
    readonly index: number,
    readonly fold: CodeFold,
    readonly slots: FoldSlots,
  ) {
    super();
  }
  eq(other: FoldWidget) {
    return (
      other.index === this.index &&
      other.fold.fromLine === this.fold.fromLine &&
      other.fold.toLine === this.fold.toLine &&
      other.fold.label === this.fold.label &&
      other.slots === this.slots
    );
  }
  toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-tl-fold';
    this.slots.attach(this.index, el);
    return el;
  }
  destroy(el: HTMLElement) {
    this.slots.detach(el);
  }
  ignoreEvent() {
    return true;
  }
}

const RANK: Record<CodeRange['kind'], number> = {
  'diff-add': 1,
  'diff-del': 1,
  search: 2,
  match: 3,
  'match-active': 4,
};

export interface MarkInput {
  lineDecorations?: readonly LineDecoration[];
  ranges?: readonly CodeRange[];
}

/** Line tints and range marks for the current document. */
export function buildMarks(state: EditorState, input: MarkInput) {
  const { doc } = state;
  const out: Range<Decoration>[] = [];
  for (const d of input.lineDecorations ?? []) {
    if (d.line < 1 || d.line > doc.lines) continue;
    out.push(lineMark(d.kind).range(doc.line(d.line).from));
  }
  // Higher-ranked kinds are added last so they draw on top.
  const ranges = [...(input.ranges ?? [])].sort(
    (a, b) => RANK[a.kind] - RANK[b.kind],
  );
  for (const r of ranges) {
    const from = Math.max(0, Math.min(r.start, doc.length));
    const to = Math.max(from, Math.min(r.end, doc.length));
    if (to > from) out.push(rangeMark(r.kind).range(from, to));
  }
  return Decoration.set(out, true);
}

/** Folds as block widgets replacing their lines. */
export function buildFolds(
  state: EditorState,
  folds: readonly CodeFold[],
  slots: FoldSlots,
) {
  const { doc } = state;
  const b = new RangeSetBuilder<Decoration>();
  const sorted = folds
    .map((fold, index) => ({ fold, index }))
    .filter(
      ({ fold }) =>
        fold.fromLine >= 1 &&
        fold.toLine <= doc.lines &&
        fold.toLine >= fold.fromLine,
    )
    .sort((a, b2) => a.fold.fromLine - b2.fold.fromLine);
  let end = -1;
  for (const { fold, index } of sorted) {
    const from = doc.line(fold.fromLine).from;
    const to = doc.line(fold.toLine).to;
    if (from <= end) continue;
    b.add(
      from,
      to,
      Decoration.replace({
        widget: new FoldWidget(index, fold, slots),
        block: true,
      }),
    );
    end = to;
  }
  return b.finish();
}

export const setMarks = StateEffect.define<DecorationSet>();
export const setFolds = StateEffect.define<DecorationSet>();

function decorationField(effect: typeof setMarks) {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(set, tr) {
      let next = set.map(tr.changes);
      for (const e of tr.effects) if (e.is(effect)) next = e.value;
      return next;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

export const marksField = decorationField(setMarks);
export const foldsField = decorationField(setFolds);

/** CodeMirror diagnostics from 1-based line and column markers. */
export function toDiagnostics(
  state: EditorState,
  input: readonly EditorDiagnostic[],
): Diagnostic[] {
  const { doc } = state;
  const out: Diagnostic[] = [];
  for (const d of input) {
    if (d.line < 1) continue;
    const line = doc.line(Math.min(d.line, doc.lines));
    let from = line.from;
    let to = line.to;
    if (d.column !== undefined) {
      from = Math.min(line.to, line.from + Math.max(0, d.column - 1));
      to =
        d.endColumn !== undefined
          ? Math.min(line.to, line.from + Math.max(d.column, d.endColumn - 1))
          : Math.min(line.to, from + 1);
    }
    out.push({ from, to, severity: d.severity, message: d.message });
  }
  return out;
}

/** "Error on line 3, column 4: …", for the polite status. */
export function describeDiagnostic(d: EditorDiagnostic): string {
  const kind =
    d.severity === 'error'
      ? 'Error'
      : d.severity === 'warning'
        ? 'Warning'
        : 'Note';
  const at =
    d.column !== undefined
      ? `line ${d.line}, column ${d.column}`
      : `line ${d.line}`;
  return `${kind} on ${at}: ${d.message}`;
}
