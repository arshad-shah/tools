import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  makeShapesOnlyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { textFromItems } from './text';

async function firstPageItems(bytes: Uint8Array) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    return (await (await pdf.getPage(1)).getTextContent()).items;
  } finally {
    await task.destroy();
  }
}

describe('textFromItems', () => {
  it('joins strings and honours end-of-line markers', () => {
    expect(
      textFromItems([
        { str: 'Hello', hasEOL: false },
        { str: ' world', hasEOL: true },
        { str: 'next', hasEOL: false },
      ]),
    ).toEqual({ text: 'Hello world\nnext', hasTextLayer: true });
  });
  it('reports pages with only whitespace as having no text layer', () => {
    expect(textFromItems([{ str: '  ', hasEOL: false }])).toEqual({
      text: '',
      hasTextLayer: false,
    });
  });
  it('works on real pdf.js output', async () => {
    expect(
      textFromItems(await firstPageItems(await makeTextPdf({ label: 'Real' }))),
    ).toEqual({
      text: 'Real 1',
      hasTextLayer: true,
    });
    expect(
      textFromItems(await firstPageItems(await makeShapesOnlyPdf(1)))
        .hasTextLayer,
    ).toBe(false);
  });
});
