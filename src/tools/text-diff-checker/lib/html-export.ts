import type { DiffResult } from './engine';
import { buildViewModel, type Surface } from './view-model';

/**
 * Concrete colours for the standalone report, read from the theme tokens
 * at export time (this module holds no colour of its own).
 */
export interface ReportTokens {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  addBg: string;
  delBg: string;
  addStrong: string;
  delStrong: string;
}

/** The token names `ReportTokens` is read from (`readThemeTokens`). */
export const REPORT_TOKEN_NAMES: Record<keyof ReportTokens, string> = {
  bg: 'surface',
  fg: 'fg',
  muted: 'fg-muted',
  border: 'line',
  addBg: 'diff-add-soft',
  delBg: 'diff-del-soft',
  addStrong: 'diff-add-strong',
  delStrong: 'diff-del-strong',
};

export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** One line's HTML with its intraline ranges marked. */
function lineHtml(s: Surface, row: number, offset: number): string {
  const text = s.lines[row];
  const marks = s.ranges
    .filter((r) => r.end > offset && r.start < offset + text.length)
    .map((r) => ({
      start: Math.max(0, r.start - offset),
      end: Math.min(text.length, r.end - offset),
      cls: r.kind === 'diff-add' ? 'ia' : 'id',
    }));
  let out = '';
  let at = 0;
  for (const m of marks) {
    out += escapeHtml(text.slice(at, m.start));
    out += `<mark class="${m.cls}">${escapeHtml(text.slice(m.start, m.end))}</mark>`;
    at = m.end;
  }
  return out + escapeHtml(text.slice(at));
}

function cells(s: Surface): string[] {
  const kinds = new Map(s.decorations.map((d) => [d.line, d.kind]));
  let offset = 0;
  return s.lines.map((text, i) => {
    const kind = kinds.get(i + 1);
    const cls =
      kind === 'added'
        ? 'a'
        : kind === 'removed'
          ? 'd'
          : kind === 'changed'
            ? 'c'
            : '';
    const n = s.numbers[i];
    const html = `<td class="n">${n ?? ''}</td><td class="t ${cls}">${lineHtml(s, i, offset)}</td>`;
    offset += text.length + 1;
    return html;
  });
}

/**
 * A standalone side-by-side HTML report (spec §8.1): inline CSS from the
 * token snapshot, every text escaped, both file names in the header.
 */
export function toHtmlReport(
  result: DiffResult,
  texts: { left: string; right: string },
  names: { left: string; right: string },
  tokens: ReportTokens,
): string {
  const vm = buildViewModel(result, texts, {
    view: 'split',
    context: 'all',
    expanded: new Set(),
  });
  const l = cells(vm.left);
  const r = cells(vm.right!);
  const rows = l.map((c, i) => `<tr>${c}${r[i]}</tr>`).join('\n');
  const { added, removed, changed } = result.stats;
  const title = `${names.left} and ${names.right}`;
  const t = tokens;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diff of ${escapeHtml(title)}</title>
<style>
body{margin:0;padding:16px;background:${t.bg};color:${t.fg};font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
h1{font:600 16px/1.4 system-ui,sans-serif;margin:0 0 4px}
p{color:${t.muted};margin:0 0 12px;font-family:system-ui,sans-serif}
table{border-collapse:collapse;width:100%;table-layout:fixed}
th{text-align:left;font-family:system-ui,sans-serif;border-bottom:1px solid ${t.border};padding:4px 8px}
td{vertical-align:top;padding:0 8px;white-space:pre-wrap;word-break:break-word}
td.n{width:4em;color:${t.muted};text-align:right;user-select:none;border-right:1px solid ${t.border}}
td.a{background:${t.addBg}}td.d{background:${t.delBg}}td.c{background:${t.delBg}}
td.c+td.n+td.c{background:${t.addBg}}
mark{color:inherit}mark.ia{background:${t.addStrong}}mark.id{background:${t.delStrong}}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${added} added, ${removed} removed, ${changed} changed</p>
<table>
<colgroup><col style="width:4em"><col><col style="width:4em"><col></colgroup>
<thead><tr><th colspan="2">${escapeHtml(names.left)}</th><th colspan="2">${escapeHtml(names.right)}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
}
