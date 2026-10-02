import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textItemsFrom } from '@/pdf/render/text';
import type { PageTextItems, TextItemGeom } from '@/pdf/render';
import { MARKDOWN_NOTICE, toMarkdown } from './markdown';

const BULLET = String.fromCodePoint(0x2022);

type Line = { text: string; size: number; y: number; x?: number };

/** One page per entry; each line drawn with Helvetica at its own size and baseline. */
async function buildPdf(pages: Line[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    for (const l of lines)
      page.drawText(l.text, { x: l.x ?? 72, y: l.y, size: l.size, font });
  }
  return doc.save();
}

async function itemsOf(bytes: Uint8Array): Promise<PageTextItems[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const out: PageTextItems[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      out.push(
        textItemsFrom(
          await page.getTextContent({ includeMarkedContent: false }),
        ),
      );
    }
    return out;
  } finally {
    await task.destroy();
  }
}

const markdownOf = async (pages: Line[][]) =>
  toMarkdown(
    (await itemsOf(await buildPdf(pages))).map((items) => ({ items })),
  );

/** A report page: 20pt title, two 12pt paragraphs, a numbered list, a hyphenated word. */
const REPORT: Line[] = [
  { text: 'Quarterly Report', size: 20, y: 720 },
  { text: 'The first paragraph starts here and', size: 12, y: 680 },
  { text: 'continues on a second line.', size: 12, y: 665 },
  { text: 'The second paragraph mentions an extra-', size: 12, y: 635 },
  { text: 'ordinary result in the same sentence.', size: 12, y: 620 },
  { text: '1. Collect the data', size: 12, y: 590 },
  { text: '2. Check the totals', size: 12, y: 575 },
  { text: '3) Send the report', size: 12, y: 560 },
];

describe('toMarkdown', () => {
  it('starts with the best-effort notice', async () => {
    const md = await markdownOf([REPORT]);
    expect(MARKDOWN_NOTICE).toBe(
      '<!-- Converted by tools: best-effort structure, check before use -->',
    );
    expect(md.startsWith(`${MARKDOWN_NOTICE}\n`)).toBe(true);
  });

  it('turns the large title into a heading', async () => {
    const md = await markdownOf([REPORT]);
    expect(md).toContain('\n# Quarterly Report\n');
  });

  it('joins the lines of a paragraph and separates paragraphs', async () => {
    const md = await markdownOf([REPORT]);
    expect(md).toContain(
      '\n\nThe first paragraph starts here and continues on a second line.\n\n',
    );
  });

  it('joins a word hyphenated across a line break', async () => {
    const md = await markdownOf([REPORT]);
    expect(md).toContain(
      'The second paragraph mentions an extraordinary result in the same sentence.',
    );
  });

  it('writes numbered items as an ordered list', async () => {
    const md = await markdownOf([REPORT]);
    expect(md).toContain(
      '1. Collect the data\n2. Check the totals\n3. Send the report',
    );
  });

  it('keeps a hyphen when the next line starts with a capital', async () => {
    const md = await markdownOf([
      [
        { text: 'Paris and the Franco-', size: 12, y: 700 },
        { text: 'German border region.', size: 12, y: 685 },
      ],
    ]);
    expect(md).toContain('Paris and the Franco- German border region.');
  });

  it('converts bullet glyphs and dashes into list items without the glyph', async () => {
    const md = await markdownOf([
      [
        { text: 'Shopping', size: 18, y: 720 },
        { text: `${BULLET} Apples`, size: 12, y: 690 },
        { text: `${BULLET} Pears`, size: 12, y: 675 },
        { text: '- Plums', size: 12, y: 660 },
        { text: '* Figs', size: 12, y: 645 },
      ],
    ]);
    expect(md).toContain('- Apples\n- Pears\n- Plums\n- Figs');
    for (const cp of [0x2022, 0x25cf, 0x25e6, 0x2023])
      expect(md.includes(String.fromCodePoint(cp))).toBe(false);
  });

  it('uses # for the largest heading size and ## for the next', async () => {
    const md = await markdownOf([
      [
        { text: 'Big Title', size: 24, y: 720 },
        { text: 'Intro text for the document.', size: 12, y: 690 },
        { text: 'A Section', size: 16, y: 650 },
        { text: 'Section body text that follows.', size: 12, y: 625 },
        { text: 'More body text for the median.', size: 12, y: 595 },
      ],
    ]);
    expect(md).toContain('# Big Title');
    expect(md).toContain('## A Section');
    expect(md).not.toContain('# Intro');
  });

  it('continues across pages and honours the pages option', async () => {
    const items = await itemsOf(
      await buildPdf([
        [{ text: 'First page text.', size: 12, y: 700 }],
        [{ text: 'Second page text.', size: 12, y: 700 }],
      ]),
    );
    const both = toMarkdown(items.map((i) => ({ items: i })));
    expect(both).toContain('First page text.\n\nSecond page text.');
    const only = toMarkdown(
      items.map((i) => ({ items: i })),
      { pages: [1] },
    );
    expect(only).not.toContain('First page');
    expect(only).toContain('Second page text.');
  });

  it('separates items on one baseline with a space when there is a gap', () => {
    const item = (str: string, x: number): TextItemGeom => ({
      str,
      transform: [12, 0, 0, 12, x, 700],
      width: str.length * 6,
      height: 12,
      fontName: 'f',
      hasEOL: false,
    });
    const md = toMarkdown([
      { items: { items: [item('world', 120), item('Hello', 72)], styles: {} } },
    ]);
    expect(md).toContain('Hello world');
  });

  it('returns only the notice when there is no text', () => {
    expect(toMarkdown([{ items: { items: [], styles: {} } }])).toBe(
      `${MARKDOWN_NOTICE}\n`,
    );
  });
});
