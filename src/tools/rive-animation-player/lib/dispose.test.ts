import type { Rive } from '@rive-app/react-canvas';
import { describe, expect, it, vi } from 'vitest';
import { disposeRive } from './dispose';

const holder = () => {
  const rive = { cleanup: vi.fn() };
  return { rive, ref: { current: rive as unknown as Rive | null } };
};

describe('disposeRive', () => {
  it('drops the instance and cleans it up at once', () => {
    const { rive, ref } = holder();
    disposeRive(ref);
    expect(ref.current).toBeNull();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('defers the cleanup to a microtask when asked', async () => {
    const { rive, ref } = holder();
    disposeRive(ref, true);
    expect(ref.current).toBeNull();
    expect(rive.cleanup).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on an empty ref', () => {
    expect(() => disposeRive({ current: null })).not.toThrow();
  });
});
