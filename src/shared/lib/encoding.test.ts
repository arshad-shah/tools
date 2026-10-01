import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  base64UrlToBytes,
  bytesToBase64,
  parseDataUri,
  toDataUri,
  utf8Decode,
  utf8Encode,
} from './encoding';
import { ToolError } from './errors';

describe('UTF-8', () => {
  it('round-trips non-Latin-1 text', () => {
    const text = 'café € 日本 \u{1F600}';
    expect(utf8Decode(utf8Encode(text))).toBe(text);
    expect(utf8Encode('€')).toEqual(new Uint8Array([0xe2, 0x82, 0xac]));
  });

  it('rejects invalid UTF-8 with a ToolError', () => {
    expect(() => utf8Decode(new Uint8Array([0xff, 0xfe]))).toThrow(ToolError);
  });
});

describe('bytesToBase64', () => {
  it('encodes the RFC 4648 test vectors', () => {
    const cases: [string, string][] = [
      ['', ''],
      ['f', 'Zg=='],
      ['fo', 'Zm8='],
      ['foo', 'Zm9v'],
      ['foob', 'Zm9vYg=='],
      ['fooba', 'Zm9vYmE='],
      ['foobar', 'Zm9vYmFy'],
    ];
    for (const [plain, b64] of cases)
      expect(bytesToBase64(utf8Encode(plain))).toBe(b64);
  });

  it('encodes UTF-8 text', () => {
    expect(bytesToBase64(utf8Encode('€'))).toBe('4oKs');
  });

  it('has a URL-safe alphabet without padding', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);
    expect(bytesToBase64(bytes)).toBe('+/+/');
    expect(bytesToBase64(bytes, { urlSafe: true })).toBe('-_-_');
    expect(bytesToBase64(utf8Encode('f'), { urlSafe: true })).toBe('Zg');
  });

  it('handles large inputs without blowing the stack', () => {
    const big = new Uint8Array(1_000_000).fill(65);
    expect(bytesToBase64(big).length).toBe(1_333_336);
  });
});

describe('base64ToBytes', () => {
  it('decodes standard, URL-safe, unpadded and wrapped input', () => {
    expect(utf8Decode(base64ToBytes('Zm9vYmE='))).toBe('fooba');
    expect(utf8Decode(base64ToBytes('Zm9vYmE'))).toBe('fooba');
    expect(base64ToBytes('-_-_')).toEqual(new Uint8Array([0xfb, 0xff, 0xbf]));
    expect(utf8Decode(base64ToBytes(' Zm9v\r\nYmFy \n'))).toBe('foobar');
    expect(utf8Decode(base64ToBytes('4oKs'))).toBe('€');
  });

  it('rejects malformed input with a ToolError', () => {
    expect(() => base64ToBytes('Zm9v!')).toThrow(ToolError);
    expect(() => base64ToBytes('Z')).toThrow(ToolError);
    expect(() => base64ToBytes('Zg=a')).toThrow(ToolError);
  });
});

describe('base64UrlToBytes (strict, RFC 7515)', () => {
  it('decodes unpadded URL-safe Base64', () => {
    expect(base64UrlToBytes('-_-_')).toEqual(
      new Uint8Array([0xfb, 0xff, 0xbf]),
    );
    expect(utf8Decode(base64UrlToBytes('Zm9vYmE'))).toBe('fooba');
    expect(base64UrlToBytes('')).toEqual(new Uint8Array());
  });

  it.each(['Zm9v+A', 'Zm9v/A', 'Zg==', 'Zm 9v', 'Z', 'Zm9v!'])(
    'rejects %j',
    (input) => {
      expect(() => base64UrlToBytes(input)).toThrow(ToolError);
    },
  );
});

describe('data URIs', () => {
  it('builds and parses base64 data URIs', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const uri = toDataUri(bytes, 'image/png');
    expect(uri).toBe('data:image/png;base64,AQID');
    expect(parseDataUri(uri)).toEqual({ mime: 'image/png', bytes });
  });

  it('parses percent-encoded data URIs and ignores plain Base64', () => {
    expect(parseDataUri('data:text/plain,a%20b')).toEqual({
      mime: 'text/plain',
      bytes: utf8Encode('a b'),
    });
    expect(parseDataUri('Zm9v')).toBeNull();
  });

  it('percent-decodes binary bytes that are not UTF-8 (RFC 2397)', () => {
    expect(
      parseDataUri('data:application/octet-stream,%FF%00a%e2%82%ac'),
    ).toEqual({
      mime: 'application/octet-stream',
      bytes: new Uint8Array([0xff, 0x00, 0x61, 0xe2, 0x82, 0xac]),
    });
    // Unescaped non-ASCII characters are taken as UTF-8.
    expect(parseDataUri('data:,café')?.bytes).toEqual(utf8Encode('café'));
  });

  it('rejects a malformed percent escape', () => {
    expect(() => parseDataUri('data:,%G1')).toThrow(ToolError);
    expect(() => parseDataUri('data:,%A')).toThrow(ToolError);
  });
});

describe('bytesToBase64 with the native encoder', () => {
  it('uses Uint8Array.prototype.toBase64 when the browser has it', () => {
    const proto = Uint8Array.prototype as unknown as {
      toBase64?: (o?: { alphabet?: string; omitPadding?: boolean }) => string;
    };
    const original = proto.toBase64;
    const calls: unknown[] = [];
    proto.toBase64 = function (o) {
      calls.push(o);
      return 'NATIVE';
    };
    try {
      expect(bytesToBase64(new Uint8Array([1]), { urlSafe: true })).toBe(
        'NATIVE',
      );
      expect(calls).toEqual([{ alphabet: 'base64url', omitPadding: true }]);
    } finally {
      if (original) proto.toBase64 = original;
      else delete proto.toBase64;
    }
  });
});
