/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebugLog } from './useDebugLog';

let n = 0;
vi.mock('@/shared/lib/id', () => ({ newId: vi.fn(() => `id-${++n}`) }));

describe('useDebugLog', () => {
  it('keys entries with newId(), newest first, capped at 50', () => {
    const { result } = renderHook(() => useDebugLog());
    act(() => {
      for (let i = 0; i < 52; i++) result.current.addDebugLog(`m${i}`);
    });
    const logs = result.current.debugLogs;
    expect(logs).toHaveLength(50);
    expect(logs[0]).toMatchObject({
      id: 'id-52',
      message: 'm51',
      type: 'info',
    });
    expect(new Set(logs.map((l) => l.id)).size).toBe(50);

    act(() => result.current.clearDebugLogs());
    expect(result.current.debugLogs).toEqual([]);
  });
});
