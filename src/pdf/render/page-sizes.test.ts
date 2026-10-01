import { describe, expect, it } from 'vitest';
import { readPageSizes } from './page-sizes';

const fakeDoc = (numPages: number, onPage?: (i: number) => void) => ({
  numPages,
  async getPage(i: number) {
    onPage?.(i);
    return { getViewport: () => ({ width: 100 + i, height: 200 }) };
  },
});

describe('readPageSizes', () => {
  it('reads every page size at scale 1', async () => {
    const sizes = await readPageSizes(fakeDoc(3), new AbortController().signal);
    expect(sizes).toEqual([
      { width: 101, height: 200 },
      { width: 102, height: 200 },
      { width: 103, height: 200 },
    ]);
  });

  it('stops early when the signal aborts mid-loop', async () => {
    const ctrl = new AbortController();
    let read = 0;
    const doc = fakeDoc(5000, () => {
      read++;
      if (read === 10) ctrl.abort();
    });
    await expect(readPageSizes(doc, ctrl.signal)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect(read).toBeLessThan(200);
  });
});
