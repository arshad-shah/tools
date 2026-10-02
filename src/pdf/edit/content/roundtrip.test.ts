import { describe, expect, it } from 'vitest';
import {
  makeFormPdf,
  makeImageHeavyPdf,
  makeMetadataPdf,
  makeShapesOnlyPdf,
  makeStructuredPdf,
  makeTextPdf,
} from '../../../../test/fixtures/builders';
import { makeRedactAdversarial } from '../../../../test/fixtures/redact';
import { contentStreams } from '../../../../test/fixtures/content';
import { parseContent } from './lexer';
import { serializeContent } from './serialize';
import type { Tok } from './tokens';

/** Token values with numbers rounded to the serialiser's 6 decimals. */
function shape(t: Tok): unknown {
  switch (t.t) {
    case 'num':
      return Math.round(t.v * 1e6) / 1e6;
    case 'str':
      return [...t.v];
    case 'arr':
      return t.v.map(shape);
    case 'dict':
      return [...t.v].map(([k, v]) => [k, shape(v)]);
    case 'name':
    case 'bool':
      return t.v;
    case 'null':
      return null;
  }
}

const CORPUS: [string, () => Promise<Uint8Array>][] = [
  ['text-3', () => makeTextPdf({ pages: 3, label: 'Alpha' })],
  ['structured-3', () => makeStructuredPdf(3)],
  ['form', makeFormPdf],
  ['images-heavy', makeImageHeavyPdf],
  ['shapes-2', () => makeShapesOnlyPdf(2)],
  ['metadata', makeMetadataPdf],
  ['redact-adversarial', makeRedactAdversarial],
];

describe('content round trip', () => {
  it.each(CORPUS)('%s: byte for byte and semantically', async (_, make) => {
    const streams = await contentStreams(await make());
    expect(streams.length).toBeGreaterThan(0);
    for (const s of streams) {
      const parsed = parseContent(s.bytes);
      expect(serializeContent(parsed)).toEqual(s.bytes);
      const modified = {
        ops: parsed.ops.map(({ op, operands, inline }) => ({
          op,
          operands,
          inline,
        })),
        tail: parsed.tail,
      };
      const again = parseContent(serializeContent(modified));
      expect(again.ops.map((o) => [o.op, o.operands.map(shape)])).toEqual(
        parsed.ops.map((o) => [o.op, o.operands.map(shape)]),
      );
    }
  });

  it('round trips inline images and comments', () => {
    const src = new TextEncoder().encode(
      'q % keep\n BI /W 2 /H 1 /CS /G /BPC 8 ID \x01\x02 EI Q\n',
    );
    const parsed = parseContent(src);
    expect(serializeContent(parsed)).toEqual(src);
    const canonical = serializeContent({
      ops: parsed.ops.map(({ op, operands, inline }) => ({
        op,
        operands,
        inline,
      })),
      tail: parsed.tail,
    });
    const again = parseContent(canonical);
    expect([...again.ops[1].inline!.data]).toEqual([1, 2]);
    expect(again.ops.map((o) => o.op)).toEqual(['q', 'BI', 'Q']);
  });
});
