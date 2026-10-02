import { strToU8, zipSync } from 'fflate';
import { ToolError } from '@/shared/lib/errors';
import { cellText } from './csv-write';

/**
 * A minimal SpreadsheetML workbook (one sheet) built with fflate: inline
 * strings, numeric and boolean cells, a header row.
 */

/** Drops characters XML 1.0 forbids even when escaped (most controls). */
const xmlChars = (s: string) =>
  [...s]
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
    })
    .join('');

const esc = (s: string) =>
  xmlChars(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** 0 to A, 25 to Z, 26 to AA. */
export function columnName(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cell(ref: string, v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v))
    return `<c r="${ref}"><v>${v}</v></c>`;
  if (typeof v === 'boolean')
    return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
  const text = cellText(v);
  if (text === '') return '';
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006';

export function toXlsx(
  rows: readonly Record<string, unknown>[],
  columns: string[],
  sheetName = 'Sheet1',
): Uint8Array {
  if (!sheetName || sheetName.length > 31 || /[[\]:*?/\\]/.test(sheetName))
    throw new ToolError(
      'INVALID_INPUT',
      'Sheet names have 1 to 31 characters and no [ ] : * ? / or \\',
    );
  if (rows.length + 1 > 1_048_576)
    throw new ToolError('TOO_LARGE', 'XLSX holds at most 1,048,575 data rows');
  const lines = [columns, ...rows.map((r) => columns.map((c) => r[c]))].map(
    (values, i) =>
      `<row r="${i + 1}">${values.map((v, j) => cell(`${columnName(j)}${i + 1}`, v)).join('')}</row>`,
  );
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${XML}<Types xmlns="${PKG}/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ),
    '_rels/.rels': strToU8(
      `${XML}<Relationships xmlns="${PKG}/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `${XML}<Relationships xmlns="${PKG}/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `${XML}<worksheet xmlns="${NS}"><sheetData>${lines.join('')}</sheetData></worksheet>`,
    ),
    'xl/styles.xml': strToU8(
      `${XML}<styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    ),
  };
  return zipSync(files, { level: 6 });
}
