import type { HandoffPayload } from '@/shared/lib/handoff';

export const DIFF_PAIR_MIME = 'application/vnd.tools.diff-pair+json';

export interface DiffHandoff {
  left?: string;
  right?: string;
  leftName?: string;
  rightName?: string;
}

/** Builds the pair payload other tools send ("Compare" hand-offs). */
export function diffPairPayload(
  pair: { left: string; right: string; leftName?: string; rightName?: string },
  sourceTool: string,
): HandoffPayload {
  return {
    kind: 'text',
    mime: DIFF_PAIR_MIME,
    text: JSON.stringify(pair),
    sourceTool,
  };
}

/**
 * What a hand-off fills (spec §8.1): a pair payload fills both sides; any
 * other text fills `meta.side` (left when not given). Null when it does
 * not fit.
 */
export function readDiffHandoff(p: HandoffPayload): DiffHandoff | null {
  if (p.kind !== 'text') return null;
  if (p.mime === DIFF_PAIR_MIME) {
    try {
      const v = JSON.parse(p.text) as Record<string, unknown>;
      if (typeof v?.left !== 'string' || typeof v.right !== 'string')
        return null;
      return {
        left: v.left,
        right: v.right,
        leftName: typeof v.leftName === 'string' ? v.leftName : undefined,
        rightName: typeof v.rightName === 'string' ? v.rightName : undefined,
      };
    } catch {
      return null;
    }
  }
  const side = p.meta?.side === 'right' ? 'right' : 'left';
  return side === 'right'
    ? { right: p.text, rightName: p.filename }
    : { left: p.text, leftName: p.filename };
}
