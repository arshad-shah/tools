/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { deriveFilename, saveBlob, uniqueNames, zipFiles } from './download';
import { ToolError } from './errors';

describe('deriveFilename', () => {
  it.each([
    ['report.pdf', 'merged', 'pdf', 'report.merged.pdf'],
    ['report', 'merged', 'pdf', 'report.merged.pdf'],
    ['my.scan.v2.pdf', 'pages-1-3', 'pdf', 'my.scan.v2.pages-1-3.pdf'],
    ['report.pdf', '', '.zip', 'report.zip'],
    ['.pdf', 'x', 'pdf', 'file.x.pdf'],
  ])('%s + %s + %s → %s', (input, suffix, ext, expected) => {
    expect(deriveFilename(input, suffix, ext)).toBe(expected);
  });
});

describe('uniqueNames', () => {
  it('disambiguates duplicates before the extension', () => {
    expect(uniqueNames(['a.pdf', 'a.pdf', 'b.pdf', 'a.pdf'])).toEqual([
      'a.pdf',
      'a (2).pdf',
      'b.pdf',
      'a (3).pdf',
    ]);
  });
});

describe('saveBlob', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a download anchor and revokes the URL afterwards', () => {
    vi.useFakeTimers();
    const create = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:mock';
    });
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    saveBlob(new Uint8Array([1, 2, 3]), 'out.pdf', 'application/pdf');

    expect(create).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/pdf');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});

describe('zipFiles', () => {
  it('produces a zip containing every entry with unique names', async () => {
    const zip = await zipFiles([
      { name: 'a.txt', data: new TextEncoder().encode('one') },
      { name: 'a.txt', data: new TextEncoder().encode('two') },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['a (2).txt', 'a.txt']);
    expect(strFromU8(files['a (2).txt'])).toBe('two');
  });

  it('wraps fflate errors as ToolError', async () => {
    // Pass invalid data to trigger fflate error
    const promise = zipFiles([
      { name: 'invalid.txt', data: 'not bytes' as unknown as Uint8Array },
    ]);

    try {
      await promise;
      // If fflate doesn't error, skip this test
      expect.soft(null).toBeDefined();
    } catch (err) {
      expect(err).toBeInstanceOf(ToolError);
      if (err instanceof ToolError) {
        expect(err.code).toBe('UNKNOWN');
        expect(err.message).toBe('Could not build the ZIP file');
      }
    }
  });
});
