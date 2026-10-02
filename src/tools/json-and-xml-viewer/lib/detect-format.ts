export type DocFormat = 'json' | 'xml' | 'yaml';

const EXT: Record<string, DocFormat> = {
  json: 'json',
  geojson: 'json',
  xml: 'xml',
  svg: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

/**
 * The format of `text`: a known file extension wins, then the first
 * non-space character (`{` or `[` is JSON, `<` is XML), else YAML.
 */
export function detectFormat(text: string, fileName?: string): DocFormat {
  const ext = fileName?.toLowerCase().split('.').pop();
  if (ext && fileName!.includes('.') && EXT[ext]) return EXT[ext];
  // \s covers a leading byte-order mark.
  const first = /\S/.exec(text)?.[0];
  if (first === '{' || first === '[') return 'json';
  if (first === '<') return 'xml';
  return first === undefined ? 'json' : 'yaml';
}
