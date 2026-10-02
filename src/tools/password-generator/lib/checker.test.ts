import { describe, expect, it, vi } from 'vitest';

const loaded = vi.fn();
vi.mock('@zxcvbn-ts/core', async (orig) => {
  loaded();
  return orig();
});

describe('checkStrength', () => {
  it('loads zxcvbn only when first called', async () => {
    const { checkStrength } = await import('./checker');
    expect(loaded).not.toHaveBeenCalled();
    const weak = await checkStrength('password');
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(weak.score).toBe(0);
    expect(weak.warning).toBeTruthy();
    await checkStrength('another one');
    expect(loaded).toHaveBeenCalledTimes(1);
  });
  it('scores a 5-word passphrase 4', async () => {
    const { checkStrength } = await import('./checker');
    const strong = await checkStrength('correct-staple-orbit-velvet-quarry');
    expect(strong.score).toBe(4);
    expect(strong.suggestions).toEqual([]);
    expect(strong.crackTime.offline).not.toBe('less than a second');
  });
});
