import { css } from './languages/css';
import { csv } from './languages/csv';
import { html } from './languages/html';
import { http } from './languages/http';
import { js } from './languages/js';
import { json } from './languages/json';
import { log } from './languages/log';
import { markdown } from './languages/markdown';
import { regex } from './languages/regex';
import { sql } from './languages/sql';
import { xml } from './languages/xml';
import { yaml } from './languages/yaml';
import type { LanguageDef, LineResult, LineState, Token } from './types';

export type {
  LanguageDef,
  LineResult,
  LineState,
  Token,
  TokenKind,
} from './types';

/**
 * Small incremental tokenisers for CodeSurface (spec §4.7): state machines
 * per language, one line at a time, no backtracking regex over whole text.
 * Worker-safe.
 */
export type LanguageId =
  | 'json'
  | 'xml'
  | 'yaml'
  | 'csv'
  | 'log'
  | 'regex'
  | 'markdown'
  | 'js'
  | 'ts'
  | 'css'
  | 'html'
  | 'sql'
  | 'http'
  | 'plain';

export interface LanguageInfo {
  id: LanguageId;
  label: string;
  /** File extensions without the dot. */
  extensions: string[];
}

export const LANGUAGES: readonly LanguageInfo[] = [
  {
    id: 'json',
    label: 'JSON',
    extensions: ['json', 'jsonc', 'json5', 'map', 'webmanifest'],
  },
  {
    id: 'xml',
    label: 'XML',
    extensions: ['xml', 'svg', 'xsd', 'xsl', 'xslt', 'plist', 'rss', 'atom'],
  },
  { id: 'yaml', label: 'YAML', extensions: ['yaml', 'yml'] },
  { id: 'csv', label: 'CSV', extensions: ['csv', 'tsv'] },
  { id: 'log', label: 'Log', extensions: ['log'] },
  { id: 'regex', label: 'Regular expression', extensions: [] },
  { id: 'markdown', label: 'Markdown', extensions: ['md', 'markdown', 'mdx'] },
  { id: 'js', label: 'JavaScript', extensions: ['js', 'mjs', 'cjs', 'jsx'] },
  { id: 'ts', label: 'TypeScript', extensions: ['ts', 'mts', 'cts', 'tsx'] },
  { id: 'css', label: 'CSS', extensions: ['css'] },
  { id: 'html', label: 'HTML', extensions: ['html', 'htm', 'xhtml'] },
  { id: 'sql', label: 'SQL', extensions: ['sql'] },
  { id: 'http', label: 'HTTP', extensions: ['http', 'rest'] },
  { id: 'plain', label: 'Plain text', extensions: ['txt'] },
];

const DEFS: Record<Exclude<LanguageId, 'plain'>, LanguageDef> = {
  json,
  xml,
  yaml,
  csv,
  log,
  regex,
  markdown,
  js,
  ts: js,
  css,
  html,
  sql,
  http,
};

/** The language for a file name's extension, or 'plain'. */
export function languageForFile(name: string): LanguageId {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return LANGUAGES.find((l) => l.extensions.includes(ext))?.id ?? 'plain';
}

/** Tokens for one line given the state the previous line ended in. */
export function tokenizeLine(
  lang: LanguageId,
  line: string,
  state: LineState = '',
): LineResult {
  const def = lang === 'plain' ? undefined : DEFS[lang];
  return def ? def.tokenizeLine(line, state) : { tokens: [], state: '' };
}

/** Tokens per line for a whole document. */
export function tokenize(lang: LanguageId, text: string): Token[][] {
  const lines = text.split(/\r?\n/);
  const out: Token[][] = [];
  let state: LineState = '';
  for (const line of lines) {
    const r = tokenizeLine(lang, line, state);
    out.push(r.tokens);
    state = r.state;
  }
  return out;
}
