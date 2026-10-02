import type { Box } from '@/pdf/doc/types';
import type { GlyphHit, Interpretation } from '@/pdf/edit/content/interpreter';
import type { ContentOp, ParsedContent, Tok } from '@/pdf/edit/content/tokens';
import { applyEdits, type Edits } from './edits';
import { overlapFraction, quadBox } from './geometry';

/** A glyph is removed when at least this share of its box is under a mark. */
export const OVERLAP = 0.01;

type ShowItem =
  | { kind: 'num'; value: number }
  | { kind: 'str'; bytes: Uint8Array; glyphs: GlyphHit[] };

function showItems(op: ContentOp, index: number, hits: GlyphHit[]): ShowItem[] {
  const ofPart = (part: number) =>
    hits.filter((g) => g.op === index && g.part === part);
  if (op.op === 'TJ') {
    const arr = op.operands[0];
    if (arr?.t !== 'arr') return [];
    return arr.v.flatMap((t, part): ShowItem[] =>
      t.t === 'num'
        ? [{ kind: 'num', value: t.v }]
        : t.t === 'str'
          ? [{ kind: 'str', bytes: t.v, glyphs: ofPart(part) }]
          : [],
    );
  }
  const s = op.operands[op.operands.length - 1];
  return s?.t === 'str' ? [{ kind: 'str', bytes: s.v, glyphs: ofPart(0) }] : [];
}

/**
 * Rewrites a text-showing op as a TJ whose array keeps surviving glyph
 * bytes and replaces each removed glyph by the number that moves the text
 * position by its advance, so survivors keep their exact positions and the
 * text matrix after the op is unchanged.
 */
function rewriteShow(
  op: ContentOp,
  items: ShowItem[],
  removed: Set<GlyphHit>,
  tfs: number,
  th: number,
): ContentOp[] {
  const parts: Tok[] = [];
  let pendingBytes: number[] = [];
  let pendingNum = 0;
  const flushBytes = () => {
    if (pendingBytes.length) {
      parts.push({ t: 'str', v: Uint8Array.from(pendingBytes), hex: true });
      pendingBytes = [];
    }
  };
  const flushNum = () => {
    if (pendingNum !== 0) {
      parts.push({ t: 'num', v: pendingNum, raw: '' });
      pendingNum = 0;
    }
  };
  for (const item of items) {
    if (item.kind === 'num') {
      flushBytes();
      pendingNum += item.value;
      continue;
    }
    for (const g of item.glyphs) {
      if (removed.has(g)) {
        flushBytes();
        pendingNum += (-g.advance * 1000) / (tfs * th);
      } else {
        flushNum();
        pendingBytes.push(
          ...item.bytes.subarray(g.byteStart, g.byteStart + g.byteLength),
        );
      }
    }
  }
  flushBytes();
  flushNum();
  const tj: ContentOp = { op: 'TJ', operands: [{ t: 'arr', v: parts }] };
  if (op.op === "'") return [{ op: 'T*', operands: [] }, tj];
  if (op.op === '"')
    return [
      { op: 'Tw', operands: [op.operands[0]] },
      { op: 'Tc', operands: [op.operands[1]] },
      { op: 'T*', operands: [] },
      tj,
    ];
  return [tj];
}

/** Text-showing ops whose glyphs fall under the marks, rewritten. */
export function glyphEdits(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: readonly Box[],
): { edits: Edits; removed: number; uncompensated: boolean } {
  const edits: Edits = new Map();
  const hit = interp.glyphs.filter((g) => {
    const box = quadBox(g.quad);
    return marks.some((m) => overlapFraction(box, m) >= OVERLAP);
  });
  const removed = new Set(hit);
  const byOp = new Map<number, GlyphHit[]>();
  for (const g of hit) byOp.set(g.op, [...(byOp.get(g.op) ?? []), g]);
  let uncompensated = false;
  for (const index of byOp.keys()) {
    const op = parsed.ops[index];
    const state = interp.shows.get(index);
    if (!state || state.tfs * state.th === 0) {
      uncompensated = true;
      continue;
    }
    const items = showItems(op, index, interp.glyphs);
    edits.set(index, rewriteShow(op, items, removed, state.tfs, state.th));
  }
  return { edits, removed: hit.length, uncompensated };
}

/** Marked-content keys that can carry hidden copies of text. */
const TEXT_KEYS = ['ActualText', 'Alt', 'E'];

/** BDC/DP property lists written inline lose /ActualText, /Alt and /E. */
export function markedContentEdits(parsed: ParsedContent): Edits {
  const edits: Edits = new Map();
  parsed.ops.forEach((op, i) => {
    if (op.op !== 'BDC' && op.op !== 'DP') return;
    const props = op.operands[1];
    if (props?.t !== 'dict' || !TEXT_KEYS.some((k) => props.v.has(k))) return;
    const v = new Map(props.v);
    for (const k of TEXT_KEYS) v.delete(k);
    edits.set(i, [{ op: op.op, operands: [op.operands[0], { t: 'dict', v }] }]);
  });
  return edits;
}

export function removeGlyphs(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: readonly Box[],
): { parsed: ParsedContent; removed: number } {
  const { edits, removed } = glyphEdits(parsed, interp, marks);
  return { parsed: applyEdits(parsed, edits), removed };
}
