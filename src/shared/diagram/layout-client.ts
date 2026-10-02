/**
 * Diagram layout over a worker. Layout is synchronous inside the worker, so
 * an abort cannot interrupt it: a new request (or the caller's signal)
 * cancels the one in flight by terminating the worker, and the next request
 * starts a fresh one (the worker holds no state).
 */
import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  type RpcClient,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
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
  let client: RpcClient<LayoutHandlers> = createRpcClient(connect);
  let inflight: (() => void) | null = null;

  return {
    async layout(diagram, opts, metrics, signal) {
      // Newer input wins: kill the previous request first.
      inflight?.();
      if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
      const owner = client;
      let settled = false;
      const kill = () => {
        if (settled || client !== owner) return;
        owner.terminate();
        client = createRpcClient(connect);
      };
      inflight = kill;
      signal?.addEventListener('abort', kill, { once: true });
      try {
        const packed = await owner.call('layoutDiagram', [
          diagram.nodes,
          diagram.edges,
          opts,
          metrics,
        ]);
        return unpackLayout(diagram, opts, packed);
      } finally {
        settled = true;
        if (inflight === kill) inflight = null;
        signal?.removeEventListener('abort', kill);
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
