import type { PageTextItems, TextItemGeom } from './handlers/text';
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

type RawItem =
  | {
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName: string;
      hasEOL: boolean;
      dir?: string;
    }
  | { type: string; id?: string };

/**
 * pdf.js text content as positioned items in page space (the item
 * transforms exactly as pdf.js reports them); marked-content markers are
 * dropped.
 */
export function textItemsFrom(content: {
  items: readonly RawItem[];
  styles: PageTextItems['styles'];
}): PageTextItems {
  const items: TextItemGeom[] = [];
  for (const item of content.items) {
    if (!('str' in item)) continue;
    items.push({
      str: item.str,
      transform: item.transform.slice(0, 6) as TextItemGeom['transform'],
      width: item.width,
      height: item.height,
      fontName: item.fontName,
      hasEOL: item.hasEOL,
    });
  }
  const styles: PageTextItems['styles'] = {};
  for (const [name, s] of Object.entries(content.styles)) {
    styles[name] = {
      ascent: s.ascent,
      descent: s.descent,
      vertical: s.vertical,
      fontFamily: s.fontFamily,
    };
  }
  return { items, styles };
}
