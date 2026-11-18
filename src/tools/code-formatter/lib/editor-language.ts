import type { LanguageId } from '@/shared/editor';
import type { FormatLanguage } from './languages';

/** The editor's highlighting for each formatter language. */
export const EDITOR_LANGUAGE: Record<FormatLanguage, LanguageId> = {
  json: 'json',
  javascript: 'js',
  jsx: 'js',
  typescript: 'ts',
  tsx: 'ts',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'plain',
  sql: 'sql',
  xml: 'xml',
};
