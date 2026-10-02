import { describe, expect, it } from 'vitest';
import { sniffAcceptKind } from './sniff';

const file = (content: BlobPart, name = 'f') => new File([content], name);

describe('sniffAcceptKind', () => {
  it('detects binary kinds from magic bytes', async () => {
    expect(await sniffAcceptKind(file('%PDF-1.7\n%%EOF'))).toBe('pdf');
    expect(
      await sniffAcceptKind(
        file(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      ),
    ).toBe('png');
    expect(
      await sniffAcceptKind(file(new Uint8Array([0x52, 0x49, 0x56, 0x45, 7]))),
    ).toBe('riv');
  });
  it('detects JSON and XML', async () => {
    expect(await sniffAcceptKind(file('{"a":1}'))).toBe('json');
    expect(await sniffAcceptKind(file('[1, 2]'))).toBe('json');
    expect(await sniffAcceptKind(file('<?xml version="1.0"?><a/>'))).toBe(
      'xml',
    );
    expect(await sniffAcceptKind(file('<root><a/></root>'))).toBe('xml');
  });
  it('detects CSV and TSV', async () => {
    expect(await sniffAcceptKind(file('a,b,c\n1,2,3\n4,5,6\n'))).toBe('csv');
    expect(await sniffAcceptKind(file('a\tb\n1\t2\n3\t4\n'))).toBe('tsv');
  });
  it('detects logs', async () => {
    const log = [
      '2026-10-01 12:00:01 INFO start',
      '2026-10-01 12:00:02 WARN slow',
      '[2026-10-01T12:00:03] ERROR boom',
    ].join('\n');
    expect(await sniffAcceptKind(file(log))).toBe('log');
  });
  it('falls back to text', async () => {
    expect(await sniffAcceptKind(file('hello world\nsecond line'))).toBe(
      'text',
    );
  });
  it('returns null for binary garbage', async () => {
    expect(
      await sniffAcceptKind(
        file(new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28])),
      ),
    ).toBeNull();
  });
  it('trusts content over the extension', async () => {
    expect(await sniffAcceptKind(file('{"a":1}', 'data.csv'))).toBe('json');
  });
  it('does not call broken JSON json', async () => {
    expect(await sniffAcceptKind(file('{not json'))).toBe('text');
  });
});
