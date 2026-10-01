/** @vitest-environment jsdom */
import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useObjectUrl } from './object-url';

describe('useObjectUrl', () => {
  const create = vi.fn(() => 'blob:1');
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  afterEach(() => vi.clearAllMocks());

  it('creates a URL for the bytes and revokes it on unmount', () => {
    const bytes = new Uint8Array([1, 2]);
    const { result, unmount } = renderHook(() =>
      useObjectUrl(bytes, 'image/png'),
    );
    expect(result.current).toBe('blob:1');
    expect(create).toHaveBeenCalledOnce();
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:1');
  });
  it('revokes the old URL when the bytes change', () => {
    let n = 0;
    create.mockImplementation(() => `blob:${++n}`);
    const { result, rerender } = renderHook(
      ({ bytes }) => useObjectUrl(bytes, 'image/png'),
      { initialProps: { bytes: new Uint8Array([1]) } },
    );
    expect(result.current).toBe('blob:1');
    rerender({ bytes: new Uint8Array([2]) });
    expect(result.current).toBe('blob:2');
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:1');
  });
  it('never hands out a revoked URL under StrictMode', () => {
    let n = 0;
    create.mockImplementation(() => `blob:${++n}`);
    const bytes = new Uint8Array([1]);
    const { result } = renderHook(() => useObjectUrl(bytes, 'image/png'), {
      wrapper: StrictMode,
    });
    expect(result.current).not.toBeNull();
    expect(revoke).not.toHaveBeenCalledWith(result.current);
  });
  it('returns null without bytes', () => {
    const { result } = renderHook(() => useObjectUrl(null, 'image/png'));
    expect(result.current).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
