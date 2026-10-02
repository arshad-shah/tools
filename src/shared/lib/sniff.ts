import type { AcceptKind } from '@/app/tool';
import { detectKind, readBytes } from './files';

export type SniffedKind = Exclude<AcceptKind, 'any'>;

const TEXT_WINDOW = 64 * 1024;
const JSON_PARSE_LIMIT = 2 * 1024 * 1024;
/** An SVG root after an optional XML declaration, comments and doctype. */
const SVG_ROOT =
  /^(?:<\?xml[^>]*\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>/]/i;
const LOG_LINE =
  /^\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}|^\[?(INFO|WARN|WARNING|ERROR|DEBUG)\b/;

function delimited(lines: string[], sep: string): boolean {
  const counts = lines.map((l) => l.split(sep).length - 1).filter((n) => n > 0);
  const tally = new Map<number, number>();
  for (const n of counts) tally.set(n, (tally.get(n) ?? 0) + 1);
  return [...tally.values()].some((v) => v >= 2);
}

/**
 * The kind of a dropped file from its content, never its name (spec §5.3).
 * Binary signatures first, then a UTF-8 text window: JSON, XML, CSV/TSV,
 * logs, else plain text. An SVG root is 'svg' (routing also lets it
 * match XML rules). Undecodable binary is null.
 */
export async function sniffAcceptKind(file: File): Promise<SniffedKind | null> {
  const head = await readBytes(file.slice(0, TEXT_WINDOW));
  const binary = detectKind(head);
  if (binary) return binary;
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x56 &&
    head[3] === 0x45
  )
    return 'riv';

  let text: string;
  try {
    // A cut multi-byte sequence at the window edge is not an error.
    const end = head.length === TEXT_WINDOW ? head.length - 4 : head.length;
    text = new TextDecoder('utf-8', { fatal: true }).decode(
      head.subarray(0, end),
    );
  } catch {
    return null;
  }
  if (text.includes('\u0000')) return null;

  const trimmed = text.trimStart();
  const first = trimmed[0];
  if (first === '{' || first === '[') {
    if (file.size > JSON_PARSE_LIMIT) return 'json';
    try {
      JSON.parse(await file.text());
      return 'json';
    } catch {
      // Not JSON after all: keep sniffing.
    }
  }
  if (SVG_ROOT.test(trimmed)) return 'svg';
  if (trimmed.startsWith('<?xml') || /^<[A-Za-z]/.test(trimmed)) return 'xml';

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sample = lines.slice(0, 10);
  if (delimited(sample, '\t')) return 'tsv';
  if (delimited(sample, ',')) return 'csv';
  const logSample = lines.slice(0, 20);
  if (
    logSample.length &&
    logSample.filter((l) => LOG_LINE.test(l)).length / logSample.length >= 0.5
  )
    return 'log';
  return 'text';
}
