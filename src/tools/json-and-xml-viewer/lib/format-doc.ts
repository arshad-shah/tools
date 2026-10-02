import {
  minifyXml,
  parseJsonWithLocations,
  parseXml,
  parseYaml,
  prettyXml,
  toYaml,
} from '@/shared/lib/data-formats';
import type { DocFormat } from './detect-format';

/** `text` parsed now (never a stale debounced parse) and re-written. */
export async function reformatText(
  text: string,
  format: DocFormat,
  mode: 'pretty' | 'min',
  indent: number,
): Promise<string> {
  if (format === 'xml')
    return reformat(
      format,
      { value: undefined, xml: parseXml(text) },
      mode,
      indent,
    );
  const value =
    format === 'yaml'
      ? await parseYaml(text)
      : parseJsonWithLocations(text).value;
  return reformat(format, { value, xml: null }, mode, indent);
}

/** The parsed document re-written: pretty (with `indent`) or minified. */
export async function reformat(
  format: DocFormat,
  parsed: { value: unknown; xml: Document | null },
  mode: 'pretty' | 'min',
  indent: number,
): Promise<string> {
  const space = indent === 0 ? '\t' : indent;
  if (format === 'xml' && parsed.xml)
    return mode === 'pretty'
      ? prettyXml(parsed.xml, { indent: space })
      : minifyXml(parsed.xml, { keepComments: true });
  if (format === 'yaml' && mode === 'pretty')
    return toYaml(parsed.value, { indent: indent || 2 });
  return mode === 'pretty'
    ? JSON.stringify(parsed.value, null, space) + '\n'
    : JSON.stringify(parsed.value);
}

export const EXTENSION: Record<DocFormat, string> = {
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
};

export const MIME: Record<DocFormat, string> = {
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/yaml',
};

/** Offset of 1-based `line` and `column` in `text`. */
export function offsetOf(text: string, line: number, column = 1): number {
  let at = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf('\n', at);
    if (nl < 0) return text.length;
    at = nl + 1;
  }
  return Math.min(at + column - 1, text.length);
}
