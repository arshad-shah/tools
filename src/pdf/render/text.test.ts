import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  makeShapesOnlyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { textFromItems, textItemsFrom } from './text';

async function firstPageContent(bytes: Uint8Array) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    return await (
      await pdf.getPage(1)
    ).getTextContent({ includeMarkedContent: false });
  } finally {
    await task.destroy();
  }
}

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

describe('textItemsFrom', () => {
  it('keeps positioned items, drops marked content and copies styles', () => {
    const out = textItemsFrom({
      items: [
        { type: 'beginMarkedContent', id: 'm1' },
        {
          str: 'Hi',
          dir: 'ltr',
          transform: [12, 0, 0, 12, 72, 700],
          width: 14,
          height: 12,
          fontName: 'g_d0_f1',
          hasEOL: true,
        },
        { type: 'endMarkedContent' },
      ],
      styles: {
        g_d0_f1: {
          ascent: 0.7,
          descent: -0.2,
          vertical: false,
          fontFamily: 'sans-serif',
        },
      },
    });
    expect(out).toEqual({
      items: [
        {
          str: 'Hi',
          transform: [12, 0, 0, 12, 72, 700],
          width: 14,
          height: 12,
          fontName: 'g_d0_f1',
          hasEOL: true,
        },
      ],
      styles: {
        g_d0_f1: {
          ascent: 0.7,
          descent: -0.2,
          vertical: false,
          fontFamily: 'sans-serif',
        },
      },
    });
  });

  it('reports real pdf.js items in page space', async () => {
    const content = await firstPageContent(await makeTextPdf({ label: 'Pos' }));
    const { items, styles } = textItemsFrom(content);
    const first = items.find((i) => i.str.length > 0)!;
    expect(first.str).toBe('Pos 1');
    // makeTextPdf draws at x 72, y 792 - 96, 24 pt.
    expect(first.transform[0]).toBeCloseTo(24);
    expect(first.transform[4]).toBeCloseTo(72);
    expect(first.transform[5]).toBeCloseTo(696);
    expect(first.width).toBeGreaterThan(0);
    expect(styles[first.fontName]).toMatchObject({ vertical: false });
    expect(typeof styles[first.fontName].fontFamily).toBe('string');
  });
});
