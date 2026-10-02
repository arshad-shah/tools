import {
  parseMockSchema,
  type MockLocale,
} from '@/shared/lib/data-formats/mock-schema';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import {
  generateMock,
  type Row,
} from '@/tools/random-data-generator/lib/engine';

export default {
  /**
   * Mock rows for every table (validated schema), with progress every 10k
   * rows and cancellation. A seed makes the output repeatable.
   */
  'mock.generate': (
    ctx: RpcContext,
    schema: unknown,
    count: number,
    seed: string | null,
    locale: MockLocale = 'en-US',
  ): Record<string, Row[]> =>
    generateMock(parseMockSchema(schema), {
      count,
      seed,
      locale,
      signal: ctx.signal,
      onProgress: (done, total) =>
        ctx.progress({ done, total, label: 'Generating' }),
    }),
};
