import type React from 'react';
import type { EditorView } from '@codemirror/view';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';

export type { LanguageId };

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A lint diagnostic on 1-based `line`; `column` is 1-based too. Without a
 * column the whole line is marked; `endColumn` (exclusive) widens the mark.
 */
export interface EditorDiagnostic {
  line: number;
  column?: number;
  endColumn?: number;
  message: string;
  severity: DiagnosticSeverity;
}

export type LineDecorationKind =
  | 'added'
  | 'removed'
  | 'changed'
  | 'match'
  | 'active';

/** A whole-line tint on 1-based `line`. */
export interface LineDecoration {
  line: number;
  kind: LineDecorationKind;
}

export type RangeKind =
  | 'match'
  | 'match-active'
  | 'diff-add'
  | 'diff-del'
  | 'search';

/** Characters `[start, end)` of the document (UTF-16 offsets), tinted. */
export interface CodeRange {
  start: number;
  end: number;
  kind: RangeKind;
}

/**
 * A collapsed region: 1-based lines `fromLine` to `toLine`, both included,
 * shown as one row with a "Show N hidden lines" button. `label` is shown
 * beside the button (a hunk header, say) and may be empty.
 */
export interface CodeFold {
  fromLine: number;
  toLine: number;
  label: string;
}

export interface CodeEditorHandle {
  focus(): void;
  /** Offsets into the document; `scroll` (default true) brings it into view. */
  setSelection(start: number, end: number, opts?: { scroll?: boolean }): void;
  /** Scrolls 1-based line `n` to the top of the view. */
  scrollToLine(n: number): void;
  /** Sets the scroll offsets in px (a synced twin editor). */
  scrollToPosition(pos: { top?: number; left?: number }): void;
  /** The CodeMirror view, once mounted. */
  readonly view: EditorView | null;
}

export interface CodeEditorProps {
  /** Controlled text. Leave undefined (with `defaultValue`) for uncontrolled. */
  value?: string;
  defaultValue?: string;
  onChange?(value: string): void;
  /** Syntax highlighting. Default 'plain'. */
  language?: LanguageId;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  readOnly?: boolean;
  /** Soft-wrap long lines (off in large-document mode). */
  wrap?: boolean;
  /** Default true (false for `singleLine`). */
  lineNumbers?: boolean;
  /**
   * Gutter text per line (index 0 is line 1) shown instead of the line
   * number; null leaves the cell blank (a diff's original line numbers).
   */
  lineLabels?: readonly (number | string | null)[];
  placeholder?: string;
  tabSize?: number;
  diagnostics?: readonly EditorDiagnostic[];
  lineDecorations?: readonly LineDecoration[];
  ranges?: readonly CodeRange[];
  /** Collapsed regions; the editor is read-only while any are given. */
  folds?: readonly CodeFold[];
  onUnfold?(index: number): void;
  /** One line: Enter calls `onSubmit`, newlines are dropped, no gutter. */
  singleLine?: boolean;
  onSubmit?(): void;
  /** Find and replace (Mod+F). Default true. */
  find?: boolean;
  /**
   * Large documents: past this many characters highlighting, wrapping and
   * bracket matching turn off so huge files stay fast. Default 2,000,000;
   * `true` forces the mode, `false` never enters it.
   */
  largeDocument?: boolean | number;
  onSelectionChange?(start: number, end: number): void;
  /** The scroll offsets changed (to sync a twin editor). */
  onScroll?(pos: { top: number; left: number }): void;
  minHeight?: number | string;
  /** Default 480 px; pass 'none' to fill a sized parent. */
  maxHeight?: number | string;
  ref?: React.Ref<CodeEditorHandle>;
}
