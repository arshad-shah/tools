import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { assertDrawable, unsupportedChars } from './fonts';
import { hexToRgb } from './color';

describe('font checks', () => {
  it('lists characters outside the font, once each', async () => {
    const font = await (
      await PDFDocument.create()
    ).embedFont(StandardFonts.Helvetica);
    expect(unsupportedChars(font, 'Página 1')).toEqual([]);
    // Built from code points: rule (a) bans pictographs as literals.
    const smile = String.fromCodePoint(0x1f642);
    expect(unsupportedChars(font, `Página № №1 ${smile}`)).toEqual([
      '№',
      smile,
    ]);
    expect(() => assertDrawable(font, 'Seite №', 'The watermark text')).toThrow(
      "The watermark text contains characters the font can't draw: №",
    );
  });
});

describe('hexToRgb', () => {
  it('parses #rrggbb into 0–1 channels', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 });
    expect(() => hexToRgb('red')).toThrow('"red" is not a colour like #336699');
  });
});
