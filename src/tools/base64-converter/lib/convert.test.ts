import { describe, expect, it } from 'vitest';
import { utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import {
  PREVIEW_LENGTH,
  PREVIEW_THRESHOLD,
  decodeInput,
  encodeBytes,
  encodeText,
  guessFileType,
  preview,
} from './convert';

// Built from the code point: rule (a) bans pictographs as literals.
const GRIN = String.fromCodePoint(0x1f600);

describe('encodeText', () => {
  it('encodes any Unicode text', () => {
    expect(encodeText('€', { urlSafe: false })).toBe('4oKs');
    expect(encodeText(`café ${GRIN}`, { urlSafe: false })).toBe(
      'Y2Fmw6kg8J+YgA==',
    );
  });

  it('uses the URL-safe alphabet without padding when asked', () => {
    expect(encodeText(`café ${GRIN}`, { urlSafe: true })).toBe(
      'Y2Fmw6kg8J-YgA',
    );
  });
});

describe('encodeBytes', () => {
  it('returns Base64 and a data URI', () => {
    const out = encodeBytes(new Uint8Array([1, 2, 3]), 'image/png', {
      urlSafe: false,
    });
    expect(out).toEqual({
      base64: 'AQID',
      dataUri: 'data:image/png;base64,AQID',
    });
  });
});

describe('decodeInput', () => {
  it('decodes UTF-8 text', () => {
    const out = decodeInput('Y2Fmw6kg8J+YgA==');
    expect(out.text).toBe(`café ${GRIN}`);
  });

  it('decodes URL-safe Base64 without padding', () => {
    expect(decodeInput('Y2Fmw6kg8J-YgA').text).toBe(`café ${GRIN}`);
  });

  it('reports binary data as bytes with no text', () => {
    const out = decodeInput('iVBORw0KGgo=');
    expect(out.text).toBeNull();
    expect(out.bytes.length).toBe(8);
    expect(out.mime).toBe('image/png');
  });

  it('accepts a data URI and keeps its media type', () => {
    const out = decodeInput('data:application/json;base64,eyJhIjoxfQ==');
    expect(out.text).toBe('{"a":1}');
    expect(out.mime).toBe('application/json');
  });

  it('throws a ToolError for invalid Base64', () => {
    expect(() => decodeInput('not base64!')).toThrow(ToolError);
  });
});

describe('guessFileType', () => {
  it('sniffs known formats, then trusts the hint, then falls back', () => {
    expect(guessFileType(utf8Encode('%PDF-1.7'))).toEqual({
      mime: 'application/pdf',
      ext: 'pdf',
    });
    expect(guessFileType(utf8Encode('{}'), 'application/json')).toEqual({
      mime: 'application/json',
      ext: 'json',
    });
    expect(guessFileType(utf8Encode('hello'))).toEqual({
      mime: 'text/plain',
      ext: 'txt',
    });
    expect(guessFileType(new Uint8Array([0, 159, 146, 150]))).toEqual({
      mime: 'application/octet-stream',
      ext: 'bin',
    });
  });
});

describe('preview', () => {
  it('keeps short text whole', () => {
    expect(preview('abc', 10)).toEqual({ text: 'abc', truncated: false });
  });

  it('cuts long text for display only', () => {
    expect(preview('a'.repeat(20), 5)).toEqual({
      text: 'aaaaa',
      truncated: true,
    });
  });

  it('shows everything up to the 1 MB default threshold', () => {
    const text = 'b'.repeat(PREVIEW_THRESHOLD);
    expect(preview(text).truncated).toBe(false);
    expect(preview(text + 'b').truncated).toBe(true);
    expect(preview(text + 'b').text.length).toBe(PREVIEW_LENGTH);
  });
});

describe('encode variants', () => {
  it('pads, unpads and wraps at 76', () => {
    expect(encodeText('a', { urlSafe: false, padding: false })).toBe('YQ');
    expect(encodeText('a', { urlSafe: true, padding: true })).toBe('YQ==');
    const wrapped = encodeText('x'.repeat(100), {
      urlSafe: false,
      wrap76: true,
    });
    expect(wrapped.split('\n').map((l) => l.length)).toEqual([76, 60]);
  });
});
