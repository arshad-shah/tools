import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../../../test/fixtures/builders';
import { drawText, type DrawCtx } from './draw';
import { FontCache } from './font-cache';
import { headerFooterDoc } from './markup-header';

const file = (subset: string) =>
  new Uint8Array(
    readFileSync(
      createRequire(import.meta.url).resolve(
        `@fontsource/noto-sans/files/noto-sans-${subset}-400-normal.woff`,
      ),
    ),
  );
const latin = () => Promise.resolve(file('latin'));
const cp = (...points: number[]) => String.fromCodePoint(...points);

async function setup() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const fallbacks = vi.fn(async () =>
    ['latin-ext', 'greek', 'cyrillic'].map(file),
  );
  const ctx: DrawCtx = { doc, fonts: new FontCache(doc, latin, fallbacks) };
  return { doc, page, ctx, fallbacks };
}

const style = { font: { unicode: true }, size: 12, color: '#000000' } as const;
const box = { x: 40, y: 600, width: 500, height: 30 };

describe('Unicode text with per-character fallback', () => {
  it('draws Latin Extended, Greek and Cyrillic letters next to plain Latin', async () => {
    const { doc, page, ctx } = await setup();
    // "Lodz" with an L stroke, "alpha beta" and "Moskva" in their scripts.
    const text = `${cp(0x141)}${cp(0xf3)}d${cp(0x17a)} ${cp(0x3b1, 0x3b2)} ${cp(0x41c, 0x43e, 0x441, 0x43a, 0x432, 0x430)}`;
    await drawText(ctx, page, text, box, style);
    expect(await pdfPageTexts(await doc.save())).toEqual([text]);
  });

  it('loads no fallback font for text the main font covers', async () => {
    const { page, ctx, fallbacks } = await setup();
    await drawText(ctx, page, `Caf${cp(0xe9)}`, box, style);
    expect(fallbacks).not.toHaveBeenCalled();
  });

  it('names the characters no font can draw', async () => {
    const { page, ctx } = await setup();
    await expect(
      drawText(ctx, page, `ok ${cp(0x4e2d)}`, box, style),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: expect.stringContaining(cp(0x4e2d)),
    });
  });

  it('draws a header in Greek and Cyrillic after the Latin font', async () => {
    const { doc, ctx } = await setup();
    const name = `Page ${cp(0x3a3, 0x3bf, 0x3c6, 0x3af, 0x3b1)} ${cp(0x41a, 0x438, 0x435, 0x432)}`;
    await headerFooterDoc(
      doc,
      {
        header: { left: name, center: '', right: '' },
        footer: { left: '', center: '', right: '' },
        fontSize: 10,
        color: '#000000',
        margin: { top: 20, bottom: 20, side: 30 },
        pages: { mode: 'all' },
        filename: 'a.pdf',
        date: new Date(0),
      },
      ctx.fonts,
    );
    expect(await pdfPageTexts(await doc.save())).toEqual([name]);
  });
});
