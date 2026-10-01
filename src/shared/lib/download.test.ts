/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
  deriveFilename,
  saveBlob,
  saveZip,
  uniqueNames,
  zipFiles,
} from './download';

const fflateMock = vi.hoisted(() => ({
  mode: 'real' as 'real' | 'callback-error' | 'throw',
}));
vi.mock('fflate', async (importOriginal) => {
  const real = await importOriginal<typeof import('fflate')>();
  return {
    ...real,
    zip: (...args: Parameters<typeof real.zip>) => {
      if (fflateMock.mode === 'throw') throw new Error('sync boom');
      if (fflateMock.mode === 'callback-error') {
        const cb = args[args.length - 1] as unknown as (
          e: Error | null,
          d: null,
        ) => void;
        cb(new Error('async boom'), null);
        return () => {};
      }
      return real.zip(...args);
    },
  };
});

function mockDownload() {
  const create = vi.fn((blob: Blob) => {
    void blob;
    return 'blob:mock';
  });
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return create;
}

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
  it('never collides with a name that already exists', () => {
    expect(uniqueNames(['a.pdf', 'a.pdf', 'a (2).pdf'])).toEqual([
      'a.pdf',
      'a (3).pdf',
      'a (2).pdf',
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

  it('applies mime to an untyped Blob and keeps a typed Blob as is', () => {
    const create = mockDownload();
    saveBlob(new Blob(['x']), 'a.pdf', 'application/pdf');
    saveBlob(
      new Blob(['x'], { type: 'text/plain' }),
      'b.txt',
      'application/pdf',
    );
    expect((create.mock.calls[0][0] as Blob).type).toBe('application/pdf');
    expect((create.mock.calls[1][0] as Blob).type).toBe('text/plain');
  });
});

describe('saveZip', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves an application/zip blob that unzips to the entries', async () => {
    const create = mockDownload();
    await saveZip(
      [
        { name: 'a.txt', data: new TextEncoder().encode('one') },
        { name: 'b.txt', data: new TextEncoder().encode('two') },
      ],
      'out.zip',
    );
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/zip');
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(strFromU8(files['b.txt'])).toBe('two');
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

  it.each(['callback-error', 'throw'] as const)(
    'wraps fflate failures (%s) as ToolError',
    async (mode) => {
      fflateMock.mode = mode;
      try {
        await expect(
          zipFiles([{ name: 'a.txt', data: new Uint8Array([1]) }]),
        ).rejects.toMatchObject({
          name: 'ToolError',
          code: 'UNKNOWN',
          message: 'Could not build the ZIP file',
        });
      } finally {
        fflateMock.mode = 'real';
      }
    },
  );
});
