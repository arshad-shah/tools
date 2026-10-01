import { describe, expect, it } from 'vitest';
import { contentOps } from './content-ops';

const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const ops = (b: Uint8Array) => [...contentOps(b)];

describe('contentOps', () => {
  it('parses numbers, names and operators', () => {
    expect(ops(enc('q 100 0 0 50 10 20 cm /Im1 Do Q'))).toEqual([
      { op: 'q', operands: [] },
      { op: 'cm', operands: [100, 0, 0, 50, 10, 20] },
      { op: 'Do', operands: ['Im1'] },
      { op: 'Q', operands: [] },
    ]);
    expect(ops(enc('.5 -3 +2.25 0 0 1 cm'))[0].operands).toEqual([
      0.5, -3, 2.25, 0, 0, 1,
    ]);
  });

  it('skips strings (escapes, nesting), hex strings, arrays, dicts and comments', () => {
    const r = ops(
      enc(
        'BT (a\\)b(c)) Tj [(A) -120 (B)] TJ <00ff> Tj % note\n/P << /MCID 0 /N << /A 1 >> >> BDC EMC ET',
      ),
    );
    expect(r.map((o) => o.op)).toEqual([
      'BT',
      'Tj',
      'TJ',
      'Tj',
      'BDC',
      'EMC',
      'ET',
    ]);
    expect(r[2].operands).toEqual([null]);
    expect(r[4].operands).toEqual(['P', null]);
  });

  it('skips inline image data', () => {
    const b = new Uint8Array([
      ...enc('q BI /W 2 /H 1 /CS /G /BPC 8 ID '),
      0x01,
      0x45,
      0x49,
      0x02,
      ...enc(' EI Q'),
    ]);
    expect(ops(b).map((o) => o.op)).toEqual(['q', 'BI', 'Q']);
  });

  it('copes with a huge run of regular bytes (review M9)', () => {
    const long = new Uint8Array(300_000).fill(0x61);
    const r = ops(new Uint8Array([...enc('q '), ...long, ...enc(' Q')]));
    expect(r.map((o) => o.op.length)).toEqual([1, 300_000, 1]);
  });

  it('survives unterminated strings, dicts and arrays', () => {
    expect(ops(enc('q (open')).map((o) => o.op)).toEqual(['q']);
    expect(ops(enc('q << /A 1')).map((o) => o.op)).toEqual(['q']);
    expect(ops(enc('] Q')).map((o) => o.op)).toEqual(['Q']);
  });
});
