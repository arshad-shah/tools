import { describe, expect, it } from 'vitest';
import { PDFDocument, decodePDFRawStream, PDFRawStream } from 'pdf-lib';
import { makeTextPdf, pdfPageTexts } from '../../../../test/fixtures/builders';
import { borderMedian } from '../../render/sample-color';
import { ALL_MATERIALIZERS } from '../materialize';
import { materialize } from '../materialize/materialize';
import { registerMaterializers } from '../materialize/registry';
import { summarizeChanges } from '../summary';
import { makeModel } from '../test-helpers';
import { registerCoreOperations } from '.';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);

const cover = {
  type: 'content.cover',
  params: {
    id: 'c1',
    pageId: 'ckpt0:0',
    rect: { x: 60, y: 680, width: 200, height: 40 },
    fill: '#ffffff',
    text: 'Replaced',
    font: 'Helvetica',
    size: 16,
    color: '#000000',
    align: 'left',
  },
};

async function lastContent(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.getPage(0).node.Contents();
  const streams = contents
    ? 'asArray' in contents
      ? contents.asArray().map((r) => doc.context.lookup(r))
      : [contents]
    : [];
  return streams
    .map((s) =>
      s instanceof PDFRawStream
        ? new TextDecoder().decode(decodePDFRawStream(s).decode())
        : '',
    )
    .join('\n');
}

describe('cover and replace', () => {
  it('labels and summary', () => {
    const model = makeModel();
    expect(model.dispatch(cover)[0].label).toBe('Cover and replace on page 1');
    expect(
      summarizeChanges(model.getState(), model.getView())[0].lines,
    ).toEqual(['1 area covered']);
  });

  it('writes a filled rect, then the text; the original text is still in the file', async () => {
    const base = await makeTextPdf({ pages: 1, label: 'Secret' });
    const model = makeModel();
    model.dispatch(cover);
    const out = await materialize(
      {
        base,
        baseSourceId: 's0',
        sources: {},
        assets: {},
        pages: [{ id: 'ckpt0:0', source: 's0', index: 0, rotate: 0 }],
        pageLabels: null,
        overlays: [...model.getView().overlays.values()].flat(),
      },
      { signal: new AbortController().signal, progress: () => {} },
    );
    const content = await lastContent(out.bytes);
    const fillAt = content.search(/\bre\s+f\b/);
    const textAt = content.lastIndexOf('BT');
    expect(fillAt).toBeGreaterThan(0);
    expect(textAt).toBeGreaterThan(fillAt);
    // Honest UI copy: the covered text can still be copied or found by search.
    const [text] = await pdfPageTexts(out.bytes);
    expect(text).toContain('Secret 1');
    expect(text).toContain('Replaced');
  });
});

describe('borderMedian', () => {
  it('takes the median of the border pixels per channel', () => {
    const w = 4;
    const h = 3;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    // A dark middle (not on the border) and one red border pixel.
    data.set([0, 0, 0, 255], (1 * w + 1) * 4);
    data.set([255, 0, 0, 255], 0);
    expect(borderMedian(data, w, h)).toBe('#ffffff');
    // Mostly blue border.
    for (let i = 0; i < w * h; i++) data.set([10, 20, 200, 255], i * 4);
    expect(borderMedian(data, w, h)).toBe('#0a14c8');
  });
});
