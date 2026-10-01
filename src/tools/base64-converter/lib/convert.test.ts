import { describe, expect, it } from 'vitest';
import { utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { decodeInput, encodeBytes, encodeText, guessFileType } from './convert';

describe('encodeText', () => {
  it('encodes any Unicode text', () => {
    expect(encodeText('€', { urlSafe: false })).toBe('4oKs');
    expect(encodeText('café \u{1F600}', { urlSafe: false })).toBe(
      'Y2Fmw6kg8J+YgA==',
    );
  });

  it('uses the URL-safe alphabet without padding when asked', () => {
    expect(encodeText('café \u{1F600}', { urlSafe: true })).toBe(
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
    expect(out.text).toBe('café \u{1F600}');
  });

  it('decodes URL-safe Base64 without padding', () => {
    expect(decodeInput('Y2Fmw6kg8J-YgA').text).toBe('café \u{1F600}');
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
