import type { PageText } from './types';

type Item = { str?: string; hasEOL?: boolean } | object;

/** Flattens pdf.js text-content items into plain text. */
export function textFromItems(items: readonly Item[]): PageText {
  let text = '';
  for (const item of items) {
    if (!('str' in item) || typeof item.str !== 'string') continue;
    text += item.str;
    if ('hasEOL' in item && item.hasEOL) text += '\n';
  }
  const trimmed = text.trim();
  return { text: trimmed, hasTextLayer: trimmed.length > 0 };
}
