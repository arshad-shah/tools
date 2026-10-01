import type { PageText } from '@/pdf/render';
import type { ResultFile } from '@/pdf/components';
import { deriveFilename } from '@/shared/lib/download';

export type TextMode = 'combined' | 'per-page';
export const TEXT_MIME = 'text/plain;charset=utf-8';

const encoder = new TextEncoder();

export function combinedText(pages: PageText[]): string {
  return (
    pages
      .map(
        (p, i) =>
          `--- Page ${i + 1}${p.hasTextLayer ? '' : ' (no text layer)'} ---\n${p.text}`,
      )
      .join('\n\n') + '\n'
  );
}

export function pagesWithoutText(pages: PageText[]): number[] {
  return pages.flatMap((p, i) => (p.hasTextLayer ? [] : [i + 1]));
}

export function textOutputs(
  sourceName: string,
  pages: PageText[],
  mode: TextMode,
): ResultFile[] {
  if (mode === 'combined') {
    return [
      {
        name: deriveFilename(sourceName, '', 'txt'),
        bytes: encoder.encode(combinedText(pages)),
        mime: TEXT_MIME,
        detail: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`,
      },
    ];
  }
  const digits = String(pages.length).length;
  return pages.map((p, i) => ({
    name: deriveFilename(
      sourceName,
      `page-${String(i + 1).padStart(digits, '0')}`,
      'txt',
    ),
    bytes: encoder.encode(p.text ? `${p.text}\n` : ''),
    mime: TEXT_MIME,
    detail: p.hasTextLayer ? undefined : 'no text layer',
  }));
}

/** The textarea preview stays responsive on huge documents. */
export const PREVIEW_LIMIT = 100_000;

export function previewText(
  text: string,
  limit = PREVIEW_LIMIT,
): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  let end = limit;
  // Don't leave half of a surrogate pair (emoji etc.) at the cut.
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end--;
  return { text: `${text.slice(0, end)}…`, truncated: true };
}
