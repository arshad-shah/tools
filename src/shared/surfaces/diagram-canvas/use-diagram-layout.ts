import { useEffect, useMemo, useState } from 'react';
import {
  layoutInWorker,
  layoutSync,
  shouldUseWorker,
  type Diagram,
  type DiagramLayout,
  type DiagramTheme,
  type Direction,
  type LayoutMetrics,
} from '@/shared/diagram';
import { toToolError, type ToolError } from '@/shared/lib/errors';

interface LayoutRequest {
  diagram: Diagram;
  opts: { direction: Direction };
  metrics: LayoutMetrics;
}

export interface LayoutResult {
  request: LayoutRequest;
  layout?: DiagramLayout;
  error?: ToolError;
}

/**
 * Lays a diagram out: synchronously for small diagrams, in the layout worker
 * above WORKER_THRESHOLD (a newer request cancels the one in flight).
 */
export function useDiagramLayout(
  diagram: Diagram,
  direction: Direction,
  theme: DiagramTheme,
): { result: LayoutResult | null; busy: boolean; error: ToolError | null } {
  // Colours never need a re-layout: only the fonts do.
  const fontKey = `${theme.fontFamily}|${Object.values(theme.fontSizes).join(',')}`;
  const request = useMemo(
    (): LayoutRequest => ({
      diagram,
      opts: { direction },
      metrics: { family: theme.fontFamily, sizes: theme.fontSizes },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram, direction, fontKey],
  );
  const syncResult = useMemo((): LayoutResult | null => {
    if (shouldUseWorker(request.diagram)) return null;
    try {
      return {
        request,
        layout: layoutSync(request.diagram, request.opts, request.metrics),
      };
    } catch (e) {
      return { request, error: toToolError(e) };
    }
  }, [request]);
  const [workerResult, setWorkerResult] = useState<LayoutResult | null>(null);
  useEffect(() => {
    if (syncResult) return;
    const abort = new AbortController();
    layoutInWorker(
      request.diagram,
      request.opts,
      request.metrics,
      abort.signal,
    ).then(
      (layout) => setWorkerResult({ request, layout }),
      (e) => {
        const error = toToolError(e);
        if (error.code !== 'CANCELLED') setWorkerResult({ request, error });
      },
    );
    return () => abort.abort();
  }, [request, syncResult]);
  const result =
    syncResult ?? (workerResult?.request === request ? workerResult : null);
  return { result, busy: result === null, error: result?.error ?? null };
}
