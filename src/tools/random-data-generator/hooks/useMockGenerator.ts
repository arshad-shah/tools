import { useEffect, useRef } from 'react';
import type {
  MockLocale,
  MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import type { KillableClient } from '@/shared/lib/killable-client';
import { useJob } from '@/shared/state/useJob';
import type { TextHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import type { Row } from '../lib/engine';

export interface Generated {
  tables: Record<string, Row[]>;
  seed: string | null;
}

/**
 * Generation on a dedicated killable worker: progress every 10k rows, and
 * Cancel terminates it, never another tool's job.
 */
export function useMockGenerator() {
  const worker = useRef<KillableClient<TextHandlers> | null>(null);
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );
  return useJob(
    async (
      ctx,
      schema: MockSchema,
      count: number,
      seed: string | null,
      locale: MockLocale,
    ): Promise<Generated> => {
      worker.current ??= createTextWorker();
      const tables = await worker.current.call(
        'mock.generate',
        [schema, count, seed, locale],
        { signal: ctx.signal, onProgress: ctx.progress },
      );
      return { tables, seed };
    },
  );
}
