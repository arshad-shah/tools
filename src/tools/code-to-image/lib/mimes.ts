import type { LanguageId } from '@/shared/lib/syntax/tokenize';

/** Hand-off mimes and the language each one is highlighted as. */
export const LANGUAGE_BY_MIME: Record<string, LanguageId> = {
  'application/json': 'json',
  'application/schema+json': 'json',
  'text/css': 'css',
  'text/html': 'html',
  'application/javascript': 'js',
  'text/javascript': 'js',
  'text/typescript': 'ts',
  'application/sql': 'sql',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'application/yaml': 'yaml',
  'text/markdown': 'markdown',
  // Code with no highlighter yet (JSON to Types' Go, Rust, Python...).
  'text/x-go': 'plain',
  'text/x-rust': 'plain',
  'text/x-python': 'plain',
  'text/x-kotlin': 'plain',
  'text/x-csharp': 'plain',
};

/** Code mimes the tool takes from other tools (kept light: the manifest reads it). */
export const CODE_MIMES = ['text/plain', ...Object.keys(LANGUAGE_BY_MIME)];
