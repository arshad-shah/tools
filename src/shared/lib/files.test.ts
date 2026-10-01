import { describe, expect, it } from 'vitest';
import {
  acceptAttribute,
  describeKinds,
  detectKind,
  isOverSoftLimit,
  loadFile,
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
});

describe('helpers', () => {
  it('builds accept attributes and descriptions', () => {
    expect(acceptAttribute(['pdf'])).toBe('.pdf,application/pdf');
    expect(acceptAttribute(['png', 'jpeg'])).toBe(
      '.png,image/png,.jpg,.jpeg,image/jpeg',
    );
    expect(describeKinds(['pdf'])).toBe('PDF');
    expect(describeKinds(['png', 'jpeg', 'webp'])).toBe('PNG, JPEG or WebP');
  });
  it('flags the soft size limit', () => {
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT)).toBe(false);
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT + 1)).toBe(true);
  });
});
