import { ToolError } from '@/shared/lib/errors';
import { parseSheet, type Sheet } from './sheet';
import { NO_STYLES, parseStyles, type Styles } from './styles';
import { openZip, type Zip } from './zip';
import {
  all,
  attr,
  first,
  parseXml,
  readRels,
  resolvePart,
  stringItemText,
} from './xml';

export type SheetState = 'visible' | 'hidden' | 'veryHidden';
export type SheetKind = 'worksheet' | 'chartsheet' | 'other';

export interface SheetInfo {
  name: string;
  state: SheetState;
  kind: SheetKind;
  /** The part holding its cells; null when the workbook names none. */
  part: string | null;
}

export interface Workbook {
  sheets: SheetInfo[];
  /** Dates count from 1904 (old Mac Excel) instead of 1900. */
  date1904: boolean;
  sharedStringCount: number;
  /** Has macros (an .xlsm); they are never run, only noted. */
  hasMacros: boolean;
  /** The number format code of a cell style. */
  formatOf(style: number): string;
  /** Parses one sheet's cells (worksheets only). */
  loadSheet(index: number): Sheet;
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/** True when the bytes start like a zip archive (XLSX is one). */
export const looksLikeZip = (b: Uint8Array) =>
  ZIP_MAGIC.every((v, i) => b[i] === v);

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function kindOf(type: string): SheetKind {
  if (type.endsWith('/worksheet')) return 'worksheet';
  if (type.endsWith('/chartsheet')) return 'chartsheet';
  return 'other';
}

function workbookPart(zip: Zip): string {
  for (const rel of readRels(zip.text('_rels/.rels'), '_rels/.rels').values())
    if (rel.type.endsWith('/officeDocument'))
      return resolvePart('', rel.target);
  return 'xl/workbook.xml';
}

const relsOf = (part: string) => {
  const slash = part.lastIndexOf('/');
  return `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
};

function sharedStrings(zip: Zip, part: string | null): string[] {
  const text = part ? zip.text(part) : null;
  if (!text) return [];
  return all(parseXml(text, part!), 'si').map(stringItemText);
}

/**
 * Opens an XLSX or XLSM workbook: its sheet list, date system, shared
 * strings and number formats. Sheets are parsed on demand.
 */
export function readWorkbook(bytes: Uint8Array): Workbook {
  if (OLE_MAGIC.every((v, i) => bytes[i] === v))
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This is an older .xls workbook (or an encrypted one). Save it as .xlsx in your spreadsheet app, then open it here.',
    );
  if (!looksLikeZip(bytes))
    throw new ToolError('INVALID_FILE', 'This is not an XLSX workbook');
  const zip = openZip(bytes);
  const wbPart = workbookPart(zip);
  const wbText = zip.text(wbPart);
  if (!wbText)
    throw new ToolError(
      'INVALID_FILE',
      'This zip archive has no workbook in it; it is not an XLSX file',
    );
  const doc = parseXml(wbText, wbPart);
  const rels = readRels(zip.text(relsOf(wbPart)), relsOf(wbPart));
  const partOf = (suffix: string, fallback: string): string | null => {
    for (const r of rels.values())
      if (r.type.endsWith(suffix)) return resolvePart(wbPart, r.target);
    return zip.has(fallback) ? fallback : null;
  };
  const pr = first(doc, 'workbookPr');
  const d1904 = pr?.getAttribute('date1904');
  const sheets: SheetInfo[] = all(doc, 'sheet').map((s, i) => {
    const rel = rels.get(attr(s, 'id') ?? '');
    const state = s.getAttribute('state');
    return {
      name: s.getAttribute('name') ?? `Sheet ${i + 1}`,
      state: state === 'hidden' || state === 'veryHidden' ? state : 'visible',
      kind: rel ? kindOf(rel.type) : 'other',
      part: rel ? resolvePart(wbPart, rel.target) : null,
    };
  });
  if (sheets.length === 0)
    throw new ToolError('INVALID_FILE', 'This workbook lists no sheets');
  const strings = sharedStrings(
    zip,
    partOf('/sharedStrings', 'xl/sharedStrings.xml'),
  );
  const stylesPart = partOf('/styles', 'xl/styles.xml');
  const styles: Styles = stylesPart
    ? parseStyles(zip.text(stylesPart))
    : NO_STYLES;
  const date1904 = d1904 === '1' || d1904 === 'true';
  return {
    sheets,
    date1904,
    sharedStringCount: strings.length,
    formatOf: styles.formatOf,
    hasMacros: zip.entries().some((e) => /vbaProject\.bin$/i.test(e.name)),
    loadSheet(index) {
      const info = sheets[index];
      if (!info) throw new ToolError('INVALID_INPUT', 'There is no such sheet');
      if (info.kind !== 'worksheet' || !info.part)
        throw new ToolError(
          'UNSUPPORTED_FEATURE',
          `${info.name} is a ${info.kind === 'chartsheet' ? 'chart sheet' : 'sheet of a kind this viewer does not read'}; it has no cells to show`,
        );
      const text = zip.text(info.part);
      if (text === null)
        throw new ToolError(
          'INVALID_FILE',
          `The cells of ${info.name} are missing from the file`,
        );
      return parseSheet(parseXml(text, info.part), {
        sharedStrings: strings,
        styles,
        date1904,
      });
    },
  };
}
