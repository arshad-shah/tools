import { cellText } from './csv-write';

/** A GitHub-flavoured Markdown table; pipes are escaped, newlines become <br>. */
export function toMarkdownTable(
  rows: readonly Record<string, unknown>[],
  columns: string[],
): string {
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const line = (cells: string[]) => `| ${cells.map(esc).join(' | ')} |`;
  return (
    [
      line(columns),
      `| ${columns.map(() => '---').join(' | ')} |`,
      ...rows.map((r) => line(columns.map((c) => cellText(r[c])))),
    ].join('\n') + '\n'
  );
}
