import type { FormatLanguage } from './languages';

const BY_EXTENSION: Record<string, FormatLanguage> = {
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  graphql: 'graphql',
  gql: 'graphql',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  xsd: 'xml',
  xsl: 'xml',
  plist: 'xml',
};

const HTML_TAG =
  /<(html|head|body|div|span|p|a|ul|ol|li|table|section|article|nav|header|footer|main|script|style|link|meta|img|form|input|button|h[1-6])\b/i;

function looksLikeJson(s: string): boolean {
  if (!/^[[{]/.test(s)) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * The language of `code`: the file extension first, then content
 * heuristics (JSON that parses, markup, SQL keywords, GraphQL operations,
 * YAML keys, Markdown blocks, CSS rules, TypeScript and JSX syntax).
 * JavaScript is the fallback.
 */
export function detectLanguage(
  code: string,
  fileName?: string,
): FormatLanguage {
  const ext = fileName?.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
    : '';
  if (ext && BY_EXTENSION[ext]) return BY_EXTENSION[ext];

  const s = code.trim();
  if (s === '') return 'javascript';
  if (looksLikeJson(s)) return 'json';
  if (/^<\?xml\b/i.test(s)) return 'xml';
  if (/^<!doctype html/i.test(s) || /^<html\b/i.test(s)) return 'html';
  if (s.startsWith('<') && !/^<\w+[^>]*>\s*[;)]/.test(s))
    return HTML_TAG.test(s) ? 'html' : 'xml';
  if (
    /^(select|insert|update|delete|create|alter|drop|with|merge|truncate|grant)\b/i.test(
      s,
    )
  )
    return 'sql';
  if (
    /^(query|mutation|subscription|fragment)\b[^{]*\{/.test(s) ||
    /^(type|input|enum|interface|schema|scalar|union)\s+\w+[^{=;]*\{[^}]*(\b(Int|Float|String|Boolean|ID)\b|!)/.test(
      s,
    )
  )
    return 'graphql';
  if (/^\s*\$[\w-]+\s*:[^;]+;/m.test(s) && s.includes('{')) return 'scss';
  if (/^#{1,6}\s/m.test(s) && !/[{};]\s*$/m.test(s)) return 'markdown';
  if (/^---\s*$/m.test(s) || (/^[\w"'-]+:\s/m.test(s) && !/[{};]/.test(s)))
    return 'yaml';
  if (/^\s*[-*]\s/m.test(s) && !/[{};]/.test(s)) return 'markdown';
  if (
    /^[^{}()=;]*\{[^{}]*:[^{}]*\}/m.test(s) &&
    !/\b(function|const|let|var|return|=>)\b/.test(s) &&
    !/^(interface|type|enum|class|export|import|declare|namespace)\b/m.test(s)
  ) {
    if (
      /^\s*\$[\w-]+\s*:/m.test(s) ||
      /&[:.\w-]/.test(s) ||
      /@(mixin|include|use)\b/.test(s)
    )
      return 'scss';
    if (/^\s*@[\w-]+\s*:/m.test(s) || /\.[\w-]+\(\);/.test(s)) return 'less';
    return 'css';
  }
  const ts =
    /\b(interface|type)\s+\w+(\s*<[^>]*>)?\s*[={]/.test(s) ||
    /\b(enum|namespace|declare|implements|readonly)\s/.test(s) ||
    /[\w)]\s*:\s*(string|number|boolean|unknown|any|void|never)\b/.test(s) ||
    /\bas\s+(const|string|number|unknown)\b/.test(s) ||
    /\(\s*\w+\??\s*:\s*[A-Za-z_{[]/.test(s);
  const jsx =
    /<[A-Za-z][\w.]*(\s[^<>]*)?\/?>/.test(s) &&
    /(return|=>|=)\s*\(?\s*</.test(s);
  if (ts) return jsx ? 'tsx' : 'typescript';
  return jsx ? 'jsx' : 'javascript';
}
