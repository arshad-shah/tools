/** @vitest-environment jsdom */
import CryptoJS from 'crypto-js';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQRCode } from './useQrCode';

describe('useQRCode encryption', () => {
  it('encodes the content with no error by default', () => {
    const { result } = renderHook(() => useQRCode());
    expect(result.current.finalData).toBe('https://example.com');
    expect(result.current.encryptionError).toBeNull();
  });

  it('encodes nothing and exposes the error when encryption fails', () => {
    vi.spyOn(CryptoJS.AES, 'encrypt').mockImplementation(() => {
      throw new Error('cipher broke');
    });
    const { result } = renderHook(() => useQRCode());
    act(() => result.current.setEncryptionConfig({ type: 'aes', key: 'k' }));
    expect(result.current.finalData).toBe('');
    expect(result.current.encryptionError).toBe('cipher broke');

    act(() => result.current.setEncryptionConfig({ type: 'none' }));
    expect(result.current.finalData).toBe('https://example.com');
    expect(result.current.encryptionError).toBeNull();
  });
});
