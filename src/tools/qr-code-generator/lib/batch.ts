import Papa from 'papaparse';
import { uniqueNames } from '@/shared/lib/download';
import { utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { qrSvg, svgToPng, type QrStyle } from './render';

export const BATCH_MAX = 500;

export interface CsvTable {
  columns: string[];
  rows: Record<string, string>[];
}

/** A CSV with a header row. */
export function readCsv(text: string): CsvTable {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
  });
  const columns = (parsed.meta.fields ?? []).filter((c) => c.trim() !== '');
  if (!columns.length)
    throw new ToolError('INVALID_INPUT', 'The CSV needs a header row');
  return { columns, rows: parsed.data };
}

/** A safe file name stem from a cell (no path or reserved characters). */
export function safeStem(s: string): string {
  const printable = [...s].filter((c) => c.charCodeAt(0) >= 0x20).join('');
  const stem = printable
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80);
  return stem || 'qr';
}

export interface BatchOptions {
  format: 'png' | 'svg';
  /** Column for the file names; default the value column. */
  nameColumn?: string;
  style: QrStyle;
  /** PNG pixels. */
  size?: number;
}

/**
 * One QR file per non-empty row of `column`, named from `nameColumn` with
 * duplicates numbered. Feed the result to saveZip.
 */
export async function batchFromCsv(
  text: string,
  column: string,
  { format, nameColumn = column, style, size = 1024 }: BatchOptions,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const { columns, rows } = readCsv(text);
  for (const c of [column, nameColumn])
    if (!columns.includes(c))
      throw new ToolError('INVALID_INPUT', `The CSV has no column "${c}"`);
  const items = rows.filter((r) => (r[column] ?? '').trim() !== '');
  if (!items.length)
    throw new ToolError('INVALID_INPUT', `Column "${column}" is empty`);
  if (items.length > BATCH_MAX)
    throw new ToolError(
      'TOO_LARGE',
      `At most ${BATCH_MAX} codes per batch (this CSV has ${items.length})`,
    );
  const names = uniqueNames(
    items.map((r) => `${safeStem(r[nameColumn] ?? '')}.${format}`),
  );
  const out: { name: string; bytes: Uint8Array }[] = [];
  for (const [i, r] of items.entries()) {
    const svg = await qrSvg(
      r[column].trim(),
      style,
      format === 'svg' ? 512 : size,
    );
    const bytes =
      format === 'svg'
        ? utf8Encode(svg)
        : new Uint8Array(await (await svgToPng(svg, size)).arrayBuffer());
    out.push({ name: names[i], bytes });
  }
  return out;
}
