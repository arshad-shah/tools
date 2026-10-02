/**
 * Diagram layout over a killable worker. Layout is synchronous inside the
 * worker, so an abort cannot interrupt it: a new request (or the caller's
 * signal) cancels the one in flight by killing the worker, and the next
 * request starts a fresh one (the worker holds no state).
 */
import { ToolError } from '@/shared/lib/errors';
import { createKillableClient } from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { Diagram } from './model';
import {
  unpackLayout,
  type DiagramLayout,
  type DiagramLayoutOptions,
  type LayoutHandlers,
  type LayoutMetrics,
} from './layout-core';

export interface LayoutClient {
  layout(
    diagram: Diagram,
    opts: DiagramLayoutOptions,
    metrics: LayoutMetrics,
    signal?: AbortSignal,
  ): Promise<DiagramLayout>;
  terminate(): void;
}

export function createLayoutClient(connect: () => RpcEndpoint): LayoutClient {
  const client = createKillableClient<LayoutHandlers>(connect);
  let inflight: AbortController | null = null;

  return {
    async layout(diagram, opts, metrics, signal) {
      // Newer input wins: kill the previous request first.
      inflight?.abort();
      if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
      const ctrl = new AbortController();
      inflight = ctrl;
      const forward = () => ctrl.abort();
      signal?.addEventListener('abort', forward, { once: true });
      try {
        const packed = await client.call(
          'layoutDiagram',
          [diagram.nodes, diagram.edges, opts, metrics],
          { signal: ctrl.signal },
        );
        return unpackLayout(diagram, opts, packed);
      } finally {
        if (inflight === ctrl) inflight = null;
        signal?.removeEventListener('abort', forward);
      }
    },
    terminate() {
      client.terminate();
    },
  };
}

let shared: LayoutClient | null = null;

/** Lays a diagram out in the shared layout worker. */
export function layoutInWorker(
  diagram: Diagram,
  opts: DiagramLayoutOptions,
  metrics: LayoutMetrics,
  signal?: AbortSignal,
): Promise<DiagramLayout> {
  shared ??= createLayoutClient(
    () =>
      new Worker(new URL('./layout.worker.ts', import.meta.url), {
        type: 'module',
        name: 'diagram-layout',
      }) as unknown as RpcEndpoint,
  );
  return shared.layout(diagram, opts, metrics, signal);
}
