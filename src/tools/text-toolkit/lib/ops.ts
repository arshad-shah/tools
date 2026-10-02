import type { ToolkitSettings } from '../settings';
import { convertCase, slugify, type CaseKind } from './case';
import { clean, type UnicodeForm } from './clean';
import { lineOps, type SortMode } from './lines';

export type OpGroup = 'Case' | 'Lines' | 'Clean';

/** One toolbar operation: a button and a Mod+K command with the same label. */
export interface TextOp {
  id: string;
  label: string;
  group: OpGroup;
  run(text: string): string;
  /** Options remembered in settings when the operation runs. */
  remember?: Partial<ToolkitSettings>;
}

/** Options that live in the panel only (never persisted). */
export interface TransientOptions {
  /** Filter lines: keep lines containing this text. */
  filter: string;
}

const CASES: [CaseKind, string][] = [
  ['lower', 'Lower case'],
  ['upper', 'Upper case'],
  ['title', 'Title case'],
  ['sentence', 'Sentence case'],
  ['camel', 'Camel case'],
  ['pascal', 'Pascal case'],
  ['snake', 'Snake case'],
  ['kebab', 'Kebab case'],
  ['constant', 'Constant case'],
  ['dot', 'Dot case'],
];

const SORTS: [SortMode, string][] = [
  ['az', 'Sort A to Z'],
  ['za', 'Sort Z to A'],
  ['natural', 'Sort naturally'],
  ['length', 'Sort by length'],
  ['numeric', 'Sort numerically'],
];

const FORMS: UnicodeForm[] = ['NFC', 'NFD', 'NFKC', 'NFKD'];

/** Every operation, with the current options bound in. */
export function buildOps(s: ToolkitSettings, t: TransientOptions): TextOp[] {
  const ops: TextOp[] = [
    ...CASES.map(
      ([kind, label]): TextOp => ({
        id: `case-${kind}`,
        label,
        group: 'Case',
        run: (text) => convertCase(text, kind),
      }),
    ),
    {
      id: 'case-slug',
      label: 'Slugify',
      group: 'Case',
      run: (text) =>
        text
          .split(/\r?\n/)
          .map((l) => slugify(l, s.slugSep))
          .join('\n'),
    },
    ...SORTS.map(
      ([mode, label]): TextOp => ({
        id: `sort-${mode}`,
        label,
        group: 'Lines',
        run: (text) => lineOps.sort(text, mode),
        remember: { sortMode: mode },
      }),
    ),
    {
      id: 'lines-dedupe',
      label: 'Remove duplicate lines',
      group: 'Lines',
      run: (text) =>
        lineOps.dedupe(text, {
          caseInsensitive: s.dedupeCaseInsensitive,
          keep: s.dedupeKeep,
        }),
    },
    {
      id: 'lines-reverse',
      label: 'Reverse lines',
      group: 'Lines',
      run: lineOps.reverse,
    },
    {
      id: 'lines-shuffle',
      label: 'Shuffle lines',
      group: 'Lines',
      run: lineOps.shuffle,
    },
    {
      id: 'lines-trim',
      label: 'Trim lines',
      group: 'Lines',
      run: lineOps.trim,
    },
    {
      id: 'lines-remove-empty',
      label: 'Remove empty lines',
      group: 'Lines',
      run: lineOps.removeEmpty,
    },
    {
      id: 'lines-number',
      label: 'Number lines',
      group: 'Lines',
      run: (text) =>
        lineOps.number(text, { start: s.numberStart, sep: s.numberSep }),
    },
    {
      id: 'lines-affix',
      label: 'Add prefix and suffix',
      group: 'Lines',
      run: (text) =>
        s.prefix || s.suffix
          ? lineOps.affix(text, { prefix: s.prefix, suffix: s.suffix })
          : text,
    },
    {
      id: 'lines-join',
      label: 'Join lines',
      group: 'Lines',
      run: (text) => lineOps.join(text, s.joinSep),
    },
    {
      id: 'lines-split',
      label: 'Split into lines',
      group: 'Lines',
      run: (text) => lineOps.split(text, s.splitSep),
    },
    {
      id: 'lines-filter',
      label: 'Filter lines',
      group: 'Lines',
      run: (text) =>
        t.filter === ''
          ? text
          : lineOps.filter(text, {
              contains: t.filter,
              invert: s.filterInvert,
            }),
    },
    {
      id: 'clean-whitespace',
      label: 'Collapse whitespace',
      group: 'Clean',
      run: clean.collapseWhitespace,
    },
    {
      id: 'clean-tabs-to-spaces',
      label: 'Tabs to spaces',
      group: 'Clean',
      run: (text) => clean.tabsToSpaces(text, s.tabSize),
    },
    {
      id: 'clean-spaces-to-tabs',
      label: 'Spaces to tabs',
      group: 'Clean',
      run: (text) => clean.spacesToTabs(text, s.tabSize),
    },
    {
      id: 'clean-diacritics',
      label: 'Remove diacritics',
      group: 'Clean',
      run: clean.removeDiacritics,
    },
    {
      id: 'clean-non-printable',
      label: 'Strip non-printable characters',
      group: 'Clean',
      run: clean.stripNonPrintable,
    },
    {
      id: 'clean-lf',
      label: 'Line endings to LF',
      group: 'Clean',
      run: (text) => clean.normaliseLineEndings(text, 'lf'),
    },
    {
      id: 'clean-crlf',
      label: 'Line endings to CRLF',
      group: 'Clean',
      run: (text) => clean.normaliseLineEndings(text, 'crlf'),
    },
    ...FORMS.map(
      (form): TextOp => ({
        id: `clean-${form.toLowerCase()}`,
        label: `Unicode ${form}`,
        group: 'Clean',
        run: (text) => clean.normaliseUnicode(text, form),
      }),
    ),
  ];
  return ops;
}
