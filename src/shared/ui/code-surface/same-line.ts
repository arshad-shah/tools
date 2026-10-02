import type { Token } from '@/shared/lib/syntax/tokenize';
import type { CodeMarker, CodeRange } from './types';

export interface LineProps {
  text: string;
  tokens: readonly Token[];
  ranges: readonly CodeRange[];
  markers: readonly CodeMarker[];
}

/**
 * Props equality for the line memo: tokens and markers are cached per line
 * (same array while unchanged); ranges are rebuilt per render, so compare
 * them by value.
 */
export function sameLine(a: LineProps, b: LineProps): boolean {
  if (
    a.text !== b.text ||
    a.tokens !== b.tokens ||
    a.markers !== b.markers ||
    a.ranges.length !== b.ranges.length
  )
    return false;
  return a.ranges.every((r, i) => {
    const s = b.ranges[i];
    return r.start === s.start && r.end === s.end && r.kind === s.kind;
  });
}
