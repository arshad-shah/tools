import type { CodeRange } from '@/shared/ui';

export interface SearchSpec {
  value: string;
  regex: boolean;
}

const MAX_HIGHLIGHTS = 500;

/** Search highlights in `text` for CodeSurface (case-insensitive). */
export function searchRanges(text: string, search?: SearchSpec): CodeRange[] {
  if (!search?.value) return [];
  const out: CodeRange[] = [];
  if (search.regex) {
    let re: RegExp;
    try {
      re = new RegExp(search.value, 'gi');
    } catch {
      return [];
    }
    for (const m of text.matchAll(re)) {
      if (m[0].length === 0) continue;
      out.push({ start: m.index, end: m.index + m[0].length, kind: 'search' });
      if (out.length >= MAX_HIGHLIGHTS) break;
    }
    return out;
  }
  const hay = text.toLowerCase();
  const needle = search.value.toLowerCase();
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) {
    out.push({ start: i, end: i + needle.length, kind: 'search' });
    if (out.length >= MAX_HIGHLIGHTS) break;
  }
  return out;
}
