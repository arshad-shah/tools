import {
  decodePDFRawStream,
  PDFDocument,
  PDFRawStream,
  type PDFRef,
} from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { Box } from '@/pdf/edit/draw';
import { buildAppearance } from './appearance';

const latin1 = new TextDecoder('latin1');

function contentOf(doc: PDFDocument, ref: PDFRef): string {
  const s = doc.context.lookup(ref);
  if (!(s instanceof PDFRawStream)) throw new Error('not a raw stream');
  return latin1.decode(decodePDFRawStream(s).decode());
}

const caption = { name: 'Jane Doe', date: '2 October 2026' };

describe('buildAppearance', () => {
  it('lays visual and caption out unturned on an upright page', async () => {
    const doc = await PDFDocument.create();
    const areas: Box[] = [];
    const ref = await buildAppearance(
      doc,
      { x: 0, y: 0, width: 180, height: 60 },
      async (_p, a) => void areas.push(a),
      caption,
    );
    expect(areas).toEqual([{ x: 0, y: 15, width: 180, height: 45 }]);
    expect(contentOf(doc, ref)).not.toMatch(/ cm\b/);
  });

  it.each([
    [90, '0 1 -1 0 60 0 cm'],
    [180, '-1 0 0 -1 60 180 cm'],
    [270, '0 -1 1 0 0 180 cm'],
  ])(
    'turns visual and caption with a page rotated %i degrees',
    async (rotation, matrix) => {
      const doc = await PDFDocument.create();
      const areas: Box[] = [];
      // Page space 60 wide, 180 tall: on screen a quarter turn shows 180 by 60.
      const ref = await buildAppearance(
        doc,
        { x: 0, y: 0, width: 60, height: 180 },
        async (_p, a) => void areas.push(a),
        caption,
        rotation,
      );
      const upright = rotation === 180 ? [60, 180] : [180, 60];
      expect(areas).toEqual([
        {
          x: 0,
          y: upright[1] * 0.25,
          width: upright[0],
          height: upright[1] * 0.75,
        },
      ]);
      const content = contentOf(doc, ref);
      expect(content).toContain(matrix);
      // The caption is drawn after the turn, inside the same state.
      expect(content.indexOf(matrix)).toBeLessThan(content.indexOf('Tj'));
    },
  );
});
