import type React from 'react';

/** Wraps case-insensitive matches of `search` in `mark`. */
export function highlight(text: string, search: string): React.ReactNode {
  if (!search || !text) return text;
  const hay = text.toLowerCase();
  const needle = search.toLowerCase();
  const out: React.ReactNode[] = [];
  let from = 0;
  let at = hay.indexOf(needle);
  if (at < 0) return text;
  while (at >= 0) {
    if (at > from) out.push(text.slice(from, at));
    out.push(
      <mark key={at} className="rounded-sm bg-match-soft text-fg">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
    at = hay.indexOf(needle, from);
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}
