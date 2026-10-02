import { describe, expect, it, vi } from 'vitest';
import {
  acceptAttribute,
  describeKinds,
  detectContentKind,
  detectKind,
  isOverSoftLimit,
  loadFile,
  loadTextFile,
  readText,
  SOFT_SIZE_LIMIT,
} from './files';
import { ToolError } from './errors';

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe('detectKind', () => {
  it('detects PDF at offset 0', () => {
    expect(detectKind(ascii('%PDF-1.7\n...'))).toBe('pdf');
  });
  it('detects PDF with leading junk within 1KB', () => {
    expect(detectKind(ascii('\n\n  junk %PDF-1.4'))).toBe('pdf');
  });
  it('detects images', () => {
    expect(
      detectKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe('png');
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(detectKind(ascii('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(detectKind(ascii('GIF89a'))).toBe('gif');
  });
  it('prefers image signatures over PDF, even with embedded PDF magic', () => {
    const pngWithPdfMagic = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...ascii('%PDF-1.7'),
    ]);
    expect(detectKind(pngWithPdfMagic)).toBe('png');
  });
  it('returns null for unknown or empty data', () => {
    expect(detectKind(ascii('hello world'))).toBeNull();
    expect(detectKind(new Uint8Array())).toBeNull();
  });
});

describe('loadFile', () => {
  it('loads an accepted file', async () => {
    const file = new File([ascii('%PDF-1.7\n%%EOF')], 'a.pdf', {
      type: 'application/pdf',
    });
    const out = await loadFile(file, ['pdf']);
    expect(out.kind).toBe('pdf');
    expect(out.name).toBe('a.pdf');
    expect(out.size).toBe(file.size);
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(out.id).toMatch(/[0-9a-f-]{36}/);
  });
  it('rejects a renamed non-PDF by content, not extension', async () => {
    const file = new File([ascii('not a pdf')], 'fake.pdf');
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: 'fake.pdf is not a PDF file',
    });
  });
  it('rejects empty files', async () => {
    const file = new File([], 'empty.pdf');
    await expect(loadFile(file, ['pdf'])).rejects.toBeInstanceOf(ToolError);
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      message: 'empty.pdf is empty',
    });
  });
  it('rejects a non-matching file after reading only its first 1 KB', async () => {
    const file = new File([ascii('not a pdf'), new Uint8Array(4096)], 'x.pdf');
    const arrayBuffer = vi.spyOn(file, 'arrayBuffer');
    const slice = vi.spyOn(file, 'slice');
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
    expect(slice).toHaveBeenCalledWith(0, 1024);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
  it('converts file read errors to ToolError', async () => {
    const file = Object.assign(new File([ascii('%PDF-1.7')], 'locked.pdf'), {
      arrayBuffer: () =>
        Promise.reject(new DOMException('x', 'NotReadableError')),
    });
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: "Couldn't read locked.pdf",
    });
  });
});

describe('helpers', () => {
  it('builds accept attributes and descriptions', () => {
    expect(acceptAttribute(['pdf'])).toBe('.pdf,application/pdf');
    expect(acceptAttribute(['png', 'jpeg'])).toBe(
      '.png,image/png,.jpg,.jpeg,image/jpeg',
    );
    expect(describeKinds(['pdf'])).toBe('PDF');
    expect(describeKinds([])).toBe('supported');
    expect(describeKinds(['png', 'jpeg', 'webp'])).toBe('PNG, JPEG or WebP');
  });
  it('flags the soft size limit', () => {
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT)).toBe(false);
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT + 1)).toBe(true);
  });
});

describe('readText / loadTextFile', () => {
  const file = (text: string, name: string) => new File([text], name);

  it('reads UTF-8 text', async () => {
    expect(await readText(file('héllo', 'a.txt'))).toBe('héllo');
  });
  it('returns name, size and text', async () => {
    const r = await loadTextFile(file('a,b\n1,2', 'data.csv'), {
      extensions: ['csv', 'tsv'],
    });
    expect(r).toEqual({ name: 'data.csv', size: 7, text: 'a,b\n1,2' });
  });
  it('matches extensions case-insensitively, with or without a dot', async () => {
    await expect(
      loadTextFile(file('x', 'LOG.TXT'), { extensions: ['.txt'] }),
    ).resolves.toMatchObject({ text: 'x' });
  });
  it('rejects a wrong extension with INVALID_FILE naming the file', async () => {
    await expect(
      loadTextFile(file('x', 'pic.png'), { extensions: ['csv'] }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: expect.stringContaining('pic.png'),
    });
  });
  it('rejects oversize files with TOO_LARGE', async () => {
    await expect(
      loadTextFile(file('12345', 'big.txt'), { maxBytes: 4 }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });
});

describe('detectContentKind', () => {
  it('keeps the detectKind results', () => {
    expect(detectContentKind(ascii('%PDF-1.7'))).toBe('pdf');
    expect(detectContentKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(detectContentKind(ascii('GIF89a'))).toBe('gif');
  });
  it('detects archives', () => {
    expect(detectContentKind(bytes(0x50, 0x4b, 0x03, 0x04, 0x14))).toBe('zip');
    expect(detectContentKind(bytes(0x50, 0x4b, 0x05, 0x06, 0))).toBe('zip');
    expect(detectContentKind(bytes(0x1f, 0x8b, 0x08, 0))).toBe('gzip');
  });
  it('detects media', () => {
    expect(detectContentKind(ascii('\0\0\0\x18ftypmp42'))).toBe('mp4');
    expect(detectContentKind(bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f))).toBe('webm');
    expect(detectContentKind(ascii('ID3\x04\0'))).toBe('mp3');
    expect(detectContentKind(bytes(0xff, 0xfb, 0x90, 0x64))).toBe('mp3');
  });
  it('detects JSON only when it parses', () => {
    expect(detectContentKind(ascii('  {"a":1}\n'))).toBe('json');
    expect(detectContentKind(ascii('[1,2]'))).toBe('json');
    expect(detectContentKind(ascii('{"a":'))).toBeNull();
    expect(detectContentKind(ascii('{"doc":"%PDF-1.4"}'))).toBe('json');
  });
  it('detects SVG after a prolog and comments', () => {
    expect(
      detectContentKind(
        ascii('<?xml version="1.0"?>\n<!-- x --><svg xmlns="a"></svg>'),
      ),
    ).toBe('svg');
    expect(detectContentKind(ascii('<html><svg></svg></html>'))).toBeNull();
  });
  it('returns null for plain text', () => {
    expect(detectContentKind(ascii('hello'))).toBeNull();
  });
});
