import type { ContentOp, ParsedContent } from '@/pdf/edit/content/tokens';

/** Op index -> its replacement ops ([] deletes it). */
export type Edits = Map<number, ContentOp[]>;

export function mergeEdits(...all: Edits[]): Edits {
  const out: Edits = new Map();
  for (const e of all)
    for (const [i, ops] of e) {
      if (out.has(i))
        throw new Error(`Two redaction edits target content op ${i}`);
      out.set(i, ops);
    }
  return out;
}

export function applyEdits(p: ParsedContent, edits: Edits): ParsedContent {
  if (!edits.size) return p;
  const ops: ContentOp[] = [];
  p.ops.forEach((op, i) => {
    const r = edits.get(i);
    if (r) ops.push(...r);
    else ops.push(op);
  });
  return { ops, tail: p.tail };
}
