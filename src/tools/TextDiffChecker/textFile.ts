import { loadTextFile } from '@/shared/lib/files';

export const TEXT_EXTS = [
  'txt',
  'md',
  'json',
  'html',
  'css',
  'js',
  'ts',
  'jsx',
  'tsx',
  'xml',
  'yaml',
  'yml',
  'log',
  'csv',
];
/** A file the OS reports with one of these types loads whatever its name. */
const TEXT_MIME = [
  'text/plain',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
];
export const TEXT_ACCEPT = TEXT_EXTS.map((e) => `.${e}`).join(',');
const MAX_BYTES = 10 * 1024 * 1024;

/** Same rule as before: allowed MIME type OR allowed extension, at most 10 MB. */
export function loadDiffFile(file: File) {
  return loadTextFile(file, {
    maxBytes: MAX_BYTES,
    extensions: TEXT_MIME.includes(file.type) ? undefined : TEXT_EXTS,
  });
}
