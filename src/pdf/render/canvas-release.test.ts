import { describe, expect, it } from 'vitest';
import { freeCanvasOnFailure } from './canvas-release';

const canvas = () => ({ width: 4000, height: 4000 });

describe('freeCanvasOnFailure', () => {
  it('frees the backing store and rethrows when the render fails', async () => {
    const c = canvas();
    const boom = new Error('cancelled');
    await expect(
      freeCanvasOnFailure(c, () => Promise.reject(boom)),
    ).rejects.toBe(boom);
    expect([c.width, c.height]).toEqual([0, 0]);
  });
  it('leaves the canvas alone on success', async () => {
    const c = canvas();
    await expect(freeCanvasOnFailure(c, async () => 'ok')).resolves.toBe('ok');
    expect([c.width, c.height]).toEqual([4000, 4000]);
  });
});
