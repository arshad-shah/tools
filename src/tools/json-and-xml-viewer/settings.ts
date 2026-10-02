import { createToolSettings } from '@/shared/lib/tool-settings';

/** The shown pane (ruling R41: Source, Tree, Map, Query, Convert as tabs). */
export type ViewerTab = 'source' | 'tree' | 'map' | 'query' | 'convert';

/** Viewer options (spec §7.2). Query history holds expressions only, never data. */
export const DEFAULT_SETTINGS = {
  indent: 2 as number,
  tab: 'source' as ViewerTab,
  direction: 'LR' as 'LR' | 'TB',
  minimap: true,
  cap: 2000 as number,
  wrap: false,
  queryHistory: [] as string[],
};

export const QUERY_HISTORY_MAX = 10;

export const viewerSettings = createToolSettings(
  'json-and-xml-viewer',
  DEFAULT_SETTINGS,
  { version: 1 },
);

/** `expr` first, deduplicated, at most ten. */
export function pushHistory(
  history: readonly string[],
  expr: string,
): string[] {
  const t = expr.trim();
  if (!t) return [...history];
  return [t, ...history.filter((h) => h !== t)].slice(0, QUERY_HISTORY_MAX);
}
