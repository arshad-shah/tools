import { describe, expect, it, vi } from 'vitest';
import type { OcrPool } from './pool';
import { createOcrService } from './service';
import { fakeManifest } from './test-manifest';

const pool = (): OcrPool & { terminated: boolean } => {
  const p = {
    terminated: false,
    recognize: async () => ({ words: [], meanConfidence: 0 }),
    terminate: async () => {
      p.terminated = true;
    },
  };
  return p;
};

describe('createOcrService', () => {
  it('reuses the pool for the same languages and replaces it for others', async () => {
    const pools: ReturnType<typeof pool>[] = [];
    const createPool = vi.fn(
      async (o: {
        onProgress(p: { status: string; progress: number }): void;
      }) => {
        o.onProgress({ status: 'loading', progress: 1 });
        const p = pool();
        pools.push(p);
        return p;
      },
    );
    const s = createOcrService({
      loadManifest: async () => fakeManifest(),
      createPool,
    });
    const seen: number[] = [];
    const a = await s.pool(['eng'], (p) => seen.push(p.progress));
    expect(await s.pool(['eng'], () => {})).toBe(a);
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([1]);
    await s.pool(['eng', 'fra'], () => {});
    expect(createPool).toHaveBeenCalledTimes(2);
    expect(pools[0].terminated).toBe(true);
    await s.dispose();
    expect(pools[1].terminated).toBe(true);
  });

  it('retries after a failed start', async () => {
    const loadManifest = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(fakeManifest());
    const s = createOcrService({
      loadManifest,
      createPool: async () => pool(),
    });
    await expect(s.pool(['eng'], () => {})).rejects.toThrow('offline');
    await expect(s.pool(['eng'], () => {})).resolves.toBeDefined();
  });
});
