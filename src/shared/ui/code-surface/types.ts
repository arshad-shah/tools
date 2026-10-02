import type React from 'react';
import type { LanguageId, Token } from '@/shared/lib/syntax/tokenize';

export type { LanguageId, Token };

export type MarkerSeverity = 'error' | 'warning' | 'info';

/** A diagnostic on a 1-based `line`; `column` is 1-based too. */
export interface CodeMarker {
  line: number;
  column?: number;
  message: string;
  severity: MarkerSeverity;
}

export type LineDecorationKind =
  | 'added'
  | 'removed'
  | 'changed'
  | 'match'
  | 'active';

export interface LineDecoration {
  /** 1-based. */
  line: number;
  kind: LineDecorationKind;
}

export type RangeKind =
  | 'match'
  | 'match-active'
  | 'diff-add'
  | 'diff-del'
  | 'search';

/** Characters `[start, end)` of `value` (UTF-16 offsets). */
export interface CodeRange {
  start: number;
  end: number;
  kind: RangeKind;
}

/**
 * A collapsed region: 1-based lines `fromLine` to `toLine`, both included,
 * are replaced by one row with a "Show N hidden lines" button, where N is
 * `toLine - fromLine + 1`. `label` is shown beside the button (a hunk
 * header, say) and may be empty.
 */
export interface CodeFold {
  fromLine: number;
  toLine: number;
  label: string;
}

/**
 * Lines supplied on demand instead of a `value` string, for very large
 * read-only views (BytesView). `tokens` colours a line; `text` builds the
 * full text for Copy after Mod+A.
 */
export interface LineSource {
  count: number;
  line(index: number): string;
  tokens?(index: number): Token[];
  /** Longest line in characters, for the horizontal extent. */
  maxLength?: number;
  text?(): string;
}

export interface CodeSurfaceHandle {
  focus(): void;
  /** Offsets into `value`; `scroll` (default true) brings it into view. */
  setSelection(start: number, end: number, opts?: { scroll?: boolean }): void;
  /** Scrolls 1-based line `n` into view. */
  scrollToLine(n: number): void;
}

export interface CodeSurfaceProps {
  value: string;
  onChange?(value: string): void;
  language: LanguageId | 'plain';
  /** Accessible name of the editor (required). */
  label: string;
  readOnly?: boolean;
  /** Soft wrap; applies up to 2,000 lines (longer text stays unwrapped). */
  wrap?: boolean;
  lineNumbers?: boolean;
  tabSize?: number;
  placeholder?: string;
  onSelectionChange?(start: number, end: number): void;
  minHeight?: number | string;
  /** Default 480 px; pass 'none' and a sized `className` to fill a layout. */
  maxHeight?: number | string;
  markers?: readonly CodeMarker[];
  lineDecorations?: readonly LineDecoration[];
  ranges?: readonly CodeRange[];
  /** Folds present a read-only view (the text cannot be edited). */
  folds?: readonly CodeFold[];
  onUnfold?(index: number): void;
  /** One line: Enter calls `onSubmit`, newlines are dropped, no gutter. */
  singleLine?: boolean;
  onSubmit?(): void;
  /** Read-only lines on demand; when given `value` is ignored. */
  source?: LineSource;
  className?: string;
  /** Extra description for the textbox (id of an element). */
  'aria-describedby'?: string;
  ref?: React.Ref<CodeSurfaceHandle>;
}
