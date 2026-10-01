import { describe, expect, it } from 'vitest';
import {
  combinedText,
  pagesWithoutText,
  previewText,
  textOutputs,
} from './output';

const pages = [
  { text: 'Alpha 1', hasTextLayer: true },
  { text: '', hasTextLayer: false },
  { text: 'Alpha 3\nmore', hasTextLayer: true },
];
const decode = (b: Uint8Array) => new TextDecoder().decode(b);

describe('pdf-to-text output', () => {
  it('joins pages with headers and flags pages without a text layer', () => {
    expect(combinedText(pages)).toBe(
      '--- Page 1 ---\nAlpha 1\n\n--- Page 2 (no text layer) ---\n\n\n--- Page 3 ---\nAlpha 3\nmore\n',
    );
    expect(pagesWithoutText(pages)).toEqual([2]);
  });
  it('makes one combined .txt', () => {
    const [file] = textOutputs('scan.pdf', pages, 'combined');
    expect(file.name).toBe('scan.txt');
    expect(file.mime).toBe('text/plain;charset=utf-8');
    expect(decode(file.bytes)).toBe(combinedText(pages));
  });
  it('makes one padded .txt per page and marks empty ones', () => {
    const files = textOutputs('scan.pdf', pages, 'per-page');
    expect(files.map((f) => f.name)).toEqual([
      'scan.page-1.txt',
      'scan.page-2.txt',
      'scan.page-3.txt',
    ]);
    expect(decode(files[2].bytes)).toBe('Alpha 3\nmore\n');
    expect(files[1].detail).toBe('no text layer');
  });
});

describe('previewText', () => {
  it('keeps short text as-is', () => {
    expect(previewText('abc', 5)).toEqual({ text: 'abc', truncated: false });
  });
  it('cuts long text and marks it', () => {
    expect(previewText('abcdefgh', 5)).toEqual({
      text: 'abcde…',
      truncated: true,
    });
  });
  it('never splits a surrogate pair', () => {
    expect(previewText('ab😀cd', 3)).toEqual({ text: 'ab…', truncated: true });
  });
});
