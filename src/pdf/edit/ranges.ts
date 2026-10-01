import { ToolError } from '@/shared/lib/errors';

/** 0-based, inclusive. */
export interface PageRange {
  start: number;
  end: number;
}

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/** Parses 1-based `1-3, 5, 8-, -2` against a document's page count. */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) throw invalid('Enter at least one page or range');

  const page = (raw: string, token: string): number => {
    if (!/^\d+$/.test(raw))
      throw invalid(`"${token}" is not a page number or range`);
    const n = Number(raw);
    if (n < 1 || n > pageCount)
      throw invalid(`Page ${n} is out of range (1–${pageCount})`);
    return n - 1;
  };

  return tokens.map((token) => {
    const parts = token.split('-').map((p) => p.trim());
    if (parts.length === 1) {
      const n = page(parts[0], token);
      return { start: n, end: n };
    }
    if (parts.length !== 2 || (parts[0] === '' && parts[1] === '')) {
      throw invalid(`"${token}" is not a page number or range`);
    }
    const start = parts[0] === '' ? 0 : page(parts[0], token);
    const end = parts[1] === '' ? pageCount - 1 : page(parts[1], token);
    if (start > end)
      throw invalid(`Range ${start + 1}-${end + 1} runs backwards`);
    return { start, end };
  });
}

export function rangesToIndices(ranges: PageRange[]): number[] {
  return ranges.flatMap((r) =>
    Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i),
  );
}

export function everyNPages(pageCount: number, n: number): PageRange[] {
  if (!Number.isInteger(n) || n < 1)
    throw invalid('Pages per file must be a whole number of at least 1');
  const out: PageRange[] = [];
  for (let start = 0; start < pageCount; start += n) {
    out.push({ start, end: Math.min(start + n, pageCount) - 1 });
  }
  return out;
}

export function formatRange(r: PageRange): string {
  return r.start === r.end ? `${r.start + 1}` : `${r.start + 1}-${r.end + 1}`;
}
