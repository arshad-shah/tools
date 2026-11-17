import type { DateKind } from './dates';
import { all, children, first, parseXml } from './xml';

/** Built-in number formats (ECMA-376 18.8.30) that the inspector names. */
export const BUILTIN_FORMATS: Record<number, string> = {
  0: 'General',
  1: '0',
  2: '0.00',
  3: '#,##0',
  4: '#,##0.00',
  9: '0%',
  10: '0.00%',
  11: '0.00E+00',
  12: '# ?/?',
  13: '# ??/??',
  14: 'mm-dd-yy',
  15: 'd-mmm-yy',
  16: 'd-mmm',
  17: 'mmm-yy',
  18: 'h:mm AM/PM',
  19: 'h:mm:ss AM/PM',
  20: 'h:mm',
  21: 'h:mm:ss',
  22: 'm/d/yy h:mm',
  37: '#,##0 ;(#,##0)',
  38: '#,##0 ;[Red](#,##0)',
  39: '#,##0.00;(#,##0.00)',
  40: '#,##0.00;[Red](#,##0.00)',
  45: 'mm:ss',
  46: '[h]:mm:ss',
  47: 'mmss.0',
  48: '##0.0E+0',
  49: '@',
};

/** Built-in ids that are dates in some locale (the East Asian ones too). */
const BUILTIN_DATE_IDS = new Set([
  14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 34, 35, 36, 50, 51, 52, 53, 54, 57,
  58,
]);
const BUILTIN_TIME_IDS = new Set([18, 19, 20, 21, 32, 33, 45, 47, 55, 56]);

/**
 * Whether a number format shows a date or time, and which. Quoted text,
 * escaped characters, colours and locale tags are ignored; only the first
 * section (positive numbers) counts. `[h]`, `[m]` or `[s]` is a duration.
 */
export function dateKindOfFormat(code: string): DateKind | null {
  const section = code.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/)[0] ?? '';
  if (/\[(h+|m+|s+)\]/i.test(section)) return 'duration';
  const bare = section
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/[_*]./g, '')
    .replace(/\[[^\]]*\]/g, '');
  if (/^general$/i.test(bare.trim())) return null;
  // E+ and digits placeholders are not date parts; "e" alone is a year.
  const clean = bare.replace(/E[+-]/gi, '');
  const time = /[hs]/i.test(clean) || /AM\/PM|A\/P/i.test(clean);
  const date = /[dy]/i.test(clean) || (/m/i.test(clean) && !time);
  if (date && time) return 'datetime';
  if (date) return 'date';
  if (time) return 'time';
  return null;
}

export interface Styles {
  /** cellXfs index to its format code. */
  formatOf(styleIndex: number): string;
  /** cellXfs index to the kind of date it shows, or null. */
  dateKindOf(styleIndex: number): DateKind | null;
}

export const NO_STYLES: Styles = {
  formatOf: () => 'General',
  dateKindOf: () => null,
};

/** The number format of each cell style in styles.xml. */
export function parseStyles(text: string | null): Styles {
  if (!text) return NO_STYLES;
  const doc = parseXml(text, 'styles.xml');
  const custom = new Map<number, string>();
  for (const f of all(doc, 'numFmt')) {
    const id = Number(f.getAttribute('numFmtId'));
    custom.set(id, f.getAttribute('formatCode') ?? '');
  }
  const xfs = first(doc, 'cellXfs');
  const ids = xfs
    ? children(xfs, 'xf').map((x) => Number(x.getAttribute('numFmtId') ?? 0))
    : [];
  const kinds = ids.map((id) => {
    const code = custom.get(id);
    if (code !== undefined) return dateKindOfFormat(code);
    if (BUILTIN_DATE_IDS.has(id)) return id === 22 ? 'datetime' : 'date';
    if (BUILTIN_TIME_IDS.has(id)) return 'time';
    return id === 46 ? 'duration' : null;
  });
  return {
    formatOf: (i) => {
      const id = ids[i] ?? 0;
      return custom.get(id) ?? BUILTIN_FORMATS[id] ?? `Built-in format ${id}`;
    },
    dateKindOf: (i) => kinds[i] ?? null,
  };
}
