import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/*
 * The editor's look, from Cynosure tokens only: every colour, the mono font,
 * radius and focus ring are `var(--cy-…)`, so light, dark, contrast and a
 * theme change apply with no re-theme. Syntax roles read Cynosure's
 * `--cy-color-syntax-*` palette tokens and fall back to its tone roles on a
 * Cynosure without them. CodeMirror scopes these rules to each editor.
 */
const c = (role: string) => `var(--cy-color-${role})`;
const syn = (role: string, fallback: string) =>
  `var(--cy-color-syntax-${role}, ${c(fallback)})`;
/** A translucent tint of a Cynosure colour, for line and range marks. */
const tint = (role: string, pct: number) =>
  `color-mix(in srgb, ${c(role)} ${pct}%, transparent)`;

const base = EditorView.theme({
  '&': {
    color: c('ink'),
    backgroundColor: c('surface'),
    border: `1px solid ${c('line')}`,
    borderRadius: 'var(--cy-radius-md)',
    fontSize: 'var(--cy-font-size-sm)',
    overflow: 'hidden',
  },
  '&.cm-focused': {
    outline: `2px solid ${c('ring')}`,
    outlineOffset: '2px',
  },
  '.cm-scroller': {
    fontFamily: 'var(--cy-font-mono)',
    lineHeight: '1.6',
    fontVariantLigatures: 'none',
  },
  '.cm-content': { caretColor: c('ink'), padding: '8px 0' },
  '.cm-line': { padding: '0 12px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: c('ink') },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: c('accent-soft') },
  '.cm-gutters': {
    backgroundColor: c('soft'),
    color: c('muted'),
    borderRight: `1px solid ${c('line')}`,
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px' },
  '.cm-activeLine': { backgroundColor: tint('soft', 60) },
  '.cm-activeLineGutter': { backgroundColor: c('soft'), color: c('ink') },
  '.cm-placeholder': { color: c('muted') },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: c('accent-soft'),
    outline: `1px solid ${tint('accent', 50)}`,
  },
  '.cm-nonmatchingBracket': { color: c('danger-text') },
  '.cm-panels': {
    backgroundColor: c('surface-raised'),
    color: c('ink'),
  },
  '.cm-panels-top': { borderBottom: `1px solid ${c('line')}` },
  '.cm-panels-bottom': { borderTop: `1px solid ${c('line')}` },
  '.cm-searchMatch': { backgroundColor: tint('warning', 28) },
  '.cm-searchMatch-selected': {
    backgroundColor: tint('warning', 55),
    outline: `1px solid ${c('warning')}`,
  },
  '.cm-selectionMatch': { backgroundColor: tint('accent', 14) },
  '.cm-tooltip': {
    backgroundColor: c('surface-raised'),
    color: c('ink'),
    border: `1px solid ${c('line')}`,
    borderRadius: 'var(--cy-radius-sm)',
  },
  '.cm-tooltip-lint': { padding: '0' },
  '.cm-diagnostic': { padding: '4px 8px', fontFamily: 'var(--cy-font-sans)' },
  '.cm-diagnostic-error': { borderLeft: `4px solid ${c('danger')}` },
  '.cm-diagnostic-warning': { borderLeft: `4px solid ${c('warning')}` },
  '.cm-diagnostic-info': { borderLeft: `4px solid ${c('info')}` },
  '.cm-lintRange-error, .cm-lintRange-warning, .cm-lintRange-info': {
    backgroundImage: 'none',
    textDecorationLine: 'underline',
    textDecorationStyle: 'wavy',
    textUnderlineOffset: '4px',
  },
  '.cm-lintRange-error': { textDecorationColor: c('danger') },
  '.cm-lintRange-warning': { textDecorationColor: c('warning') },
  '.cm-lintRange-info': {
    textDecorationColor: c('info'),
    textDecorationStyle: 'dotted',
  },
  '.cm-lint-marker': { width: '0.8em', height: '0.8em' },
  '.cm-panel.cm-panel-lint ul [aria-selected]': {
    backgroundColor: c('accent-soft'),
  },
  // Tools' marks: whole lines and character ranges (decorations.ts).
  '.cm-tl-line-added': { backgroundColor: tint('success', 14) },
  '.cm-tl-line-removed': { backgroundColor: tint('danger', 14) },
  '.cm-tl-line-changed': { backgroundColor: tint('warning', 16) },
  '.cm-tl-line-match': { backgroundColor: tint('warning', 18) },
  '.cm-tl-line-active': { backgroundColor: c('soft') },
  '.cm-tl-range-match, .cm-tl-range-search': {
    backgroundColor: tint('warning', 32),
    borderRadius: '2px',
  },
  '.cm-tl-range-match-active': {
    backgroundColor: tint('warning', 60),
    outline: `1px solid ${c('warning')}`,
    borderRadius: '2px',
  },
  '.cm-tl-range-diff-add': { backgroundColor: tint('success', 34) },
  '.cm-tl-range-diff-del': { backgroundColor: tint('danger', 34) },
  '.cm-foldGutter .cm-gutterElement': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    cursor: 'pointer',
  },
  // A chevron from two borders: down when open, right when folded.
  '.cm-tl-fold-marker': {
    width: '6px',
    height: '6px',
    borderRight: `1.5px solid ${c('muted')}`,
    borderBottom: `1.5px solid ${c('muted')}`,
    transform: 'translateY(-2px) rotate(45deg)',
    opacity: '0.7',
  },
  '.cm-tl-fold-marker.cm-tl-closed': {
    transform: 'rotate(-45deg)',
    opacity: '1',
  },
  '.cm-gutterElement:hover .cm-tl-fold-marker': { opacity: '1' },
  '.cm-foldPlaceholder': {
    backgroundColor: c('soft'),
    border: `1px solid ${c('line')}`,
    color: c('muted'),
    borderRadius: 'var(--cy-radius-sm)',
    padding: '0 4px',
  },
  '.cm-tl-fold': {
    padding: '2px 12px',
    backgroundColor: c('soft'),
    borderBlock: `1px dashed ${c('line')}`,
    fontFamily: 'var(--cy-font-sans)',
  },
});

/** A one-line field: control height, no gutter, 44px on coarse pointers. */
const oneLine = EditorView.theme({
  '&': { minHeight: 'var(--cy-control-height-md, 36px)' },
  '.cm-scroller': { overflowY: 'hidden' },
  '.cm-content': { padding: '6px 0' },
  '@media (pointer: coarse)': { '&': { minHeight: '44px' } },
});

const highlight = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.modifier,
      t.controlKeyword,
      t.operatorKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
      t.self,
    ],
    color: syn('keyword', 'accent-text'),
  },
  {
    tag: [t.string, t.special(t.string), t.character, t.inserted, t.url],
    color: syn('string', 'success-text'),
  },
  {
    tag: [t.number, t.bool, t.null, t.atom, t.unit],
    color: syn('number', 'warning-text'),
  },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment, t.meta],
    color: syn('comment', 'muted'),
    fontStyle: 'italic',
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    color: syn('function', 'info-text'),
  },
  {
    tag: [t.typeName, t.className, t.namespace],
    color: syn('type', 'info-text'),
  },
  {
    tag: [t.propertyName, t.definition(t.propertyName), t.labelName],
    color: syn('property', 'accent-text'),
  },
  { tag: [t.variableName, t.name], color: syn('variable', 'ink') },
  {
    tag: [t.operator, t.punctuation, t.separator, t.bracket],
    color: syn('operator', 'muted'),
  },
  { tag: [t.tagName, t.angleBracket], color: syn('tag', 'danger-text') },
  { tag: t.attributeName, color: syn('attribute', 'warning-text') },
  { tag: [t.regexp, t.escape], color: syn('regexp', 'danger-text') },
  { tag: t.heading, color: syn('keyword', 'accent-text'), fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, textDecoration: 'underline' },
  { tag: [t.invalid, t.deleted], color: c('danger-text') },
]);

/** The editor's Cynosure theme and syntax colours. */
export const cynosureEditorTheme: Extension = [
  base,
  syntaxHighlighting(highlight),
];

export const singleLineTheme: Extension = oneLine;

/** Height limits of one editor (px numbers or CSS lengths). */
export function sizeTheme(
  minHeight: number | string | undefined,
  maxHeight: number | string,
): Extension {
  const len = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
  const root: Record<string, string> = {};
  if (minHeight !== undefined) root.minHeight = len(minHeight);
  if (maxHeight !== 'none') root.maxHeight = len(maxHeight);
  if (maxHeight === '100%') root.height = '100%';
  return EditorView.theme({ '&': root });
}
