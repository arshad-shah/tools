import type { Options, Plugin } from 'prettier';
import { prettyXml } from '@/shared/lib/data-formats/xml';
import { ToolError } from '@/shared/lib/errors';
import { CodeError } from './errors';
import type { FormatLanguage, FormatOptions } from './languages';

type PrettierLanguage = Exclude<FormatLanguage, 'sql' | 'xml'>;

/** Prettier parser and the plugins it needs, imported only when used. */
const PRETTIER: Record<
  PrettierLanguage,
  { parser: string; plugins: () => Promise<Plugin[]> }
> = {
  json: { parser: 'json', plugins: () => babel() },
  javascript: { parser: 'babel', plugins: () => babel() },
  jsx: { parser: 'babel', plugins: () => babel() },
  typescript: { parser: 'typescript', plugins: () => typescript() },
  tsx: { parser: 'typescript', plugins: () => typescript() },
  css: {
    parser: 'css',
    plugins: () => one(import('prettier/plugins/postcss')),
  },
  scss: {
    parser: 'scss',
    plugins: () => one(import('prettier/plugins/postcss')),
  },
  less: {
    parser: 'less',
    plugins: () => one(import('prettier/plugins/postcss')),
  },
  html: {
    parser: 'html',
    // Inline scripts and styles are formatted too.
    plugins: async () => [
      ...(await one(import('prettier/plugins/html'))),
      ...(await babel()),
      ...(await one(import('prettier/plugins/postcss'))),
    ],
  },
  markdown: {
    parser: 'markdown',
    plugins: () => one(import('prettier/plugins/markdown')),
  },
  yaml: { parser: 'yaml', plugins: () => one(import('prettier/plugins/yaml')) },
  graphql: {
    parser: 'graphql',
    plugins: () => one(import('prettier/plugins/graphql')),
  },
};

const one = async (m: Promise<unknown>): Promise<Plugin[]> => [
  ((await m) as { default?: Plugin }).default ?? ((await m) as Plugin),
];
const babel = async () => [
  ...(await one(import('prettier/plugins/babel'))),
  ...(await one(import('prettier/plugins/estree'))),
];
const typescript = async () => [
  ...(await one(import('prettier/plugins/typescript'))),
  ...(await one(import('prettier/plugins/estree'))),
];

interface PrettierSyntaxError {
  message: string;
  loc?: { start?: { line?: number; column?: number } };
}

/** First line of a Prettier message without its `(line:col)` suffix. */
function prettierError(e: unknown): CodeError {
  const err = e as PrettierSyntaxError;
  const first = String(err?.message ?? e).split('\n')[0];
  const message =
    first.replace(/\s*\(\d+:\d+\)\s*$/, '') || 'Could not parse this code';
  const start = err?.loc?.start;
  return new CodeError(message, start?.line, start?.column, e);
}

async function formatPrettier(
  code: string,
  lang: PrettierLanguage,
  opts: FormatOptions,
): Promise<string> {
  const prettier = await import('prettier/standalone');
  const { parser, plugins } = PRETTIER[lang];
  const options: Options = {
    parser,
    plugins: await plugins(),
    printWidth: opts.printWidth,
    tabWidth: opts.indent === 'tab' ? 2 : opts.indent,
    useTabs: opts.indent === 'tab',
    singleQuote: opts.singleQuote,
    semi: opts.semi,
    trailingComma: opts.trailingComma,
    bracketSpacing: opts.bracketSpacing,
  };
  try {
    return await prettier.format(code, options);
  } catch (e) {
    throw prettierError(e);
  }
}

async function formatSql(code: string, opts: FormatOptions): Promise<string> {
  const { format } = await import('sql-formatter');
  try {
    return (
      format(code, {
        language: opts.sqlDialect,
        keywordCase: opts.keywordCase,
        tabWidth: opts.indent === 'tab' ? 2 : opts.indent,
        useTabs: opts.indent === 'tab',
      }) + '\n'
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const m = /line (\d+) column (\d+)/i.exec(message);
    throw new CodeError(
      message.split('\n')[0],
      m ? Number(m[1]) : undefined,
      m ? Number(m[2]) : undefined,
      e,
    );
  }
}

/**
 * Formatted code. Prettier (standalone, plugins imported per language)
 * handles everything but SQL (sql-formatter) and XML (the shared pretty
 * printer, which needs DOMParser and so runs on the main thread). Syntax
 * errors are CodeError (INVALID_INPUT) with the line and column.
 */
export async function formatCode(
  code: string,
  lang: FormatLanguage,
  opts: FormatOptions,
): Promise<string> {
  if (lang === 'sql') return formatSql(code, opts);
  if (lang === 'xml') {
    if (typeof DOMParser === 'undefined')
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        'XML formatting runs on the main thread',
      );
    try {
      return (
        prettyXml(code, {
          indent: opts.indent === 'tab' ? '\t' : ' '.repeat(opts.indent),
        }) + '\n'
      );
    } catch (e) {
      if (e instanceof ToolError) {
        const m = /line (\d+)(?:,? column (\d+))?/i.exec(e.message);
        throw new CodeError(
          e.message,
          m ? Number(m[1]) : undefined,
          m?.[2] ? Number(m[2]) : undefined,
          e,
        );
      }
      throw e;
    }
  }
  return formatPrettier(code, lang, opts);
}
