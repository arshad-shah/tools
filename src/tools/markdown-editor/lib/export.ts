import { escapeHtml } from '@/tools/text-diff-checker/lib/html-export';

/** Concrete colours for the exported page (light theme token snapshot). */
export interface DocTokens {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  link: string;
  codeBg: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
}

/** Token names `DocTokens` is read from (`readThemeTokens`, light theme). */
export const DOC_TOKEN_NAMES: Record<keyof DocTokens, string> = {
  bg: 'surface',
  fg: 'fg',
  muted: 'fg-muted',
  border: 'line',
  link: 'accent-fg',
  codeBg: 'surface-2',
  keyword: 'syntax-keyword',
  string: 'syntax-string',
  number: 'syntax-number',
  comment: 'syntax-comment',
};

/** The stylesheet for rendered Markdown, from concrete token values. */
export function markdownCss(t: DocTokens): string {
  return `body{margin:0 auto;max-width:48rem;padding:32px 16px;background:${t.bg};color:${t.fg};font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:${t.link}}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.5em 0 .5em}
h1,h2{border-bottom:1px solid ${t.border};padding-bottom:.3em}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
code{background:${t.codeBg};padding:.1em .3em;border-radius:4px}
pre{background:${t.codeBg};padding:12px 16px;border-radius:6px;overflow:auto}
pre code{background:none;padding:0}
blockquote{margin:0;padding:0 1em;color:${t.muted};border-left:4px solid ${t.border}}
table{border-collapse:collapse}
th,td{border:1px solid ${t.border};padding:6px 12px}
img{max-width:100%}
hr{border:0;border-top:1px solid ${t.border}}
.tok-keyword{color:${t.keyword}}.tok-string{color:${t.string}}.tok-number,.tok-boolean,.tok-null{color:${t.number}}.tok-comment{color:${t.comment}}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}`;
}

/** A standalone HTML document for download (spec §9.2). */
export function toStandaloneHtml(
  html: string,
  title: string,
  tokens: DocTokens,
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${markdownCss(tokens)}
</style>
</head>
<body>
${html}
</body>
</html>
`;
}

/** Rich text for the clipboard: the HTML plus the Markdown as plain text. */
export function toRichClipboard(html: string, md: string): ClipboardItem {
  return new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([md], { type: 'text/plain' }),
  });
}
