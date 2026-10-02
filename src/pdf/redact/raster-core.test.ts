import { describe, expect, it } from 'vitest';
import { textColour } from './mark-style';
import { collectDocTexts, coverageOf } from './raster-core';

const viewport = { width: 10, height: 10, transform: [1, 0, 0, -1, 0, 10] };

const filled = (rgb: [number, number, number]) => {
  const out = new Uint8Array(10 * 10 * 4);
  for (let i = 0; i < 100; i++) out.set([...rgb, 255], i * 4);
  return out;
};

describe('collectDocTexts', () => {
  it('ties a form field value to the page its widget is on', async () => {
    const doc = {
      numPages: 3,
      getPage: async () => ({
        getTextContent: async () => ({ items: [] }),
        getAnnotations: async () => [],
        cleanup: () => {},
      }),
      getOutline: async () => null,
      getMetadata: async () => ({ info: {}, metadata: null }),
      getFieldObjects: async () => ({
        shown: [{ value: 'on page three', page: 2 }],
        loose: [{ value: 'no page', page: -1 }],
      }),
      getAttachments: async () => null,
    };
    const fields = (await collectDocTexts(doc)).filter(
      (e) => !e.where.endsWith(' text'),
    );
    expect(fields).toEqual([
      { text: 'on page three', where: 'a form field on page 3', page: 2 },
      { text: 'no page', where: 'a form field', page: null },
    ]);
  });
});

describe('coverageOf', () => {
  const mark = {
    box: { x: 0, y: 0, width: 10, height: 10 },
    fill: '#000000',
    overlayText: 'REDACTED',
  };

  it('counts fill pixels as covered', () => {
    expect(coverageOf(filled([0, 0, 0]), 10, viewport, [mark])).toEqual([1]);
  });

  it('does not count overlay text coloured pixels as covered', () => {
    const text = filled(textColour(mark.fill));
    expect(coverageOf(text, 10, viewport, [mark])).toEqual([0]);
  });
});
