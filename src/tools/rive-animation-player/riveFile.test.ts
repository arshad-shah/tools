import { describe, expect, it } from 'vitest';
import { assertRiveFile } from './riveFile';

describe('assertRiveFile', () => {
  it('accepts the RIVE signature', () => {
    expect(() =>
      assertRiveFile('a.riv', new Uint8Array([0x52, 0x49, 0x56, 0x45, 7])),
    ).not.toThrow();
  });
  it('rejects anything else naming the file', () => {
    expect(() => assertRiveFile('a.png', new Uint8Array([0x89, 0x50]))).toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE',
        message: 'a.png is not a Rive (.riv) file',
      }),
    );
  });
  it('rejects a file shorter than the signature', () => {
    expect(() => assertRiveFile('x.riv', new Uint8Array([0x52, 0x49]))).toThrow(
      expect.objectContaining({ code: 'INVALID_FILE' }),
    );
  });
});
