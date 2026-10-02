import { describe, expect, it } from 'vitest';
import { loadDiffFile } from './text-file';

const file = (name: string, type: string, text = 'x') =>
  new File([text], name, { type });

describe('loadDiffFile', () => {
  it('accepts a listed extension whatever the MIME type', async () => {
    await expect(loadDiffFile(file('a.yaml', ''))).resolves.toMatchObject({
      text: 'x',
    });
  });
  it('accepts an allowed MIME type with any extension (as before)', async () => {
    await expect(
      loadDiffFile(file('notes.py', 'text/plain', 'print(1)')),
    ).resolves.toMatchObject({ name: 'notes.py', text: 'print(1)' });
    await expect(
      loadDiffFile(file('page.htm', 'text/html')),
    ).resolves.toMatchObject({ text: 'x' });
    await expect(
      loadDiffFile(file('README', 'text/plain')),
    ).resolves.toMatchObject({ text: 'x' });
  });
  it('rejects other files', async () => {
    await expect(
      loadDiffFile(file('pic.png', 'image/png')),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });
  it('rejects files over 10 MB', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.txt', {
      type: 'text/plain',
    });
    await expect(loadDiffFile(big)).rejects.toMatchObject({
      code: 'TOO_LARGE',
    });
  });
});
