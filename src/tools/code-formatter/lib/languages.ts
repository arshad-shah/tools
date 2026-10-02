export const FORMAT_LANGUAGES = [
  'json',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'css',
  'scss',
  'less',
  'html',
  'markdown',
  'yaml',
  'graphql',
  'sql',
  'xml',
] as const;
export type FormatLanguage = (typeof FORMAT_LANGUAGES)[number];

export const LANGUAGE_LABEL: Record<FormatLanguage, string> = {
  json: 'JSON',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  html: 'HTML',
  markdown: 'Markdown',
  yaml: 'YAML',
  graphql: 'GraphQL',
  sql: 'SQL',
  xml: 'XML',
};

/** File extension for downloads. */
export const LANGUAGE_EXTENSION: Record<FormatLanguage, string> = {
  json: 'json',
  javascript: 'js',
  typescript: 'ts',
  jsx: 'jsx',
  tsx: 'tsx',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  markdown: 'md',
  yaml: 'yaml',
  graphql: 'graphql',
  sql: 'sql',
  xml: 'xml',
};

export const isFormatLanguage = (v: unknown): v is FormatLanguage =>
  (FORMAT_LANGUAGES as readonly unknown[]).includes(v);

export const SQL_DIALECTS = [
  'sql',
  'postgresql',
  'mysql',
  'sqlite',
  'transactsql',
  'bigquery',
] as const;
export type SqlFormatDialect = (typeof SQL_DIALECTS)[number];

export const SQL_DIALECT_LABEL: Record<SqlFormatDialect, string> = {
  sql: 'Standard SQL',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  transactsql: 'SQL Server (T-SQL)',
  bigquery: 'BigQuery',
};

export interface FormatOptions {
  indent: 2 | 4 | 'tab';
  printWidth: number;
  singleQuote: boolean;
  semi: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  bracketSpacing: boolean;
  sqlDialect: SqlFormatDialect;
  keywordCase: 'upper' | 'lower' | 'preserve';
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 2,
  printWidth: 80,
  singleQuote: false,
  semi: true,
  trailingComma: 'all',
  bracketSpacing: true,
  sqlDialect: 'sql',
  keywordCase: 'upper',
};
