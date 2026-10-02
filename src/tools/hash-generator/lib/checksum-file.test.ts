import { describe, expect, it } from 'vitest';
import { checksumExtension, toChecksumFile } from './checksum-file';

describe('toChecksumFile', () => {
  it('writes sha256sum lines with two spaces', () => {
    expect(
      toChecksumFile(
        [
          { name: 'a.txt', results: { sha256: 'AB12' } },
          { name: 'b.bin', results: { md5: 'ff' } },
          { name: 'c d.txt', results: { sha256: 'cd34' } },
        ],
        'sha256',
      ),
    ).toBe('ab12  a.txt\ncd34  c d.txt\n');
  });
  it('escapes awkward names like GNU coreutils', () => {
    expect(
      toChecksumFile([{ name: 'a\nb', results: { md5: '00' } }], 'md5'),
    ).toBe('\\00  a\\nb\n');
  });
  it('names the extension', () => {
    expect(checksumExtension('sha3-256')).toBe('sha3256');
    expect(checksumExtension('sha256')).toBe('sha256');
  });
});
