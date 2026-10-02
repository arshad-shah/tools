import { toCsv } from '@/shared/lib/data-formats';
import { deriveFilename } from '@/shared/lib/download';
import type { Row } from './edit';

const TOOL_ID = 'csv-viewer';

/** The shown rows as JSON, for the JSON Viewer (spec 8.2). */
export function jsonPayload(rows: readonly Row[], sourceName: string) {
  return {
    kind: 'text' as const,
    mime: 'application/json',
    text: JSON.stringify(rows, null, 2),
    sourceTool: TOOL_ID,
    filename: deriveFilename(sourceName, '', 'json'),
  };
}

/** The shown rows as CSV text, for Text Diff and other text tools (spec 8.2). */
export function csvTextPayload(
  rows: readonly Row[],
  columns: readonly string[],
  sourceName: string,
) {
  return {
    kind: 'text' as const,
    mime: 'text/plain',
    text: toCsv(rows, { columns: [...columns] }),
    sourceTool: TOOL_ID,
    filename: deriveFilename(sourceName, '', 'csv'),
  };
}
