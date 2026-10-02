import { useMemo } from 'react';
import type { Token } from '@/shared/lib/syntax/tokenize';
import { RangeIndex } from './decor';
import type { LineData } from './layout';
import type { Lines } from './text-model';
import type {
  CodeMarker,
  CodeRange,
  LineDecoration,
  LineDecorationKind,
  LineSource,
} from './types';
import type { FindState } from './use-find';

const NO_RANGES: CodeRange[] = [];

/**
 * What the line view reads per line: text, tokens, the ranges on it (user
 * ranges plus find matches), markers and decorations by 1-based line. Also
 * the first error, which the surface announces.
 */
export function useLineData({
  model,
  source,
  highlight,
  ranges,
  find,
  markers,
  lineDecorations,
}: {
  model: Lines | null;
  source: LineSource | undefined;
  highlight(index: number): Token[];
  ranges: readonly CodeRange[] | undefined;
  find: FindState;
  markers: readonly CodeMarker[] | undefined;
  lineDecorations: readonly LineDecoration[] | undefined;
}): { data: LineData; firstError: CodeMarker | undefined } {
  const rangeIndex = useMemo(() => {
    const list: CodeRange[] = [...(ranges ?? NO_RANGES)];
    if (find.open)
      find.result.matches.forEach((m, i) =>
        list.push({
          ...m,
          kind: i === find.active ? 'match-active' : 'search',
        }),
      );
    return new RangeIndex(list);
  }, [ranges, find.open, find.result, find.active]);

  const byLine = useMemo(() => {
    const map = new Map<number, CodeMarker[]>();
    for (const m of markers ?? [])
      map.set(m.line, [...(map.get(m.line) ?? []), m]);
    return map;
  }, [markers]);

  const decorations = useMemo(
    () =>
      new Map<number, LineDecorationKind>(
        (lineDecorations ?? []).map((d) => [d.line, d.kind]),
      ),
    [lineDecorations],
  );

  const firstError = useMemo(
    () =>
      [...(markers ?? [])]
        .filter((m) => m.severity === 'error')
        .sort(
          (a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0),
        )[0],
    [markers],
  );

  const data: LineData = {
    text: (l) => (source ? source.line(l) : (model?.lines[l] ?? '')),
    tokens: (l) => (source?.tokens ? source.tokens(l) : highlight(l)),
    ranges: (l, text) =>
      model
        ? rangeIndex.query(model.starts[l], model.starts[l] + text.length)
        : NO_RANGES,
    markers: byLine,
    decorations,
  };
  return { data, firstError };
}
