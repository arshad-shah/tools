import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textItemsFrom } from '@/pdf/render/text';
import type { PageTextItems } from '@/pdf/render';
import { MARKDOWN_NOTICE, toMarkdown } from './markdown';

type Line = { text: string; size: number; y: number; x?: number };

async function itemsOf(lines: Line[]): Promise<PageTextItems> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  for (const l of lines)
    page.drawText(l.text, { x: l.x ?? 72, y: l.y, size: l.size, font });
  const task = getDocument({
    data: await doc.save(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const p = await (await task.promise).getPage(1);
    return textItemsFrom(
      await p.getTextContent({ includeMarkedContent: false }),
    );
  } finally {
    await task.destroy();
  }
}

describe('toMarkdown tables from detected cells', () => {
  it('writes table cells as a GFM table in reading position', async () => {
    // A 2 x 3 grid of 100 x 20 cells, top-left at (72, 700).
    const cell = (r: number, c: number) => ({
      x: 72 + 100 * c,
      y: 680 - 20 * r,
      width: 100,
      height: 20,
    });
    const at = (r: number, c: number, text: string): Line => ({
      text,
      size: 10,
      x: 76 + 100 * c,
      y: 686 - 20 * r,
    });
    const items = await itemsOf([
      { text: 'Before the table', size: 10, y: 730 },
      at(0, 0, 'Name'),
      at(0, 1, 'Age'),
      at(0, 2, 'Town'),
      at(1, 0, 'Ann | Bo'),
      at(1, 1, '42'),
      { text: 'After the table', size: 10, y: 600 },
    ]);
    const cells = [0, 1].flatMap((r) => [0, 1, 2].map((c) => cell(r, c)));
    const md = toMarkdown([{ items, geometry: { cells } }]);
    expect(md).toBe(
      [
        MARKDOWN_NOTICE,
        '',
        'Before the table',
        '',
        '| Name | Age | Town |',
        '| --- | --- | --- |',
        '| Ann \\| Bo | 42 |  |',
        '',
        'After the table',
        '',
      ].join('\n'),
    );
  });

  it('leaves a lone box (one row) as text', async () => {
    const items = await itemsOf([
      { text: 'Boxed note', size: 10, y: 686, x: 76 },
    ]);
    const md = toMarkdown([
      {
        items,
        geometry: { cells: [{ x: 72, y: 680, width: 300, height: 20 }] },
      },
    ]);
    expect(md).toBe(`${MARKDOWN_NOTICE}\n\nBoxed note\n`);
  });
});
